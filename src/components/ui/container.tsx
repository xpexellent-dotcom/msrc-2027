import type { ComponentPropsWithoutRef } from "react";

export function Container({
  className = "",
  narrow = false,
  ...props
}: ComponentPropsWithoutRef<"div"> & { narrow?: boolean }) {
  return <div className={`site-container${narrow ? " site-container--narrow" : ""} ${className}`.trim()} {...props} />;
}
