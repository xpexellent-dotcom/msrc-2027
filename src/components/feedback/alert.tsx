import type { ReactNode } from "react";

type AlertProps = {
  children: ReactNode;
  title?: ReactNode;
  tone?: "info" | "success" | "warning" | "error";
  /** Static examples stay quiet; mutation outcomes opt into an announcement. */
  announcement?: "off" | "polite" | "assertive";
  className?: string;
};

export function Alert({ children, title, tone = "info", announcement = "off", className = "" }: AlertProps) {
  return (
    <div
      className={`feedback-alert feedback-alert--${tone} ${className}`.trim()}
      role={announcement === "assertive" ? "alert" : announcement === "polite" ? "status" : undefined}
      aria-atomic={announcement === "off" ? undefined : true}
    >
      {title ? <p className="feedback-title">{title}</p> : null}
      <div className="feedback-message">{children}</div>
    </div>
  );
}
