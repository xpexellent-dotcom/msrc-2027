import type { ComponentPropsWithoutRef, ReactNode } from "react";

type TextFieldProps = Omit<ComponentPropsWithoutRef<"input">, "id"> & {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  success?: ReactNode;
  scientific?: boolean;
};

/** LOC-02: scientific content stays English/LTR; its labels and guidance stay bilingual. */
export function TextField({
  id,
  label,
  hint,
  error,
  success,
  scientific = false,
  className = "",
  "aria-describedby": describedBy,
  ...props
}: TextFieldProps) {
  const descriptionIds = [describedBy, hint ? `${id}-hint` : null, error ? `${id}-error` : success ? `${id}-success` : null].filter(Boolean).join(" ");
  return (
    <div className={`field${error ? " field--error" : success ? " field--success" : ""}`}>
      <label className="field-label" htmlFor={id}>{label}{props.required ? <span className="field-required" aria-hidden="true"> *</span> : null}</label>
      {hint ? <p id={`${id}-hint`} className="field-hint">{hint}</p> : null}
      <input
        {...props}
        id={id}
        className={`field-input ${className}`.trim()}
        aria-describedby={descriptionIds || undefined}
        aria-invalid={error ? true : props["aria-invalid"]}
        dir={scientific ? "ltr" : props.dir}
        lang={scientific ? "en" : props.lang}
      />
      {error ? <p id={`${id}-error`} className="field-message field-message--error"><span aria-hidden="true">!</span>{error}</p> : null}
      {!error && success ? <p id={`${id}-success`} className="field-message field-message--success"><span aria-hidden="true">✓</span>{success}</p> : null}
    </div>
  );
}
