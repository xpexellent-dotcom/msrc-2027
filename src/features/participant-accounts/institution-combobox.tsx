"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FieldLabel, FieldMessages } from "@/components/forms/form-field";
import { SAUDI_UNIVERSITIES, searchSaudiUniversities } from "@/content/saudi-universities";
import type { Locale } from "@/lib/i18n";
import { profileCopy } from "./profile-copy";

/** ARIA 1.2 editable combobox: focus stays on the input while options are navigated. */
export function InstitutionCombobox({ locale, value, other, error, onChange }: {
  locale: Locale; value: string | null; other: boolean; error?: string;
  onChange: (id: string | null, other: boolean) => void;
}) {
  const copy = profileCopy[locale], listId = useId(), list = useRef<HTMLUListElement>(null);
  const label = (id: string | null, isOther: boolean) => isOther ? copy.other : SAUDI_UNIVERSITIES.find((item) => item.id === id)?.[locale === "ar" ? "nameAr" : "nameEn"] ?? "";
  const [query, setQuery] = useState<string | null>(null);
  const [open, setOpen] = useState(false), [active, setActive] = useState(-1);
  const matches = searchSaudiUniversities(query ?? "");
  const options = [...matches.map((item) => ({ id: item.id, text: item[locale === "ar" ? "nameAr" : "nameEn"], other: false })), { id: null, text: copy.other, other: true }];
  useEffect(() => { if (open && active >= 0) list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" }); }, [open, active]);
  function choose(index: number) { const option = options[index]; if (!option) return; setQuery(null); onChange(option.id, option.other); setOpen(false); setActive(-1); }
  return <div className={`field participant-profile-combobox${error ? " field--error" : ""}`} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setQuery(null); } }}>
    <FieldLabel id="profile-institution" label={copy.institution} />
    <p id="profile-institution-hint" className="field-hint">{copy.institutionHint}</p>
    <input id="profile-institution" className="field-input" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId} aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
      aria-invalid={!!error || undefined} aria-describedby={`profile-institution-hint${error ? " profile-institution-error" : ""}`} value={query ?? label(value, other)} dir="auto" autoComplete="off"
      onFocus={() => { setOpen(true); setActive(-1); }} onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(-1); }}
      onKeyDown={(event) => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActive((current) => event.key === "ArrowDown" ? (current + 1) % options.length : current <= 0 ? options.length - 1 : current - 1); }
        else if (open && (event.key === "Home" || event.key === "End")) { event.preventDefault(); setActive(event.key === "Home" ? 0 : options.length - 1); }
        else if (open && event.key === "Enter" && active >= 0) { event.preventDefault(); choose(active); }
        else if (event.key === "Escape") { event.preventDefault(); setOpen(false); setQuery(null); setActive(-1); }
      }} />
    {open ? <ul ref={list} id={listId} role="listbox" aria-label={copy.institution} className="participant-profile-options">
      {!matches.length ? <li role="presentation" className="field-hint">{copy.noResults}</li> : null}
      {options.map((option, index) => <li role="option" key={option.id ?? "other"} id={`${listId}-${index}`} data-index={index} aria-selected={option.other ? other : value === option.id} data-active={active === index || undefined}
        onMouseDown={(event) => event.preventDefault()} onClick={() => choose(index)}><bdi dir="auto">{option.text}</bdi></li>)}
    </ul> : null}
    {value || other ? <button type="button" className="participant-profile-clear" onClick={() => { onChange(null, false); setQuery(""); }}>{copy.clearInstitution}</button> : null}
    <FieldMessages id="profile-institution" label={copy.institution} error={error} />
  </div>;
}
