import { useEffect, useRef } from "react";
import { ArrowRight, X } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { CounterpartyAvatar } from "@/components/counterparty-avatar";
import { ProgressNumber } from "@/components/progress-number";
import { Button } from "@/components/ui/button";
import { dialogContent, waveform } from "@/data/lesson";
import { cn } from "@/lib/utils";
import type { DialogKind } from "@/types/meeting";

interface SessionDialogProps {
  activeDialog: DialogKind | null;
  onDismiss: () => void;
  onFinish: () => void;
  onRevealHint: () => void;
}

export function SessionDialog({ activeDialog, onDismiss, onFinish, onRevealHint }: SessionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const currentDialog = activeDialog ? dialogContent[activeDialog] : null;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (activeDialog && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>(".dialog-primary")?.focus();
    }
    if (!activeDialog && dialog.open) dialog.close();
  }, [activeDialog]);

  return (
    <dialog
      ref={dialogRef}
      className={cn("session-dialog", activeDialog && `${activeDialog}-dialog`)}
      aria-labelledby="session-dialog-title"
      aria-describedby="session-dialog-description"
      onCancel={(event) => {
        event.preventDefault();
        if (activeDialog !== "intro") onDismiss();
      }}
      onClick={(event) => {
        if (activeDialog === "intro" || event.target !== event.currentTarget) return;
        const bounds = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < bounds.left || event.clientX > bounds.right ||
          event.clientY < bounds.top || event.clientY > bounds.bottom
        ) onDismiss();
      }}
    >
      {activeDialog === "intro" ? (
        <div className="practice-intro-layout">
          <div className="practice-intro-copy">
            <h2 id="session-dialog-title">Как устроена практика</h2>
            <ol className="practice-steps">
              <li><ProgressNumber number={1} /><div><strong>Прочитайте бриф</strong><small>Узнайте свою роль, задачу и доступные факты</small></div></li>
              <li><ProgressNumber number={2} /><div><strong>Поговорите с AI-контрагентом</strong><small>Отвечайте своими словами, голосом или текстом</small></div></li>
              <li><ProgressNumber number={3} /><div><strong>Получите разбор</strong><small>Посмотрите, что сработало и что можно улучшить</small></div></li>
            </ol>
            <p id="session-dialog-description" className="practice-dialog-description">
              Готовых вариантов и текущего балла во время разговора нет.
              Подсказка появляется только по вашему запросу и влияет лишь на отметку самостоятельности.
            </p>
            <div className="session-dialog-actions">
              <Button type="button" className="dialog-primary" onClick={onDismiss}>
                Начать практику<ArrowRight aria-hidden="true" />
              </Button>
              <Button type="button" variant="outline" className="dialog-secondary" onClick={() => {}}>
                К уроку
              </Button>
            </div>
          </div>
          <div className="practice-intro-preview" aria-hidden="true">
            <div className="practice-intro-avatar"><CounterpartyAvatar /></div>
            <div className="practice-audio-preview">
              <span className="practice-record-dot"><BrandLogo viewBox="13 10 81 81" /></span>
              <span className="practice-audio-time"><i />00:07</span>
              <div className="practice-waveform">
                {waveform.map((height, index) => (
                  <i key={index} style={{ height: `${Math.max(18, height)}%` }} />
                ))}
              </div>
              <span className="practice-audio-close"><X size={14} /></span>
            </div>
            <div className="practice-duration"><i />1 кейс · около 15 минут</div>
          </div>
        </div>
      ) : (
        <>
          <h2 id="session-dialog-title">{currentDialog?.title}</h2>
          <p id="session-dialog-description">{currentDialog?.description}</p>
          <div className="session-dialog-actions">
            <Button
              type="button"
              variant="outline"
              className="dialog-secondary"
              onClick={activeDialog === "hint" ? onDismiss : onFinish}
            >
              {currentDialog?.secondary}
            </Button>
            <Button
              type="button"
              className="dialog-primary"
              onClick={() => {
                if (activeDialog === "hint") onRevealHint();
                onDismiss();
              }}
            >
              {currentDialog?.primary}<ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </>
      )}
    </dialog>
  );
}
