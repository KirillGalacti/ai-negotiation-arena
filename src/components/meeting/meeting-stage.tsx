import type { Dispatch, FormEventHandler, RefObject, SetStateAction } from "react";
import { Mic, Send, Square, UserRound } from "lucide-react";
import { CounterpartyAvatar } from "@/components/counterparty-avatar";
import { Button } from "@/components/ui/button";
import { waveform } from "@/data/lesson";
import { cn } from "@/lib/utils";
import type { DialogKind } from "@/types/meeting";

interface MeetingStageProps {
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  hasTranscribedInput: boolean;
  inputMode: "voice" | "text";
  setInputMode: Dispatch<SetStateAction<"voice" | "text">>;
  isSending: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  recordingTime: string;
  isPaused: boolean;
  isFinished: boolean;
  transcriptRef: RefObject<HTMLTextAreaElement | null>;
  latestAssistantMessage: string;
  onToggleRecording: () => void;
  onSendMessage: FormEventHandler<HTMLFormElement>;
  onOpenDialog: (kind: DialogKind) => void;
}

export function MeetingStage({
  input,
  setInput,
  hasTranscribedInput,
  inputMode,
  setInputMode,
  isSending,
  isRecording,
  isTranscribing,
  recordingTime,
  isPaused,
  isFinished,
  transcriptRef,
  latestAssistantMessage,
  onToggleRecording,
  onSendMessage,
  onOpenDialog,
}: MeetingStageProps) {
  return (
    <section className="meeting-stage">
      <div className="stage-meta">
        <span className="role-chip"><UserRound size={18} />Директор завода · AI-контрагент</span>
        <span className={cn("recording-chip", isRecording && !isPaused && "active")}>
          <i />
          {isFinished ? "Встреча завершена" : isPaused ? "Пауза" : isRecording
            ? `Идёт запись · ${recordingTime}`
            : "Микрофон готов"}
        </span>
      </div>

      <div className="counterparty-scene">
        <div className="counterparty-avatar" aria-label="AI-контрагент"><CounterpartyAvatar /></div>
      </div>

      <article className="current-reply">
        <strong>Директор завода</strong>
        <p>{latestAssistantMessage}</p>
      </article>

      <div className="composer-wrap">
        <div className="composer-toolbar">
          <div className="input-mode" aria-label="Режим ввода">
            <button type="button" className={cn(inputMode === "voice" && "active")} onClick={() => setInputMode("voice")}>Голос</button>
            <button type="button" className={cn(inputMode === "text" && "active")} onClick={() => setInputMode("text")}>Текст</button>
          </div>
          <Button type="button" variant="outline" className="hint-action" aria-haspopup="dialog" onClick={() => onOpenDialog("hint")} disabled={isFinished}>
            Подсказка
          </Button>
        </div>

        {inputMode === "voice" ? (
          <div className="voice-composer">
            <button
              type="button"
              className={cn("record-button", isRecording && "recording")}
              onClick={onToggleRecording}
              disabled={isTranscribing || isPaused || isFinished}
              title={isRecording ? "Остановить запись" : "Начать запись"}
              aria-label={isRecording ? "Остановить запись" : "Начать запись"}
              aria-pressed={isRecording}
            >
              {isRecording ? <Square size={23} /> : <Mic size={28} />}
            </button>

            {isRecording ? (
              <>
                <div className="waveform" aria-hidden="true">
                  {waveform.map((height, index) => (
                    <i key={`${height}-${index}`} className={cn(index % 7 === 4 && "accent")} style={{ height: `${height}%`, animationDelay: `${index * 35}ms` }} />
                  ))}
                </div>
                <div className="voice-state"><span>{recordingTime}</span><strong>Говорите</strong></div>
              </>
            ) : input && !isTranscribing && !isPaused && !isFinished ? (
              <button type="button" className="transcript-preview" onClick={() => setInputMode("text")}>
                <span>Ваша реплика</span><p>{input}</p>
              </button>
            ) : (
              <div className="voice-prompt" role="status">
                <strong>{isTranscribing ? "Распознаём речь" : isFinished ? "Встреча завершена" : isPaused ? "Пауза" : "Ваш ход"}</strong>
                <p>
                  {isTranscribing ? "Текст появится в поле ввода."
                    : isFinished ? "Разговор завершён."
                      : isPaused ? "Продолжите встречу, чтобы ответить."
                        : <>Нажмите на микрофон и говорите<br />или переключитесь на текст</>}
                </p>
              </div>
            )}
          </div>
        ) : (
          <form className="text-composer" onSubmit={onSendMessage}>
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
            <Button type="submit" size="icon" className="send-action" disabled={!input.trim() || isSending || isPaused || isFinished} title="Отправить" aria-label="Отправить">
              <Send aria-hidden="true" />
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}
