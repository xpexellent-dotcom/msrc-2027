import type { ReactNode } from "react";

export function EmptyState({ title, children, action, className = "" }: {
  title: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`empty-state ${className}`.trim()}>
      <h3>{title}</h3>
      <div className="feedback-message">{children}</div>
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}
