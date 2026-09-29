import type { ComponentPropsWithoutRef } from "react";

export function StatusBadge({
  tone = "neutral",
  className = "",
  children,
  ...props
}: ComponentPropsWithoutRef<"span"> & { tone?: "neutral" | "success" | "warning" | "error" | "info" }) {
  return (
    <span {...props} className={`status-badge status-badge--${tone} ${className}`.trim()}>
      <span className="status-badge-dot" aria-hidden="true" />
      {children}
    </span>
  );
}
