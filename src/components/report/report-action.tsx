import { ArrowRight } from "lucide-react";

interface ReportActionProps {
  children: string;
  href?: string;
  primary?: boolean;
  emphasis?: boolean;
  onClick?: () => void;
}

export function ReportAction({ children, href, primary = false, emphasis = false, onClick }: ReportActionProps) {
  const className = `report-action${primary ? " is-primary" : emphasis ? " is-emphasis" : ""}`;
  const content = <>{children}<ArrowRight aria-hidden="true" size={23} strokeWidth={1.8} /></>;
  return href
    ? <a className={className} href={href}>{content}</a>
    : <button className={className} type="button" onClick={onClick} disabled={!onClick}>{content}</button>;
}
