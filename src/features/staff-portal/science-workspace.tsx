"use client";
import { useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { Role } from "@/lib/permissions/contract";
import { SciencePanel } from "./research-panel";
import { AdvisoryPanel } from "./advisory-panel";
import { advisoryCopy } from "./advisory-copy";

export function ScienceWorkspace({ locale, roles }: { locale: Locale; roles: readonly Role[] }) {
  const [selected, setSelected] = useState(0), tabs = useRef<(HTMLButtonElement | null)[]>([]), text = advisoryCopy[locale];
  return <div className="staff-science-workspace">
    <div className="staff-science-tabs" role="tablist" aria-label={text.scienceTabs} onKeyDown={(event) => {
      let next = selected;
      if (event.key === "Home") next = 0;
      else if (event.key === "End") next = 1;
      else if (event.key === "ArrowLeft" || event.key === "ArrowRight") next = 1 - selected;
      else return;
      event.preventDefault(); setSelected(next); tabs.current[next]?.focus();
    }}>{[text.abstracts, text.advisory].map((label, index) => <button key={index} ref={(element) => { tabs.current[index] = element; }} type="button" role="tab" id={`science-tab-${index}`} aria-controls={`science-panel-${index}`} aria-selected={selected === index} tabIndex={selected === index ? 0 : -1} onClick={() => setSelected(index)}>{label}</button>)}</div>
    <div role="tabpanel" id={`science-panel-${selected}`} aria-labelledby={`science-tab-${selected}`} tabIndex={0}>{selected === 0 ? <SciencePanel locale={locale} roles={roles} /> : <AdvisoryPanel locale={locale} roles={roles} />}</div>
  </div>;
}
