"use client";
import { useEffect, useState } from "react";
import type { PublicWorkshop } from "@/content/conference-experiences";
import { publicWorkshopProjection } from "./public-contract";

/** Keep the public page statically rendered, then read current allocation counts. */
export function usePublicWorkshopCatalogue(initial: readonly PublicWorkshop[]) {
  const [catalogue, setCatalogue] = useState<readonly PublicWorkshop[]>(initial);
  useEffect(() => {
    const controller = new AbortController();
    async function read() {
      try {
        const response = await fetch("/api/workshops/public", { cache: "no-store", credentials: "omit", signal: controller.signal });
        if (!response.ok) return;
        const workshops = publicWorkshopProjection(await response.json());
        if (workshops && !controller.signal.aborted) setCatalogue(workshops);
      } catch { /* Retain the honest unannounced fallback. */ }
    }
    void read();
    const refresh = () => { if (document.visibilityState === "visible") void read(); };
    window.addEventListener("focus", refresh);
    return () => { controller.abort(); window.removeEventListener("focus", refresh); };
  }, []);
  return catalogue;
}
