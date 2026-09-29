import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type FieldPresentation = {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  success?: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  scientific?: boolean;
};

export function fieldDescriptionIds(
  { id, hint, error, success, loading, loadingLabel }: FieldPresentation,
  describedBy?: string,
) {
  return [
    describedBy,
    hint ? `${id}-hint` : null,
    error ? `${id}-error` : success ? `${id}-success` : null,
    loading && loadingLabel ? `${id}-loading` : null,
  ].filter(Boolean).join(" ") || undefined;
}

export function FieldMessages({ id, error, success, loading, loadingLabel }: FieldPresentation) {
  return (
    <>
      {error ? <p id={`${id}-error`} className="field-message field-message--error"><span aria-hidden="true">!</span>{error}</p> : null}
      {!error && success ? <p id={`${id}-success`} className="field-message field-message--success"><span aria-hidden="true">✓</span>{success}</p> : null}
      {loading && loadingLabel ? <p id={`${id}-loading`} className="field-hint" role="status">{loadingLabel}</p> : null}
    </>
  );
}

export function FieldLabel({ id, label, required }: Pick<FieldPresentation, "id" | "label"> & { required?: boolean }) {
  return <label className="field-label" htmlFor={id}>{label}{required ? <span className="field-required" aria-hidden="true"> *</span> : null}</label>;
}

type TextInputType = "text" | "email" | "password" | "search" | "tel" | "url" | "number" | "date" | "time";

export type FormFieldProps = Omit<ComponentPropsWithoutRef<"input">, "id" | "type"> & FieldPresentation & { type?: TextInputType };

/** Labels follow the interface language; scientific values always remain English/LTR. */
export function FormField({
  id, label, hint, error, success, scientific = false, loading = false, loadingLabel,
  className = "", disabled, "aria-describedby": describedBy, ...props
}: FormFieldProps) {
  const presentation = { id, label, hint, error, success, loading, loadingLabel };
  return (
    <div className={`field${error ? " field--error" : success ? " field--success" : ""}`}>
      <FieldLabel id={id} label={label} required={props.required} />
      {hint ? <p id={`${id}-hint`} className="field-hint">{hint}</p> : null}
      <input
        {...props}
        id={id}
        className={`field-input ${className}`.trim()}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-describedby={fieldDescriptionIds(presentation, describedBy)}
        aria-invalid={error ? true : props["aria-invalid"]}
        dir={scientific ? "ltr" : props.dir}
        lang={scientific ? "en" : props.lang}
      />
      <FieldMessages {...presentation} />
    </div>
  );
}
