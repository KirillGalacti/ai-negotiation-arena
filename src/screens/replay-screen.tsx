import { ArrowRight } from "lucide-react";
import { ArenaHeader } from "@/components/arena-header";
import { ReportAction } from "@/components/report/report-action";
import { getAttempt, getAttemptPrefix } from "@/services/attempt-storage";
import type { StoredAttempt } from "@/types/reporting";

function replayTime(attempt: StoredAttempt, turnId: string) {
  const turn = attempt.transcript.find((item) => item.id === turnId);
  if (!turn?.createdAt) return "--:--";
  const elapsed = Math.max(0, Math.round((Date.parse(turn.createdAt) - Date.parse(attempt.startedAt)) / 1000));
  return `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
}

function StoredReplay({ attempt, turnId }: { attempt: StoredAttempt; turnId: string }) {
  const prefix = getAttemptPrefix(attempt, turnId);
  const keyTurn = prefix.at(-1);
  const opportunity = attempt.analysis?.opportunities.find((item) => item.positionTurnId === turnId);
  const reportHref = `?screen=report&attempt=${encodeURIComponent(attempt.id)}`;
  const meetingHref = `?screen=meeting&replayAttempt=${encodeURIComponent(attempt.id)}&turn=${encodeURIComponent(turnId)}`;

  if (!keyTurn) return <main className="replay-page"><p>Ключевая точка этой попытки не найдена.</p><ReportAction href={reportHref}>К отчёту</ReportAction></main>;

  return (
    <main className="replay-page">
      <ArenaHeader activeStep={4} actions={<a className="lesson-exit" href={reportHref}>К отчёту</a>} />
      <div className="replay-grid">
        <aside className="replay-history">
          <h2>Ход встречи</h2><p>Сохранённые реплики до ключевой точки</p>
          <div className="replay-history-list">
            {prefix.map((turn) => (
              <div className={`${turn.role === "user" ? "is-user" : ""}${turn.id === keyTurn.id ? " is-key" : ""}`} key={turn.id}>
                <span>{replayTime(attempt, turn.id)} · {turn.role === "assistant" ? "Директор" : "Вы"}</span>
                <p>{turn.content}</p>
                {turn.id === keyTurn.id && <b>КЛЮЧЕВАЯ ТОЧКА</b>}
              </div>
            ))}
            <div className="is-future"><span>Новая ветка</span><p>Ответ после этой позиции будет сохранён как отдельная попытка.</p></div>
          </div>
        </aside>
        <div className="replay-content">
          <span className="report-eyebrow">КЛЮЧЕВАЯ ТОЧКА · {opportunity?.opportunityId || "РАЗБОР"}</span>
          <h1>Переиграть ключевой момент</h1>
          <div className="replay-quote"><span>{replayTime(attempt, keyTurn.id)} · директор</span><i aria-hidden="true" /><p>«{keyTurn.content}»</p></div>
          <div className="replay-guidance"><strong>Что попробовать</strong><p>{opportunity?.improvement || attempt.analysis?.improvedWording || "Назовите возможный интерес как гипотезу и проверьте его вопросом."}</p></div>
          <ul className="replay-explanation">
            <li>Реплики до ключевой точки сохраняются без изменений.</li>
            <li>Готовый ответ не показывается; подсказка доступна только по запросу.</li>
            <li>Новая ветка станет отдельной попыткой, исходный отчёт останется прежним.</li>
          </ul>
          <section className="replay-comparison"><h2>Исходная реплика</h2><div><span>Ваш ответ<strong>{opportunity?.responseText || "Ответ на этой точке не зафиксирован."}</strong></span><span>Оценка<strong>{opportunity?.score === null || !opportunity ? "N/A" : `${opportunity.score} из 4`}</strong></span><span>Подтверждённый смысл<strong>{opportunity?.interestConfirmed ? opportunity.interestHypothesis : "Пока не подтверждён"}</strong></span></div></section>
          <div className="replay-actions"><ReportAction href={meetingHref} primary>Переиграть отсюда</ReportAction><ReportAction href={reportHref}>К отчёту</ReportAction></div>
        </div>
      </div>
    </main>
  );
}

export function ReplayScreen() {
  const params = new URLSearchParams(window.location.search);
  const attemptId = params.get("attempt");
  const turnId = params.get("turn");
  const attempt = attemptId ? getAttempt(attemptId) : null;
  if (attempt && turnId) return <StoredReplay attempt={attempt} turnId={turnId} />;

  return (
    <main className="replay-page">
      <ArenaHeader activeStep={4} actions={<a className="lesson-exit" href="?screen=report">Выйти из урока</a>} />
      <div className="replay-grid">
        <aside className="replay-history">
          <h2>Ход встречи</h2><p>Реплики до ключевой точки</p>
          <div className="replay-history-list">
            <div><span>00:00 · Директор</span><p>Я сразу обозначу позицию: новые кадровые процедуры нам сейчас не нужны.</p></div>
            <div className="is-user"><span>01:05 · Вы</span><p>Правильно понимаю, главное — не перегрузить мастеров?</p></div>
            <div><span>01:20 · Директор</span><p>Да. Сейчас любой новый отчёт или встреча забирает людей у запуска.</p></div>
            <div className="is-key"><span>04:10 · Директор</span><p>Наши решения работают быстрее корпоративных процедур.</p><b>КЛЮЧЕВАЯ ТОЧКА</b></div>
            <div className="is-future"><span>04:25 · Вы</span><p>Новая ветка начнётся после вашего ответа.</p></div>
          </div>
        </aside>
        <div className="replay-content">
          <span className="report-eyebrow">КЛЮЧЕВАЯ ТОЧКА · ВОЗМОЖНОСТЬ 2</span>
          <h1>Переиграть ключевой момент</h1>
          <div className="replay-quote"><span>04:10 · директор</span><i aria-hidden="true" /><p>«Наши решения работают быстрее корпоративных процедур»</p></div>
          <div className="replay-guidance"><strong>Что попробовать</strong><p>Назовите возможный интерес и проверьте его вопросом.</p></div>
          <ul className="replay-explanation">
            <li>Разговор до 04:10 сохранится — директор повторит свою реплику.</li>
            <li>Готовый ответ не показываем. Подсказка доступна только по запросу.</li>
            <li>После новой ветки сравним реплики, реакции и подтверждённый смысл.</li>
          </ul>
          <section className="replay-comparison"><h2>Сравним после новой ветки</h2><div><span>Ваша реплика<strong>Новый ответ</strong></span><span>Реакция директора<strong>Ответ директора</strong></span><span>Подтверждённый смысл<strong>Интерес и прояснение</strong></span></div></section>
          <div className="replay-actions"><button type="button" className="report-action is-primary" disabled>Переиграть отсюда<ArrowRight aria-hidden="true" size={23} /></button><ReportAction href="?screen=report">К отчёту</ReportAction></div>
        </div>
      </div>
    </main>
  );
}
