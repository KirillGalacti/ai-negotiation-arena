import { ChevronDown } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { HintLevel } from "@/types/reporting";

interface BriefSidebarProps {
  briefOpen: boolean;
  onToggleBrief: () => void;
  hintVisible: boolean;
  hintLevel: HintLevel | null;
}

const hintCopy: Record<HintLevel, string> = {
  1: "Не спорьте с требованием. Подумайте, что человек пытается защитить.",
  2: "Назовите возможный интерес как гипотезу и спросите, верно ли вы поняли.",
  3: "Например: «Правильно понимаю, для вас главное — не перегрузить мастеров и не сорвать запуск?»",
};

export function BriefSidebar({ briefOpen, onToggleBrief, hintVisible, hintLevel }: BriefSidebarProps) {
  return (
    <aside className="brief-column">
      <section className={cn("brief-panel", briefOpen && "is-open")}>
        <button
          id="brief-toggle"
          type="button"
          className="brief-toggle"
          onClick={onToggleBrief}
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
              <p>Вы руководите интеграционным проектом международной производственной компании.</p>
            </section>
            <section>
              <h2>Ситуация</h2>
              <p>
                Компания недавно приобрела региональный завод. Головной офис предлагает сделать подбор,
                оценку и обучение сотрудников прозрачнее. Директор завода требует отложить изменения:
                через десять недель запускается обновлённая линия, а мастера уже перегружены.
              </p>
            </section>
            <section>
              <h2>Ваша задача</h2>
              <p>Понять, что стоит за требованием об отсрочке, и договориться о следующем шаге.</p>
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
        <p>Понять, что стоит за требованием об отсрочке, и договориться о следующем шаге.</p>
      </section>

      <section className="mentor-panel" hidden={briefOpen}>
        <div className="mentor-title">
          <img src="/icons/mentor.svg" alt="" />
          <h2>Наставник</h2>
        </div>
        <p className={cn(hintVisible && "mentor-hint")} aria-live="polite">
          {hintVisible
            ? hintCopy[hintLevel || 1]
            : "Появится здесь, только если вы попросите подсказку. Сам в разговор не вмешивается."}
        </p>
        {hintVisible && hintLevel && <small className="mentor-level">Подсказка H{hintLevel}</small>}

        <div className="mentor-options">
          <label><Switch /><span>намёк на направление</span></label>
          <label><Switch /><span>возможный интерес</span></label>
          <label><Switch /><span>пример фразы</span></label>
        </div>

        <small>
          Подсказка не снижает оценку качества ответа, попытка отмечается как выполненная с поддержкой.
        </small>
      </section>
    </aside>
  );
}
