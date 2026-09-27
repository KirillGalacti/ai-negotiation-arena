import type { ReactNode } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { ProgressTrack } from "@/components/progress-track";
import { Button } from "@/components/ui/button";
import "./arena-header.css";

interface ArenaHeaderProps {
  activeStep: number;
  actions?: ReactNode;
}

export function ArenaHeader({ activeStep, actions }: ArenaHeaderProps) {
  return (
    <header className="arena-header">
      <div className="brand-block">
        <div className="brand-mark" aria-hidden="true">
          <BrandLogo className="brand-logo" viewBox="13 10 81 81" />
        </div>
        <div className="brand-copy">
          <h1>Позиции и интересы</h1>
          <p>Блок 3 · Урок 2 · Пилот изменений на заводе</p>
        </div>
      </div>
      <ProgressTrack activeStep={activeStep} />
      <div className="header-actions">
        {actions ?? <Button type="button" variant="outline" className="lesson-exit">Выйти из урока</Button>}
      </div>
    </header>
  );
}
