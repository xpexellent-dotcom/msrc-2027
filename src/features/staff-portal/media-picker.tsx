"use client";
/* These private staff previews must not enter the public image optimizer cache. */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/forms/form-field";
import type { Locale } from "@/lib/i18n";
import type { MediaAsset } from "./media-contract";
import { requestMedia } from "./media-client";
import { mediaCopy } from "./media-copy";

type MediaPickerProps = { locale: Locale; value?: string | null; onChoose: (asset: MediaAsset) => void; disabled?: boolean };

/** Also usable with a task-3 server-loaded list; stale draft/archived references are never offered. */
export function MediaPickerChoices({ locale, value, onChoose, disabled = false, assets }: MediaPickerProps & { assets: readonly MediaAsset[] }) {
  const text = mediaCopy[locale], published = assets.filter((asset) => asset.state === "published" && !!asset.publicUrl && !asset.busy);
  return !published.length ? <p>{text.pickerEmpty}</p> : <ul className="staff-media-grid">{published.map((asset) => <li key={asset.id}><button type="button" className="staff-media-card" aria-label={`${text.choose}: ${locale === "ar" ? asset.altAr : asset.altEn}`} aria-pressed={value === asset.id} disabled={disabled} onClick={() => onChoose(asset)}><img src={asset.previewUrl} alt="" width={asset.width} height={asset.height} loading="lazy" style={{ objectPosition: `${asset.focalX}% ${asset.focalY}%` }} /><span className="staff-media-card-meta">{locale === "ar" ? asset.altAr : asset.altEn}</span></button></li>)}</ul>;
}

/** Task 3 selects an asset ID here; its save handler must recheck current publication. */
export function MediaPicker({ locale, value, onChoose, disabled = false }: MediaPickerProps) {
  const text = mediaCopy[locale], [query, setQuery] = useState(""), [submitted, setSubmitted] = useState({ query: "", revision: 0 });
  const [assets, setAssets] = useState<MediaAsset[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState("");
  const searchId = useId();
  useEffect(() => {
    const controller = new AbortController();
    const start = window.setTimeout(() => {
      setLoading(true); setError("");
      void requestMedia(undefined, { state: "published", query: submitted.query, signal: controller.signal }).then((response) => {
        if (controller.signal.aborted) return;
        if (response.state === "ready") setAssets(response.assets ?? []);
        else { setAssets([]); setError(response.state in text.errors ? text.errors[response.state as keyof typeof text.errors] : text.errors.unavailable); }
        setLoading(false);
      });
    }, 0);
    return () => { controller.abort(); window.clearTimeout(start); };
  }, [submitted, text]);
  return <section className="staff-media-picker" aria-label={text.picker}>
    <h3>{text.picker}</h3><div className="staff-search">
      <FormField id={searchId} type="search" label={text.search} value={query} maxLength={120} disabled={disabled || loading} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); setSubmitted((previous) => ({ query, revision: previous.revision + 1 })); } }} />
      <Button disabled={disabled || loading} onClick={() => setSubmitted((previous) => ({ query, revision: previous.revision + 1 }))}>{text.searchAction}</Button>
    </div>
    {error ? <p role="alert">{error}</p> : loading ? <p role="status">{text.loading}</p> : <MediaPickerChoices locale={locale} assets={assets} value={value} disabled={disabled} onChoose={onChoose} />}
  </section>;
}
