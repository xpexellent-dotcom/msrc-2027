import type { ComponentPropsWithoutRef } from "react";
import { FieldMessages, fieldDescriptionIds, type FieldPresentation } from "./form-field";

export type CheckboxProps = Omit<ComponentPropsWithoutRef<"input">, "id" | "type" | "readOnly"> & Omit<FieldPresentation, "scientific">;

export function Checkbox({
  id, label, hint, error, success, loading = false, loadingLabel,
  className = "", disabled, "aria-describedby": describedBy, ...props
}: CheckboxProps) {
  const presentation = { id, label, hint, error, success, loading, loadingLabel };
  return (
    <div className={`field choice-field${error ? " field--error" : ""}`}>
      <label className={`choice-label${disabled || loading ? " choice-label--disabled" : ""}`} htmlFor={id}>
        <input
          {...props}
          id={id}
          type="checkbox"
          className={`choice-input ${className}`.trim()}
          disabled={disabled || loading}
          aria-busy={loading || undefined}
          aria-describedby={fieldDescriptionIds(presentation, describedBy)}
          aria-invalid={error ? true : props["aria-invalid"]}
        />
        <span>{label}{props.required ? <span className="field-required" aria-hidden="true"> *</span> : null}</span>
      </label>
      {hint ? <p id={`${id}-hint`} className="field-hint">{hint}</p> : null}
      <FieldMessages {...presentation} />
    </div>
  );
}
