import type { MouseEventHandler, ReactNode } from "react";

/** Toggle callers keep label constant and communicate state through aria-pressed. */
export function IconButton({ label, pressed, onClick, children, tone }: {
  label: string; pressed?: boolean; onClick?: MouseEventHandler<HTMLButtonElement>;
  children: ReactNode; tone: "light" | "dark";
}) {
  return <button type="button" className={`icon-button icon-button--${tone}`} aria-label={label} aria-pressed={pressed} title={label} onClick={onClick}>{children}</button>;
}
