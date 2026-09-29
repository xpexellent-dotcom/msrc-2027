import type { ComponentPropsWithoutRef } from "react";
import { FieldMessages, fieldDescriptionIds, type FieldPresentation } from "./form-field";

export type RadioProps = Omit<ComponentPropsWithoutRef<"input">, "id" | "type" | "readOnly" | "name" | "value" | "aria-invalid"> & Omit<FieldPresentation, "scientific"> & {
  name: string;
  value: string;
};

/** Put related radios in a fieldset with a localized legend and a shared name. */
export function Radio({
  id, label, hint, error, success, loading = false, loadingLabel,
  className = "", disabled, "aria-describedby": describedBy, ...props
}: RadioProps) {
  const presentation = { id, label, hint, error, success, loading, loadingLabel };
  return (
    <div className={`field choice-field${error ? " field--error" : ""}`}>
      <label className={`choice-label${disabled || loading ? " choice-label--disabled" : ""}`} htmlFor={id}>
        <input
          {...props}
          id={id}
          type="radio"
          className={`choice-input ${className}`.trim()}
          disabled={disabled || loading}
          aria-busy={loading || undefined}
          aria-describedby={fieldDescriptionIds(presentation, describedBy)}
          data-invalid={error ? true : undefined}
        />
        <span>{label}{props.required ? <span className="field-required" aria-hidden="true"> *</span> : null}</span>
      </label>
      {hint ? <p id={`${id}-hint`} className="field-hint">{hint}</p> : null}
      <FieldMessages {...presentation} />
    </div>
  );
}
