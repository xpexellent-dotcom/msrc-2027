"use client";

import { useRef, useState, type ComponentPropsWithoutRef } from "react";
import { FieldLabel, FieldMessages, fieldDescriptionIds, type FieldPresentation } from "./form-field";

export type FileUploadProps = Omit<ComponentPropsWithoutRef<"input">, "id" | "type" | "readOnly" | "value" | "defaultValue" | "onChange"> & Omit<FieldPresentation, "scientific"> & {
  clearLabel: string;
  selectionLabel: string;
  onSelectionChange?: (files: File[]) => void;
};

/** UI selection only: no file contents, uploads, persistence, or storage integration. */
export function FileUpload({
  id, label, hint, error, success, loading = false, loadingLabel,
  clearLabel, selectionLabel, onSelectionChange, className = "", disabled,
  "aria-describedby": describedBy, ...props
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const presentation = { id, label, hint, error, success, loading, loadingLabel };
  return (
    <div className={`field file-field${error ? " field--error" : ""}`}>
      <FieldLabel id={id} label={label} required={props.required} />
      {hint ? <p id={`${id}-hint`} className="field-hint">{hint}</p> : null}
      <input
        {...props}
        ref={inputRef}
        id={id}
        type="file"
        className={`field-input file-input ${className}`.trim()}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        aria-describedby={fieldDescriptionIds(presentation, describedBy)}
        aria-invalid={error ? true : props["aria-invalid"]}
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          setFileNames(files.map((file) => file.name));
          onSelectionChange?.(files);
        }}
      />
      <div className="file-selection" role="status" aria-live="polite" aria-atomic="true">
        {fileNames.length > 0 ? <p><span>{selectionLabel}</span> <bdi>{fileNames.join(", ")}</bdi></p> : null}
      </div>
      {fileNames.length > 0 ? (
        <button
          type="button"
          className="file-clear"
          disabled={disabled || loading}
          onClick={() => {
            if (inputRef.current) inputRef.current.value = "";
            setFileNames([]);
            onSelectionChange?.([]);
            inputRef.current?.focus();
          }}
        >{clearLabel}</button>
      ) : null}
      <FieldMessages {...presentation} />
    </div>
  );
}
