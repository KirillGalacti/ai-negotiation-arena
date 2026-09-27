import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { initialMessages, openingMessage } from "@/data/lesson";
import { getAttempt, getAttemptPrefix, saveAttempt } from "@/services/attempt-storage";
import { requestAssistantReply, transcribeAudio } from "@/services/meeting-api";
import type { ChatMessage, DialogKind, SessionState } from "@/types/meeting";
import type { HintLevel, SessionEvent, StoredAttempt, HintUsage } from "@/types/reporting";

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

export function useMeetingSession() {
  const sessionIdRef = useRef(crypto.randomUUID());
  const startedAtRef = useRef(new Date().toISOString());
  const search = new URLSearchParams(window.location.search);
  const parentAttemptId = search.get("replayAttempt") || undefined;
  const replayFromTurnId = search.get("turn") || undefined;
  const parentAttempt = parentAttemptId ? getAttempt(parentAttemptId) : null;
  const replayPrefix = parentAttempt && replayFromTurnId
    ? getAttemptPrefix(parentAttempt, replayFromTurnId)
    : [];
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    (replayPrefix.length ? replayPrefix : initialMessages).map((message) => ({
      ...message,
      createdAt: message.createdAt || startedAtRef.current,
    })),
  );
  const [input, setInput] = useState("");
  const [hasTranscribedInput, setHasTranscribedInput] = useState(false);
  const [inputMode, setInputMode] = useState<"voice" | "text">("voice");
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [hintVisible, setHintVisible] = useState(false);
  const [hintLevel, setHintLevel] = useState<HintLevel | null>(null);
  const [activeDialog, setActiveDialog] = useState<DialogKind | null>("intro");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const transcriptRef = useRef<HTMLTextAreaElement | null>(null);
  const conversationRef = useRef<HTMLDivElement | null>(null);
  const sessionStateRef = useRef<SessionState>("active");
  const pendingReplyRef = useRef<ChatMessage | null>(null);
  const chatAbortRef = useRef<AbortController | null>(null);
  const transcriptionAbortRef = useRef<AbortController | null>(null);
  const startingRecordingRef = useRef(false);
  const hintsRef = useRef<HintUsage[]>([]);
  const initialEventTime = startedAtRef.current;
  const eventsRef = useRef<SessionEvent[]>([
    { id: crypto.randomUUID(), type: "LESSON_STARTED", occurredAt: initialEventTime },
    { id: crypto.randomUUID(), type: "PRACTICE_STARTED", occurredAt: initialEventTime },
    ...(parentAttemptId && replayFromTurnId
      ? [{ id: crypto.randomUUID(), type: "REPLAY_STARTED", occurredAt: initialEventTime, turnId: replayFromTurnId }]
      : []),
    ...(!replayPrefix.length
      ? [{ id: crypto.randomUUID(), type: "AI_POSITION_EMITTED", occurredAt: initialEventTime, turnId: "opening", opportunityId: "O1" }]
      : []),
  ]);

  function createAttempt(transcript = messages, endedAt?: string, finishReason?: StoredAttempt["finishReason"]): StoredAttempt {
    return {
      schemaVersion: 1,
      id: sessionIdRef.current,
      lessonId: "B3-L2",
      scenarioId: "SC-B3-L2-PLANT-PILOT",
      scenarioVersion: "1.0",
      rubricVersion: "B3-L2-rubric-1.0",
      startedAt: startedAtRef.current,
      endedAt,
      finishReason,
      transcript,
      events: eventsRef.current,
      hints: hintsRef.current,
      parentAttemptId,
      replayFromTurnId,
    };
  }

  function persistAttempt(transcript = messages, endedAt?: string, finishReason?: StoredAttempt["finishReason"]) {
    try {
      saveAttempt(createAttempt(transcript, endedAt, finishReason));
      return true;
    } catch {
      setNotice("Не удалось сохранить попытку в браузере. Проверьте свободное место и повторите завершение.");
      return false;
    }
  }

  function recordEvent(
    type: string,
    turnId?: string,
    opportunityId?: string,
    occurredAt = new Date().toISOString(),
    hint?: HintLevel,
  ) {
    const event: SessionEvent = {
      id: crypto.randomUUID(),
      type,
      occurredAt,
      turnId,
      opportunityId,
      hintLevel: hint,
    };
    eventsRef.current = [...eventsRef.current, event];
    return event;
  }

  useEffect(() => {
    persistAttempt(messages);
    // Persist the initial transcript before a reload or navigation can discard it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const latestAssistantMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === "assistant")?.content || openingMessage,
    [messages],
  );

  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [messages, isSending]);

  useEffect(() => () => {
    if (recordingTimerRef.current !== null) window.clearInterval(recordingTimerRef.current);
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    chatAbortRef.current?.abort();
    transcriptionAbortRef.current?.abort();
  }, []);

  function isSessionActive() {
    return sessionStateRef.current === "active";
  }

  function resetRecordingResources() {
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    setIsRecording(false);
  }

  async function transcribeRecording(blob: Blob) {
    if (sessionStateRef.current === "finished") return;
    const controller = new AbortController();
    transcriptionAbortRef.current = controller;
    setIsTranscribing(true);
    setNotice(null);

    try {
      const data = await transcribeAudio(blob, controller.signal);
      if (controller.signal.aborted) return;
      setHasTranscribedInput(Boolean(data.text.trim()));
      setInput((current) => [current.trim(), data.text.trim()].filter(Boolean).join(" "));
      setInputMode("text");
      window.setTimeout(() => {
        if (sessionStateRef.current === "active") transcriptRef.current?.focus();
      }, 0);
    } catch (error) {
      if (controller.signal.aborted) return;
      setNotice(error instanceof Error ? error.message : "Не удалось распознать речь");
    } finally {
      transcriptionAbortRef.current = null;
      setIsTranscribing(false);
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }

  async function startRecording() {
    if (startingRecordingRef.current || !isSessionActive()) return;
    setNotice(null);

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setNotice("Браузер не поддерживает запись с микрофона.");
      return;
    }

    startingRecordingRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      if (!isSessionActive()) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      mediaStreamRef.current = stream;

      const preferredTypes = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/webm"];
      const mimeType = preferredTypes.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 48_000 } : undefined);
      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        resetRecordingResources();
        if (sessionStateRef.current === "finished") return;
        if (audioBlob.size > 0) void transcribeRecording(audioBlob);
        else setNotice("Запись получилась пустой. Проверьте микрофон.");
      });
      recorder.addEventListener("error", () => {
        resetRecordingResources();
        if (sessionStateRef.current !== "finished") setNotice("Браузер не смог записать звук.");
      });

      recorder.start(250);
      setRecordingSeconds(0);
      setIsRecording(true);
      recordingTimerRef.current = window.setInterval(() => {
        if (recorder.state !== "recording") return;
        setRecordingSeconds((seconds) => {
          if (seconds >= 28) window.setTimeout(stopRecording, 0);
          return seconds + 1;
        });
      }, 1000);
    } catch (error) {
      resetRecordingResources();
      if (sessionStateRef.current === "finished") return;
      setNotice(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Разрешите доступ к микрофону в настройках браузера."
          : "Не удалось подключить микрофон.",
      );
    } finally {
      startingRecordingRef.current = false;
    }
  }

  function toggleRecording() {
    if (isRecording) {
      stopRecording();
      return;
    }
    if (!isTranscribing && !isPaused && !isFinished) void startRecording();
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = input.trim();
    if (!content || isSending || !isSessionActive()) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    const nextMessages = [...messages, userMessage];
    recordEvent("USER_UTTERANCE_FINALIZED", userMessage.id);
    persistAttempt(nextMessages);
    setMessages(nextMessages);
    setInput("");
    setHasTranscribedInput(false);
    setIsSending(true);
    setNotice(null);
    const controller = new AbortController();
    chatAbortRef.current = controller;

    try {
      const data = await requestAssistantReply(nextMessages, controller.signal);
      if (controller.signal.aborted) return;
      const reply: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
        createdAt: new Date().toISOString(),
      };
      if (sessionStateRef.current === "paused") pendingReplyRef.current = reply;
      else {
        recordEvent("AI_TURN_EMITTED", reply.id, undefined, reply.createdAt);
        const updatedMessages = [...nextMessages, reply];
        setMessages(updatedMessages);
        persistAttempt(updatedMessages);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setNotice(error instanceof Error ? error.message : "Не удалось получить ответ");
    } finally {
      chatAbortRef.current = null;
      setIsSending(false);
    }
  }

  function pauseSession() {
    if (sessionStateRef.current === "finished") return;
    sessionStateRef.current = "paused";
    setIsPaused(true);
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "recording") recorder.pause();
    mediaStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = false; });
  }

  function resumeSession() {
    if (sessionStateRef.current === "finished") return;
    sessionStateRef.current = "active";
    setIsPaused(false);
    mediaStreamRef.current?.getAudioTracks().forEach((track) => { track.enabled = true; });
    const recorder = mediaRecorderRef.current;
    if (recorder?.state === "paused") recorder.resume();
    const reply = pendingReplyRef.current;
    pendingReplyRef.current = null;
    if (reply) {
      recordEvent("AI_TURN_EMITTED", reply.id, undefined, reply.createdAt);
      const updatedMessages = [...messages, reply];
      setMessages(updatedMessages);
      persistAttempt(updatedMessages);
    }
  }

  function openDialog(kind: DialogKind) {
    if (sessionStateRef.current === "finished") return;
    if (kind === "pause" || kind === "finish") pauseSession();
    if (kind === "hint") {
      recordEvent("USER_HINT_REQUEST", messages.at(-1)?.id);
      persistAttempt(messages);
    }
    setActiveDialog(kind);
  }

  function dismissDialog() {
    if (activeDialog === "pause" || activeDialog === "finish") resumeSession();
    setActiveDialog(null);
  }

  function finishSession() {
    if (sessionStateRef.current === "finished") return sessionIdRef.current;
    const endedAt = new Date().toISOString();
    recordEvent("PRACTICE_END_REQUESTED", messages.at(-1)?.id, undefined, endedAt);
    recordEvent("PRACTICE_ENDED", messages.at(-1)?.id, undefined, endedAt);
    if (!persistAttempt(messages, endedAt, "manual")) {
      eventsRef.current = eventsRef.current.slice(0, -2);
      return null;
    }
    sessionStateRef.current = "finished";
    chatAbortRef.current?.abort();
    transcriptionAbortRef.current?.abort();
    pendingReplyRef.current = null;
    stopRecording();
    resetRecordingResources();
    setIsSending(false);
    setIsTranscribing(false);
    setIsPaused(false);
    setIsFinished(true);
    setActiveDialog(null);
    return sessionIdRef.current;
  }

  function revealHint() {
    const level = Math.min(hintsRef.current.length + 1, 3) as HintLevel;
    const occurredAt = new Date().toISOString();
    const hint: HintUsage = {
      id: crypto.randomUUID(),
      level,
      occurredAt,
      afterTurnId: messages.at(-1)?.id,
    };
    hintsRef.current = [...hintsRef.current, hint];
    recordEvent("HINT_SHOWN", hint.afterTurnId, undefined, occurredAt, level);
    setHintVisible(true);
    setHintLevel(level);
    setBriefOpen(false);
    persistAttempt(messages);
  }

  return {
    messages,
    input,
    setInput,
    hasTranscribedInput,
    inputMode,
    setInputMode,
    isSending,
    isRecording,
    isTranscribing,
    recordingSeconds,
    isPaused,
    isFinished,
    briefOpen,
    setBriefOpen,
    notice,
    clearNotice: () => setNotice(null),
    hintVisible,
    hintLevel,
    revealHint,
    activeDialog,
    conversationRef,
    transcriptRef,
    latestAssistantMessage,
    recordingTime: formatTime(recordingSeconds),
    toggleRecording,
    sendMessage,
    openDialog,
    dismissDialog,
    finishSession,
  };
}
