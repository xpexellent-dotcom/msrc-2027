"use client";

import { useState } from "react";

export function profileInitials(name: string) {
  return name.trim().split(/\s+/u).filter(Boolean).slice(0, 2).map((part) => Array.from(part)[0]).join("").toLocaleUpperCase();
}

/** Private images bypass the public image optimizer and never enter its cache. */
export function ProfileAvatar({ name, url, className = "", previewLabel }: { name: string; url: string | null; className?: string; previewLabel?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  return <div className={`participant-profile-avatar ${className}`.trim()} aria-hidden={previewLabel ? undefined : true}>
    {url && failedUrl !== url ?
      // eslint-disable-next-line @next/next/no-img-element -- Authorized private route or short-lived signed URL; do not use the public optimizer.
      <img src={url} alt={previewLabel ?? ""} referrerPolicy="no-referrer" onError={() => setFailedUrl(url)} />
      : <bdi dir="auto">{profileInitials(name)}</bdi>}
  </div>;
}
