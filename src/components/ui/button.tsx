import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type ButtonAppearance = {
  variant?: "primary" | "secondary" | "ghost" | "gold";
  size?: "default" | "small";
};

function buttonClasses(variant: ButtonAppearance["variant"], size: ButtonAppearance["size"], className: string) {
  return `button button--${variant} button--${size} ${className}`.trim();
}

export function Button({
  variant = "primary",
  size = "default",
  loading = false,
  loadingLabel,
  disabled,
  className = "",
  children,
  type = "button",
  ...props
}: ComponentPropsWithoutRef<"button"> & ButtonAppearance & { loading?: boolean; loadingLabel?: ReactNode }) {
  return (
    <button
      {...props}
      type={type}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? <span className="button-spinner" aria-hidden="true" /> : null}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "default",
  disabled = false,
  className = "",
  children,
  href,
  ...props
}: Omit<ComponentPropsWithoutRef<"a">, "href"> & ButtonAppearance & { href: string; disabled?: boolean }) {
  const classes = buttonClasses(variant, size, className);
  // A disabled destination is never emitted as a navigable anchor.
  if (disabled) {
    return <span className={classes} role="link" aria-disabled="true" id={props.id} title={props.title} aria-label={props["aria-label"]}>{children}</span>;
  }
  return <Link {...props} href={href} className={classes}>{children}</Link>;
}
