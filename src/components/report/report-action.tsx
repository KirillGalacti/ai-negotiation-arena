import { LongArrow } from "@/components/long-arrow";

interface ReportActionProps {
  children: string;
  href?: string;
  primary?: boolean;
  emphasis?: boolean;
  onClick?: () => void;
}

export function ReportAction({ children, href, primary = false, emphasis = false, onClick }: ReportActionProps) {
  const className = `report-action${primary ? " is-primary" : emphasis ? " is-emphasis" : ""}`;
  const content = <>{children}<LongArrow /></>;
  return href
    ? <a className={className} href={href}>{content}</a>
    : <button className={className} type="button" onClick={onClick} disabled={!onClick}>{content}</button>;
}
