import type { ReactNode } from "react";
import { Search, UserRound } from "lucide-react";
import { ReportSidebar } from "@/components/report/report-sidebar";

interface ReportLayoutProps {
  title: string;
  location: string;
  children: ReactNode;
  className?: string;
}

export function ReportLayout({ title, location, children, className = "" }: ReportLayoutProps) {
  return (
    <div className={`report-page ${className}`}>
      <ReportSidebar />
      <main className="report-main">
        <header className="report-header">
          <div>
            <h1>{title}</h1>
            <p>Главная / Обучение / Блок 3 / Урок 2 / {location}</p>
          </div>
          <div className="report-header-tools">
            <label className="report-search">
              <Search aria-hidden="true" size={18} />
              <input type="search" placeholder="Поиск" aria-label="Поиск" />
            </label>
            <span className="report-header-user" aria-label="Профиль"><UserRound aria-hidden="true" size={22} /></span>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
