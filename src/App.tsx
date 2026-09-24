import {
  ArrowRight,
  ChevronDown,
  Lightbulb,
  Mic,
  Send,
  Square,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { CounterpartyAvatar } from "@/components/counterparty-avatar";
import { ProgressNumber } from "@/components/progress-number";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type ChatRole = "user" | "assistant";
type DialogKind = "hint" | "pause" | "finish";
type SessionState = "active" | "paused" | "finished";

const dialogContent = {
  hint: {
    title: "Подсказка",
    description: "Подсказка не уменьшает оценку качества ответа, но попытка будет отмечена как выполненная с поддержкой.",
    secondary: "Отмена",
    primary: "Показать подсказку",
  },
  pause: {
    title: "Разговор на паузе",
    description: "Директор не продолжает реплику, пока вы не вернётесь.\nПоследняя реплика сохранена.",
    secondary: "Завершить попытку",
    primary: "Продолжить",
  },
  finish: {
    title: "Завершить попытку?",
    description: "Вы перейдёте к разбору текущего результата. Если навык ещё не удалось проверить, система предложит повтор.",
    secondary: "Завершить",
    primary: "Продолжить разговор",
  },
};

interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
}

const openingMessage =
  "Я сразу обозначу позицию: новые кадровые процедуры нам сейчас не нужны. Через десять недель запускаем линию, мастера перегружены. Вернёмся к этому через полгода.";

const initialMessages: ChatMessage[] = [
  {
    id: "opening",
    role: "assistant",
    content: openingMessage,
  },
];

const progressSteps = [
  { number: 1, label: "Теория" },
  { number: 2, label: "Бриф" },
  { number: 3, label: "Встреча" },
  { number: 4, label: "Разбор" },
];

const waveform = [
  18, 32, 48, 38, 62, 45, 26, 53, 68, 46, 31, 22, 17, 28, 42, 55, 34, 65,
  29, 21, 51, 36, 69, 40, 26, 58, 72, 33, 24, 18, 27, 39, 56, 43,
];

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const rest = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${rest}`;
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || `Ошибка ${response.status}`);
  }
  return payload;
}

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
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
  const [activeDialog, setActiveDialog] = useState<DialogKind | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const transcriptRef = useRef<HTMLTextAreaElement | null>(null);
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const conversationRef = useRef<HTMLDivElement | null>(null);
  const sessionStateRef = useRef<SessionState>("active");
  const pendingReplyRef = useRef<ChatMessage | null>(null);
  const chatAbortRef = useRef<AbortController | null>(null);
  const transcriptionAbortRef = useRef<AbortController | null>(null);
  const startingRecordingRef = useRef(false);

  const currentDialog = activeDialog ? dialogContent[activeDialog] : null;

  function isSessionActive() {
    return sessionStateRef.current === "active";
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (activeDialog && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>(".dialog-primary")?.focus();
    }
    if (!activeDialog && dialog.open) dialog.close();
  }, [activeDialog]);

  const latestAssistantMessage = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((message) => message.role === "assistant")?.content ||
      openingMessage,
    [messages],
  );

  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) {
      conversation.scrollTop = conversation.scrollHeight;
    }
  }, [messages, isSending]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current !== null) {
        window.clearInterval(recordingTimerRef.current);
      }
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      chatAbortRef.current?.abort();
      transcriptionAbortRef.current?.abort();
    };
  }, []);

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
      const extension = blob.type.includes("ogg") ? "ogg" : "webm";
      const formData = new FormData();
      formData.append("audio", blob, `negotiation.${extension}`);

      const response = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
      const data = await readJson<{ text: string }>(response);
      if (controller.signal.aborted) return;

      setHasTranscribedInput(Boolean(data.text.trim()));
      setInput((current) =>
        [current.trim(), data.text.trim()].filter(Boolean).join(" "),
      );
      setInputMode("text");
      window.setTimeout(() => {
        if (sessionStateRef.current === "active") transcriptRef.current?.focus();
      }, 0);
    } catch (error) {
      if (controller.signal.aborted) return;
      setNotice(
        error instanceof Error ? error.message : "Не удалось распознать речь",
      );
    } finally {
      transcriptionAbortRef.current = null;
      setIsTranscribing(false);
    }
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
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      if (!isSessionActive()) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      mediaStreamRef.current = stream;

      const preferredTypes = [
        "audio/webm;codecs=opus",
        "audio/ogg;codecs=opus",
        "audio/webm",
      ];
      const mimeType = preferredTypes.find((type) =>
        MediaRecorder.isTypeSupported(type),
      );
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType, audioBitsPerSecond: 48_000 } : undefined,
      );

      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        resetRecordingResources();

        if (sessionStateRef.current === "finished") return;

        if (audioBlob.size > 0) {
          void transcribeRecording(audioBlob);
        } else {
          setNotice("Запись получилась пустой. Проверьте микрофон.");
        }
      });

      recorder.addEventListener("error", () => {
        resetRecordingResources();
        if (sessionStateRef.current === "finished") return;
        setNotice("Браузер не смог записать звук.");
      });

      recorder.start(250);
      setRecordingSeconds(0);
      setIsRecording(true);
      recordingTimerRef.current = window.setInterval(() => {
        if (recorder.state !== "recording") return;
        setRecordingSeconds((seconds) => {
          if (seconds >= 28) {
            window.setTimeout(stopRecording, 0);
          }
          return seconds + 1;
        });
      }, 1000);
    } catch (error) {
      resetRecordingResources();
      if (sessionStateRef.current === "finished") return;
      const message =
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Разрешите доступ к микрофону в настройках браузера."
          : "Не удалось подключить микрофон.";
      setNotice(message);
    } finally {
      startingRecordingRef.current = false;
    }
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
  }

  function toggleRecording() {
    if (isRecording) {
      stopRecording();
      return;
    }
    if (!isTranscribing && !isPaused && !isFinished) {
      void startRecording();
    }
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const content = input.trim();

    if (!content || isSending || !isSessionActive()) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput("");
    setHasTranscribedInput(false);
    setIsSending(true);
    setNotice(null);
    const controller = new AbortController();
    chatAbortRef.current = controller;

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content: text }) => ({
            role,
            content: text,
          })),
        }),
      });
      const data = await readJson<{ reply: string }>(response);
      if (controller.signal.aborted) return;
      const reply: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply,
      };
      // Keep a reply that arrives during a modal pause until the user resumes.
      if (sessionStateRef.current === "paused") {
        pendingReplyRef.current = reply;
      } else {
        setMessages((current) => [...current, reply]);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setNotice(
        error instanceof Error ? error.message : "Не удалось получить ответ",
      );
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
    if (reply) setMessages((current) => [...current, reply]);
  }

  function openDialog(kind: DialogKind) {
    if (sessionStateRef.current === "finished") return;
    if (kind !== "hint") pauseSession();
    setActiveDialog(kind);
  }

  function dismissDialog() {
    if (activeDialog === "pause" || activeDialog === "finish") resumeSession();
    setActiveDialog(null);
  }

  function finishSession() {
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
    setNotice("Встреча завершена. Разбор сценария появится на следующем этапе.");
  }

  return (
    <main className="arena-shell">
      <header className="arena-header">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            <BrandLogo className="brand-logo" />
          </div>
          <div>
            <h1>Позиции и интересы</h1>
            <p>Блок 3 · Урок 2 · Пилот изменений на заводе</p>
          </div>
        </div>

        <ol className="progress-track" aria-label="Этапы урока">
          {progressSteps.map((step) => (
            <li
              key={step.number}
              className={cn("progress-step", step.number === 3 && "active")}
              aria-label={`${step.number}. ${step.label}`}
              aria-current={step.number === 3 ? "step" : undefined}
            >
              <ProgressNumber number={step.number} />
              <small aria-hidden="true">{step.label}</small>
            </li>
          ))}
        </ol>

        <div className="header-actions">
          <Button
            type="button"
            variant="outline"
            className="pause-action rounded-full"
            aria-haspopup="dialog"
            onClick={() => openDialog("pause")}
            disabled={isFinished}
          >
            Пауза
          </Button>
          <Button
            type="button"
            variant="outline"
            className="finish-action rounded-full"
            aria-haspopup="dialog"
            onClick={() => openDialog("finish")}
            disabled={isFinished}
          >
            Завершить
          </Button>
        </div>
      </header>

      {notice && (
        <div className="notice" role="status">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice(null)} title="Закрыть">
            <X size={16} />
          </button>
        </div>
      )}

      <section className="arena-grid">
        <aside className="conversation-panel">
          <div className="panel-heading">
            <h2>Разговор</h2>
            <p>Полный текст каждой реплики</p>
          </div>
          <div className="conversation-list" ref={conversationRef} aria-live="polite">
            {messages.map((message) => (
              <article
                key={message.id}
                className={cn("conversation-message", message.role)}
              >
                <strong>
                  {message.role === "assistant" ? "Директор завода" : "Вы"}
                </strong>
                <p>{message.content}</p>
              </article>
            ))}
            {isSending && (
              <article className="conversation-message assistant pending">
                <strong>Директор завода</strong>
                <p>Формулирует ответ...</p>
              </article>
            )}
          </div>
        </aside>

        <section className="meeting-stage">
          <div className="stage-meta">
            <span className="role-chip">
              <UserRound size={18} />
              Директор завода · AI-контрагент
            </span>
            <span className={cn("recording-chip", isRecording && !isPaused && "active")}>
              <i />
              {isFinished ? "Встреча завершена" : isPaused ? "Пауза" : isRecording
                ? `Идёт запись · ${formatTime(recordingSeconds)}`
                : "Микрофон готов"}
            </span>
          </div>

          <div className="counterparty-scene">
            <div className="counterparty-avatar" aria-label="AI-контрагент">
              <CounterpartyAvatar />
            </div>
          </div>

          <article className="current-reply">
            <strong>Директор завода</strong>
            <p>{latestAssistantMessage}</p>
          </article>

          <div className="composer-wrap">
            <div className="composer-toolbar">
              <div className="input-mode" aria-label="Режим ввода">
                <button
                  type="button"
                  className={cn(inputMode === "voice" && "active")}
                  onClick={() => setInputMode("voice")}
                >
                  Голос
                </button>
                <button
                  type="button"
                  className={cn(inputMode === "text" && "active")}
                  onClick={() => setInputMode("text")}
                >
                  Текст
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                className="hint-action"
                aria-haspopup="dialog"
                onClick={() => openDialog("hint")}
                disabled={isFinished}
              >
                Подсказка
              </Button>
            </div>

            {inputMode === "voice" ? (
              <div className="voice-composer">
                <button
                  type="button"
                  className={cn("record-button", isRecording && "recording")}
                  onClick={toggleRecording}
                  disabled={isTranscribing || isPaused || isFinished}
                  title={isRecording ? "Остановить запись" : "Начать запись"}
                  aria-label={
                    isRecording ? "Остановить запись" : "Начать запись"
                  }
                  aria-pressed={isRecording}
                >
                  {isRecording ? <Square size={23} /> : <Mic size={28} />}
                </button>

                {isRecording ? (
                  <>
                    <div className="waveform" aria-hidden="true">
                      {waveform.map((height, index) => (
                        <i
                          key={`${height}-${index}`}
                          className={cn(index % 7 === 4 && "accent")}
                          style={{
                            height: `${height}%`,
                            animationDelay: `${index * 35}ms`,
                          }}
                        />
                      ))}
                    </div>
                    <div className="voice-state">
                      <span>{formatTime(recordingSeconds)}</span>
                      <strong>Говорите</strong>
                    </div>
                  </>
                ) : input && !isTranscribing && !isPaused && !isFinished ? (
                  <button
                    type="button"
                    className="transcript-preview"
                    onClick={() => setInputMode("text")}
                  >
                    <span>Ваша реплика</span>
                    <p>{input}</p>
                  </button>
                ) : (
                  <div className="voice-prompt" role="status">
                    <strong>
                      {isTranscribing
                        ? "Распознаём речь"
                        : isFinished
                          ? "Встреча завершена"
                          : isPaused ? "Пауза" : "Ваш ход"}
                    </strong>
                    <p>
                      {isTranscribing ? (
                        "Текст появится в поле ввода."
                      ) : isFinished ? (
                        "Разговор завершён."
                      ) : isPaused ? (
                        "Продолжите встречу, чтобы ответить."
                      ) : (
                        <>Нажмите на микрофон и говорите<br />или переключитесь на текст</>
                      )}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <form className="text-composer" onSubmit={sendMessage}>
                <div className="composer-field">
                  <textarea
                    ref={transcriptRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder="Введите реплику или запишите её голосом..."
                    aria-label="Ваша реплика"
                    aria-describedby={hasTranscribedInput ? "transcript-help" : undefined}
                    disabled={isSending || isPaused || isFinished}
                    rows={2}
                  />
                  <p className="composer-help" id="transcript-help">
                    {hasTranscribedInput && "Распознанный текст можно исправить до отправки"}
                  </p>
                </div>
                <Button
                  type="submit"
                  size="icon"
                  className="send-action"
                  disabled={!input.trim() || isSending || isPaused || isFinished}
                  title="Отправить"
                  aria-label="Отправить"
                >
                  <Send aria-hidden="true" />
                </Button>
              </form>
            )}

          </div>
        </section>

        <aside className="brief-column">
          <section className={cn("brief-panel", briefOpen && "is-open")}>
            <button
              id="brief-toggle"
              type="button"
              className="brief-toggle"
              onClick={() => setBriefOpen((value) => !value)}
              aria-expanded={briefOpen}
              aria-controls="brief-facts"
            >
              <span>Бриф и факты</span>
              <ChevronDown
                size={18}
                strokeWidth={2}
                aria-hidden="true"
                className={cn("transition-transform", briefOpen && "rotate-180")}
              />
            </button>

            <div
              id="brief-facts"
              className="brief-details"
              hidden={!briefOpen}
              role="region"
              aria-labelledby="brief-toggle"
              tabIndex={0}
            >
              <div className="brief-copy">
                <section>
                  <h2>Роль</h2>
                  <p>
                    Вы руководите интеграционным проектом международной
                    производственной компании.
                  </p>
                </section>
                <section>
                  <h2>Ситуация</h2>
                  <p>
                    Компания недавно приобрела региональный завод. Головной офис
                    предлагает сделать подбор, оценку и обучение сотрудников
                    прозрачнее. Директор завода требует отложить изменения:
                    через десять недель запускается обновлённая линия, а мастера
                    уже перегружены.
                  </p>
                </section>
                <section>
                  <h2>Ваша задача</h2>
                  <p>
                    Понять, что стоит за требованием об отсрочке, и договориться
                    о следующем шаге.
                  </p>
                </section>
                <section>
                  <h2>Известные факты</h2>
                  <ul>
                    <li>Запуск линии через десять недель</li>
                    <li>Мастера участвуют и в запуске, и в кадровых решениях</li>
                    <li>Головная компания хочет начать изменения в текущем квартале</li>
                    <li>Директор предлагает вернуться к вопросу через полгода</li>
                  </ul>
                </section>
              </div>
              <p className="brief-footnote">
                Факты видны всё время встречи.<br />
                Скрытые интересы директора здесь не показываются.
              </p>
            </div>
          </section>

          <section className="task-card" hidden={briefOpen}>
            <h2>Ваша задача</h2>
            <p>
              Понять, что стоит за требованием об отсрочке, и договориться о
              следующем шаге.
            </p>
          </section>

          <section className="mentor-panel" hidden={briefOpen}>
            <div className="mentor-title">
              <Lightbulb size={28} />
              <h2>Наставник</h2>
            </div>
            <p className={cn(hintVisible && "mentor-hint")} aria-live="polite">
              {hintVisible
                ? "Уточните, что сейчас важнее для директора: сроки запуска линии или нагрузка на мастеров. Затем предложите небольшой следующий шаг."
                : "Появится здесь, только если вы попросите подсказку. Сам в разговор не вмешивается."}
            </p>

            <div className="mentor-options">
              <label>
                <Switch />
                <span>намёк на направление</span>
              </label>
              <label>
                <Switch />
                <span>возможный интерес</span>
              </label>
              <label>
                <Switch />
                <span>пример фразы</span>
              </label>
            </div>

            <small>
              Подсказка не снижает оценку качества ответа, попытка отмечается как
              выполненная с поддержкой.
            </small>
          </section>
        </aside>
      </section>

      <dialog
        ref={dialogRef}
        className={cn("session-dialog", activeDialog && `${activeDialog}-dialog`)}
        aria-labelledby="session-dialog-title"
        aria-describedby="session-dialog-description"
        onCancel={(event) => {
          event.preventDefault();
          dismissDialog();
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left || event.clientX > bounds.right ||
            event.clientY < bounds.top || event.clientY > bounds.bottom
          ) {
            dismissDialog();
          }
        }}
      >
        <h2 id="session-dialog-title">{currentDialog?.title}</h2>
        <p id="session-dialog-description">{currentDialog?.description}</p>
        <div className="session-dialog-actions">
          <Button
            type="button"
            variant="outline"
            className="dialog-secondary"
            onClick={activeDialog === "hint" ? dismissDialog : finishSession}
          >
            {currentDialog?.secondary}
          </Button>
          <Button
            type="button"
            className="dialog-primary"
            onClick={() => {
              if (activeDialog === "hint") {
                setHintVisible(true);
                setBriefOpen(false);
              }
              dismissDialog();
            }}
          >
            {currentDialog?.primary}
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
      </dialog>
    </main>
  );
}
