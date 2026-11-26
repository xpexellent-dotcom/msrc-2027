"use client";

import { useEffect } from "react";
import { observeHomeMotionBudget } from "@/lib/home-motion-budget";

/**
 * ORG-012: homepage motion that follows the reader's scroll, on phones and desktop.
 * - Each chapter title rises into place as it scrolls in and its words light up in reading
 *   order. Its state is a pure function of scroll position, so scrolling back up simply
 *   reverses it: nothing pins, plays once, or adds scroll distance.
 * - Leaving the opening film, the headline drifts up and fades while the film eases closer.
 * The Legacy photo track fades in once it reaches the reading area, leaving its background visible first.
 * CSS handles the animation properties. Without JavaScript or with reduced motion the page is static.
 */
const ease = (value: number) => 1 - (1 - value) ** 3;
const clamp = (value: number) => Math.min(1, Math.max(0, value));
const galleryRevealLine = .76;
// Writing an unchanged custom property still restyles the subtree, so only changes are written.
function write(element: HTMLElement, name: string, value: number) {
  const text = value.toFixed(3);
  if (element.style.getPropertyValue(name) !== text) element.style.setProperty(name, text);
}

export function ScrollScenes() {
  useEffect(observeHomeMotionBudget, []);
  useEffect(() => {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = matchMedia("(min-width: 801px)");
    const root = document.documentElement;
    let frame = 0;
    let stages: HTMLElement[] = [];
    let hero: HTMLElement | null = null;
    let gallery: HTMLElement | null = null;
    let galleryTrack: HTMLElement | null = null;
    let gallerySeen = false;
    let stageObserver: IntersectionObserver | null = null;
    const nearbyStages = new Set<HTMLElement>();

    const update = () => {
      frame = 0;
      const height = window.innerHeight;
      for (const stage of nearbyStages) {
        const top = stage.getBoundingClientRect().top;
        if (stage === galleryTrack) {
          if (top <= height * galleryRevealLine) {
            gallerySeen = true;
            stage.dataset.galleryArrival = "arriving";
            nearbyStages.delete(stage);
            stageObserver?.unobserve(stage);
          }
          continue;
        }
        // From entering at the bottom edge to the upper reading line, about half a screen. A title
        // wholly below the screen stays as rendered: it dims only once its stage edge is in view,
        // before any of its words are, so nothing off screen reads as faint text.
        const progress = top >= height ? 1 : clamp((height * .97 - top) / (height * .5));
        write(stage, "--scene", progress);
        write(stage, "--scene-eased", ease(progress));
      }
      if (hero && desktop.matches) {
        write(hero, "--leave", clamp(window.scrollY / (height * .85)));
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const revealGallery = () => {
      if (!galleryTrack?.dataset.galleryArrival) return;
      gallerySeen = true;
      delete galleryTrack.dataset.galleryArrival;
      nearbyStages.delete(galleryTrack);
      stageObserver?.unobserve(galleryTrack);
    };
    const onGalleryArrivalEnd = (event: AnimationEvent) => {
      if (event.target === galleryTrack && event.animationName === "gallery-arrive") revealGallery();
    };
    const onGalleryWheel = (event: WheelEvent) => {
      if (event.deltaX || (event.shiftKey && event.deltaY)) revealGallery();
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      stageObserver?.disconnect();
      stageObserver = null;
      nearbyStages.clear();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      delete root.dataset.scenes;
      for (const stage of stages) { stage.style.removeProperty("--scene"); stage.style.removeProperty("--scene-eased"); }
      hero?.style.removeProperty("--leave");
      gallery?.removeEventListener("focusin", revealGallery);
      gallery?.removeEventListener("pointerdown", revealGallery);
      gallery?.removeEventListener("wheel", onGalleryWheel);
      if (galleryTrack) {
        galleryTrack.removeEventListener("animationend", onGalleryArrivalEnd);
        delete galleryTrack.dataset.galleryArrival;
      }
      stages = [];
      hero = null;
      gallery = galleryTrack = null;
    };
    const start = () => {
      stop();
      if (reduced.matches) return;
      stages = [...document.querySelectorAll<HTMLElement>(".homepage-journey .chapter-stage")];
      hero = document.querySelector<HTMLElement>(".homepage-journey .conference-hero");
      gallery = document.querySelector<HTMLElement>(".homepage-journey .legacy-section .gallery-rail");
      galleryTrack = gallery?.querySelector<HTMLElement>(".rail-track") ?? null;
      if (gallery && galleryTrack && !gallerySeen) {
        // Preserve a gallery already in the reading area on a restored or deep load.
        if (galleryTrack.getBoundingClientRect().top <= window.innerHeight * galleryRevealLine) gallerySeen = true;
        else {
          galleryTrack.dataset.galleryArrival = "waiting";
          stages.push(galleryTrack);
          galleryTrack.addEventListener("animationend", onGalleryArrivalEnd);
          gallery.addEventListener("focusin", revealGallery);
          gallery.addEventListener("pointerdown", revealGallery, { passive: true });
          gallery.addEventListener("wheel", onGalleryWheel, { passive: true });
        }
      }
      if (window.IntersectionObserver) {
        stageObserver = new IntersectionObserver((entries) => {
          for (const entry of entries) {
            const stage = entry.target as HTMLElement;
            if (stage === galleryTrack && gallerySeen) continue;
            if (entry.isIntersecting) nearbyStages.add(stage);
            else {
              nearbyStages.delete(stage);
              if (stage !== galleryTrack) {
                write(stage, "--scene", 1);
                write(stage, "--scene-eased", 1);
              }
            }
          }
          schedule();
        }, { rootMargin: "50% 0px 50% 0px" });
        stages.forEach((stage) => stageObserver?.observe(stage));
      } else stages.forEach((stage) => nearbyStages.add(stage));
      update();
      root.dataset.scenes = "on";
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule);
    };

    start();
    const viewport = () => { if (!desktop.matches) hero?.style.removeProperty("--leave"); schedule(); };
    reduced.addEventListener("change", start);
    desktop.addEventListener("change", viewport);
    return () => {
      stop();
      reduced.removeEventListener("change", start);
      desktop.removeEventListener("change", viewport);
    };
  }, []);
  return null;
}
