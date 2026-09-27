import { ArrowRight, UserRound } from "lucide-react";
import { ArenaHeader } from "@/components/arena-header";
import { Button } from "@/components/ui/button";

export function BriefScreen() {
  return (
    <main className="arena-shell brief-screen">
      <ArenaHeader activeStep={2} />

      <section className="brief-screen-grid" aria-label="Бриф">
        <article className="brief-screen-overview" aria-label="Описание ситуации">
          <span className="brief-screen-kicker">БРИФ ВСТРЕЧИ</span>
          <h2 className="brief-screen-title">Пилот изменений на заводе</h2>
          <section className="brief-screen-section">
            <h3>РОЛЬ</h3>
            <p>Вы руководите интеграционным проектом международной производственной компании.</p>
          </section>
          <section className="brief-screen-section">
            <h3>СИТУАЦИЯ</h3>
            <p>Компания недавно приобрела региональный завод. Головной офис предлагает сделать подбор, оценку и обучение сотрудников прозрачнее. Директор завода требует отложить изменения: через десять недель запускается обновлённая линия, а мастера уже перегружены.</p>
          </section>
          <section className="brief-screen-task">
            <h3>ВАША ЗАДАЧА</h3>
            <p>Понять, что стоит за требованием об отсрочке, и договориться о следующем шаге.</p>
          </section>
          <section className="brief-screen-section brief-screen-lesson">
            <h3>ФОКУС УРОКА</h3>
            <p>На этом уроке важнее проверить интересы, чем убедить контрагента любой ценой. Скрытые интересы директора в брифе не раскрываются — их предстоит выяснить в разговоре.</p>
          </section>
        </article>

        <div className="brief-screen-side">
          <div className="role-chip brief-screen-role">
            <UserRound size={18} />
            Директор завода · AI-контрагент
          </div>
          <article className="brief-screen-facts" aria-label="Факты">
            <h2>Известные факты</h2>
            <ul className="brief-screen-facts-list">
              <li>Запуск линии через десять недель</li>
              <li>Мастера участвуют и в запуске, и в кадровых решениях</li>
              <li>Головная компания хочет начать изменения в текущем квартале</li>
              <li>Директор предлагает вернуться к вопросу через полгода</li>
            </ul>
            <p className="brief-screen-footnote">Факты остаются под рукой всю встречу — в панели «Бриф и факты».</p>
          </article>
          <article className="brief-screen-how" aria-label="Как проходит встреча">
            <h2>Как проходит встреча</h2>
            <div className="brief-screen-how-row">
              <span className="brief-screen-how-icon"><img src="/icons/microphone.svg" alt="" /></span>
              <div><h3>Голос или текст</h3><p>Переключайтесь в любой момент. Распознанную речь можно исправить до отправки.</p></div>
            </div>
            <div className="brief-screen-how-row">
              <span className="brief-screen-how-icon"><img src="/icons/mentor.svg" alt="" /></span>
              <div><h3>Подсказка — только по запросу</h3><p>Наставник подскажет в три шага и сам в разговор не вмешивается.</p></div>
            </div>
            <div className="brief-screen-how-row">
              <span className="brief-screen-how-icon brief-screen-pause-icon"><img src="/icons/pause.svg" alt="" /></span>
              <div><h3>Пауза и завершение</h3><p>На паузе директор ждёт. Завершить встречу можно с подтверждением.</p></div>
            </div>
          </article>
          <div className="brief-screen-actions">
            <Button type="button" variant="outline" className="brief-back">Вернуться к теории</Button>
            <Button type="button" className="brief-start" onClick={() => { window.location.search = "?screen=meeting"; }}>
              Начать встречу
              <ArrowRight aria-hidden="true" />
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
