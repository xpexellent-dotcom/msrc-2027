import type { ComponentPropsWithoutRef } from "react";
import { FieldLabel, FieldMessages, fieldDescriptionIds, type FieldPresentation } from "./form-field";

export type SelectProps = Omit<ComponentPropsWithoutRef<"select">, "id"> & FieldPresentation;

export function Select({
  id, label, hint, error, success, scientific = false, loading = false, loadingLabel,
  className = "", disabled, children, "aria-describedby": describedBy, ...props
}: SelectProps) {
  const presentation = { id, label, hint, error, success, loading, loadingLabel };
  return (
    <div className={`field${error ? " field--error" : success ? " field--success" : ""}`}>
      <FieldLabel id={id} label={label} required={props.required} />
      {hint ? <p id={`${id}-hint`} className="field-hint">{hint}</p> : null}
      <select
        {...props}
        id={id}
        className={`field-input field-select ${className}`.trim()}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-describedby={fieldDescriptionIds(presentation, describedBy)}
        aria-invalid={error ? true : props["aria-invalid"]}
        dir={scientific ? "ltr" : props.dir}
        lang={scientific ? "en" : props.lang}
      >{children}</select>
      <FieldMessages {...presentation} />
    </div>
  );
}
