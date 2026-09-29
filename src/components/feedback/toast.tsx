"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function Toast({ open = true, title, tone = "info", dismissLabel, onDismiss, children, className = "" }: {
  /** Keep mounted and toggle open so assistive technology observes the live-region update. */
  open?: boolean;
  title?: ReactNode;
  tone?: "info" | "success" | "warning" | "error";
  dismissLabel: string;
  onDismiss: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={open ? `feedback-toast feedback-alert--${tone} ${className}`.trim() : "sr-only"}>
      <div role={tone === "error" ? "alert" : "status"} aria-atomic="true">
        {open && title ? <p className="feedback-title">{title}</p> : null}
        {open ? <div className="feedback-message">{children}</div> : null}
      </div>
      {open ? <Button variant="ghost" size="small" onClick={onDismiss}>{dismissLabel}</Button> : null}
    </div>
  );
}
