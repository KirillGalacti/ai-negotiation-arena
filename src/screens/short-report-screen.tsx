import { Check, Info } from "lucide-react";
import { ReportAction } from "@/components/report/report-action";
import { ReportLayout } from "@/components/report/report-layout";
import { ReportState } from "@/components/report/report-state";
import { useReportingAttempt } from "@/hooks/use-reporting-attempt";
import type { StoredAttempt } from "@/types/reporting";

type ReportVariant = "independent" | "supported" | "repeat" | "unassessed";

const variants = {
  independent: {
    status: "Освоено самостоятельно",
    score: "3/4",
    scores: [3, 2, 4],
    support: "Без подсказок",
    supportDetail: "Наставник не вызывался — попытка засчитана как самостоятельная.",
    improvement: "После ответа директора кратко зафиксируйте подтверждённый интерес.",
    strength: "Правильно понимаю, для вас главное — не перегрузить мастеров и не сорвать запуск?",
    outcome: "Директор готов обсуждать ограниченный пилот",
    fullReportEmphasis: true,
    secondaryAction: "Переиграть момент",
    secondaryHref: "?screen=replay",
    secondaryEmphasis: false,
    mainAction: "Следующий урок",
    mainHref: undefined,
  },
  supported: {
    status: "Освоено с поддержкой",
    score: "3/4",
    scores: [3, 3, 3],
    support: "С подсказкой",
    supportDetail: "Использована поддержка наставника до уровня H2. Оценка качества не снижена.",
    improvement: "Попробуйте назвать возможный интерес и проверить его вопросом без подсказки.",
    strength: "Верно понимаю, для вас важно, чтобы решения на площадке принимались быстро?",
    outcome: "Директор готов обсуждать ограниченный пилот",
    fullReportEmphasis: false,
    secondaryAction: "Следующий урок",
    secondaryHref: undefined,
    secondaryEmphasis: true,
    mainAction: "Повторить без подсказок",
    mainHref: undefined,
  },
  repeat: {
    status: "Стоит повторить",
    score: "1/4",
    scores: [1, 1, 2],
    support: "Без подсказок",
    supportDetail: "Навык пока не проявлен уверенно.",
    improvement: "Не выдавайте предположение за факт. Сначала назовите возможный интерес, затем спросите, верно ли вы поняли.",
    strength: "Что для вас самое сложное в ближайшие десять недель?",
    outcome: "Директор настаивает на отсрочке на полгода",
    fullReportEmphasis: true,
    secondaryAction: "Повторить урок",
    secondaryHref: "?screen=brief",
    secondaryEmphasis: false,
    mainAction: "Переиграть ключевой момент",
    mainHref: "?screen=replay",
  },
  unassessed: {
    status: "Не удалось оценить навык",
    score: "N/A",
    scores: [2, null, null],
    support: "Не выявлено",
    supportDetail: "В разговоре не возникло двух корректных возможностей проверить навык.",
    improvement: "Повторите ситуацию и дайте разговору раскрыть следующую позицию директора.",
    strength: "Почему именно полгода?",
    outcome: "Встреча завершена досрочно, договорённости нет",
    fullReportEmphasis: true,
    secondaryAction: "К уроку",
    secondaryHref: "?screen=brief",
    secondaryEmphasis: false,
    mainAction: "Повторить ситуацию",
    mainHref: undefined,
  },
} as const;

const opportunityLabels = ["Возможность 1", "Возможность 2", "Возможность 3"];

function OpportunityScore({ label, score }: { label: string; score: number | null }) {
  return (
    <div className={`report-score-tile${score === null ? " is-empty" : score >= 3 ? " is-good" : " is-soft"}`}>
      <span>{label}</span>
      <strong>{score ?? "—"}</strong>
      <div className="report-score-dots" aria-label={score === null ? "Не оценено" : `${score} из 4`}>
        {[1, 2, 3, 4].map((dot) => <i key={dot} className={score !== null && dot <= score ? "is-filled" : ""} />)}
      </div>
      <small>{score === null ? "не возникла" : score === 4 ? "отлично" : score === 3 ? "хорошо" : "можно лучше"}</small>
    </div>
  );
}

function ReportPill({ children }: { children: string }) {
  return <span className="report-evidence-pill"><i />{children}</span>;
}

const statusLabels = {
  independent: "Освоено самостоятельно",
  supported: "Освоено с поддержкой",
  repeat: "Стоит повторить",
  unassessed: "Не удалось оценить навык",
} as const;

function durationLabel(attempt: StoredAttempt) {
  if (!attempt.endedAt) return "";
  const seconds = Math.max(0, Math.round((Date.parse(attempt.endedAt) - Date.parse(attempt.startedAt)) / 1000));
  return `${Math.floor(seconds / 60)} мин ${seconds % 60} сек`;
}

function LiveShortReport({ attempt }: { attempt: StoredAttempt }) {
  const analysis = attempt.analysis!;
  const isUnassessed = analysis.status === "unassessed";
  const evaluated = analysis.opportunities.filter((item) => item.score !== null);
  const strongest = [...evaluated].sort((a, b) => (b.score || 0) - (a.score || 0))[0];
  const weakest = [...evaluated].sort((a, b) => (a.score || 0) - (b.score || 0))[0];
  const maxHint = attempt.hints.reduce((max, hint) => Math.max(max, hint.level), 0);
  const attemptQuery = `&attempt=${encodeURIComponent(attempt.id)}`;
  const replayHref = analysis.keyMomentTurnId
    ? `?screen=replay${attemptQuery}&turn=${encodeURIComponent(analysis.keyMomentTurnId)}`
    : undefined;
  const scoreList = [0, 1, 2].map((index) => analysis.opportunities[index]?.score ?? null);
  const scoreText = analysis.score === null ? "N/A" : `${analysis.score}/4`;
  const hintSummary = attempt.hints.length
    ? `Использовано подсказок: ${attempt.hints.length}, максимальный уровень H${maxHint}. Качество ответа не снижалось.`
    : "Подсказки не использовались — попытка выполнена самостоятельно.";
  const improvement = weakest?.improvement || analysis.nextStep || "Повторите ситуацию, чтобы создать больше возможностей проявить навык.";
  const strength = strongest?.responseText;

  return (
    <ReportLayout title="Краткий отчёт" location="Краткий отчёт" className="short-report-page">
      <div className="report-short-grid">
        <div className="report-short-left">
          <section className="report-status-card" aria-label="Итог урока">
            <div className="report-status-heading">
              <div>
                <h2>{statusLabels[analysis.status]}</h2>
                <p>Позиции и интересы · встреча с директором завода · {durationLabel(attempt)}</p>
              </div>
              <div className={`report-status-score${isUnassessed ? " is-unassessed" : ""}`}>
                <strong>{scoreText}</strong>
                <small>навык</small>
              </div>
            </div>
            <div className="report-status-bottom">
              <div className="report-score-list">
                {scoreList.map((score, index) => (
                  <OpportunityScore key={index} label={opportunityLabels[index]} score={score} />
                ))}
              </div>
              <div className="report-support">
                <h3>{analysis.status === "independent" ? "Без подсказок" : analysis.status === "supported" ? "С поддержкой" : "Оценка попытки"}</h3>
                <p>{hintSummary}</p>
                <div className="report-target-label">
                  <Check aria-hidden="true" size={18} />
                  Навык «Перевод позиции в интерес» — {analysis.score === null ? "N/A" : `${analysis.score} из 4`}
                </div>
              </div>
            </div>
          </section>
          <div className="report-short-notes">
            <section className="report-note-card report-improvement">
              <h2>Что улучшить</h2>
              <p>{improvement}</p>
              {weakest && <ReportPill>{`${weakest.opportunityId} · ваша реплика`}</ReportPill>}
              {replayHref && <small>Ключевой момент можно переиграть с исходной позиции директора.</small>}
            </section>
            <section className="report-note-card report-strength">
              <h2>Что получилось</h2>
              {strength ? (
                <div className="report-quote-ticket">
                  <span>{strongest?.opportunityId} · ваша реплика</span><i aria-hidden="true" />
                  <p>«{strength}»</p>
                </div>
              ) : <p>Пока недостаточно подтверждённых данных для выделения сильной реплики.</p>}
              <small>{strongest?.fact || (isUnassessed ? "Недостаточно валидных возможностей для итоговой оценки." : "Выводы отчёта привязаны к репликам встречи.")}</small>
            </section>
          </div>
        </div>
        <aside className="report-short-right" aria-label="Навык и действия">
          <h2>Навык урока</h2>
          <div className="report-metric"><span>Выявление интересов</span><div className="report-metric-dots" aria-label={scoreText}>{[1, 2, 3, 4].map((dot) => <i key={dot} className={analysis.score !== null && dot <= analysis.score ? "is-filled" : ""} />)}</div></div>
          <div className="report-metric"><span>Подсказки наставника</span><small>{attempt.hints.length ? `${attempt.hints.length} · уровень H${maxHint}` : "не использовались"}</small></div>
          <div className="report-outcome"><span>ИСХОД ВСТРЕЧИ</span><p>{analysis.outcomeTitle}</p><small>{analysis.outcomeDetails || "Исход встречи не влияет на оценку навыка."}</small></div>
          <div className="report-short-actions">
            <ReportAction href={`?screen=full-report${attemptQuery}`} emphasis>Полный отчёт</ReportAction>
            {replayHref
              ? <ReportAction href={replayHref}>Переиграть момент</ReportAction>
              : <ReportAction>Ключевой момент не определён</ReportAction>}
            <div className="report-action-gap" />
            {analysis.status === "independent"
              ? <ReportAction primary>Следующий урок</ReportAction>
              : <ReportAction primary href="?screen=brief">Повторить ситуацию</ReportAction>}
          </div>
          {isUnassessed && <p className="report-na-note"><Info size={16} aria-hidden="true" />N/A означает недостаток валидных данных, а не ноль.</p>}
        </aside>
      </div>
    </ReportLayout>
  );
}

export function ShortReportScreen() {
  const reporting = useReportingAttempt();
  const requested = new URLSearchParams(window.location.search).get("variant");
  if (reporting.attempt) {
    if (!reporting.attempt.analysis) {
      return <ReportState title="Краткий отчёт" attempt={reporting.attempt} isAnalyzing={reporting.isAnalyzing} error={reporting.error} onRetry={reporting.retry} />;
    }
    return <LiveShortReport attempt={reporting.attempt} />;
  }
  if (!requested) {
    return <ReportState title="Краткий отчёт" attempt={null} isAnalyzing={false} error={null} onRetry={() => {}} />;
  }
  const variant: ReportVariant = requested && requested in variants ? requested as ReportVariant : "independent";
  const report = variants[variant];
  const isUnassessed = variant === "unassessed";

  return (
    <ReportLayout title="Краткий отчёт" location="Краткий отчёт" className="short-report-page">
      <div className="report-short-grid">
        <div className="report-short-left">
          <section className="report-status-card" aria-label="Итог урока">
            <div className="report-status-heading">
              <div>
                <h2>{report.status}</h2>
                <p>Позиции и интересы · встреча с директором завода · 11 минут 20 секунд</p>
              </div>
              <div className={`report-status-score${isUnassessed ? " is-unassessed" : ""}`}>
                <strong>{report.score}</strong>
                <small>навык</small>
              </div>
            </div>
            <div className="report-status-bottom">
              <div className="report-score-list">
                {report.scores.map((score, index) => <OpportunityScore key={opportunityLabels[index]} label={opportunityLabels[index]} score={score} />)}
              </div>
              <div className="report-support">
                <h3>{report.support}</h3>
                <p>{report.supportDetail}</p>
                <div className="report-target-label"><Check aria-hidden="true" size={18} />Навык «Перевод позиции в интерес» — {isUnassessed ? "N/A" : `${report.score[0]} из 4`}</div>
              </div>
            </div>
          </section>
          <div className="report-short-notes">
            <section className="report-note-card report-improvement">
              <h2>Что улучшить</h2>
              <p>{report.improvement}</p>
              <ReportPill>Возможность 1 · 01:05</ReportPill>
              <small>Ключевая точка для переигрывания — возможность 2, 04:10</small>
            </section>
            <section className="report-note-card report-strength">
              <h2>Что получилось</h2>
              <div className="report-quote-ticket">
                <span>Возможность 1 · ваша реплика</span>
                <i aria-hidden="true" />
                <p>«{report.strength}»</p>
              </div>
              <small>{isUnassessed ? "Этого эпизода недостаточно для итоговой оценки." : "Вы назвали риск как гипотезу и проверили её вопросом."}</small>
            </section>
          </div>
        </div>
        <aside className="report-short-right" aria-label="Навык и действия">
          <h2>Навык урока</h2>
          <div className="report-metric"><span>Выявление интересов</span><div className="report-metric-dots" aria-label={report.score}>{[1, 2, 3, 4].map((dot) => <i key={dot} className={!isUnassessed && dot <= Number(report.score[0]) ? "is-filled" : ""} />)}</div></div>
          <div className="report-metric"><span>Подсказки наставника</span><small>{variant === "supported" ? "уровень H2" : "не использовались"}</small></div>
          <div className="report-outcome"><span>ИСХОД ВСТРЕЧИ</span><p>{report.outcome}</p><small>Исход сделки не влияет на оценку навыка</small></div>
          <div className="report-short-actions">
            <ReportAction href="?screen=full-report" emphasis={report.fullReportEmphasis}>Полный отчёт</ReportAction>
            <ReportAction href={report.secondaryHref} emphasis={report.secondaryEmphasis}>{report.secondaryAction}</ReportAction>
            <div className="report-action-gap" />
            <ReportAction primary href={report.mainHref}>{report.mainAction}</ReportAction>
          </div>
          {isUnassessed && <p className="report-na-note"><Info size={16} aria-hidden="true" />N/A означает недостаток данных, а не ноль.</p>}
        </aside>
      </div>
    </ReportLayout>
  );
}
