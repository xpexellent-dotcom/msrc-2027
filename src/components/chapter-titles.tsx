"use client";

import { useEffect } from "react";

type Chapter = {
  stage: HTMLElement;
  heading: HTMLElement;
  from: string;
  animation?: Animation;
  played: boolean;
};

/** A once-only centered arrival; headings always keep their place in the document. */
export function ChapterTitles() {
  useEffect(() => {
    if (typeof Element.prototype.animate !== "function") return;
    const phones = matchMedia("(max-width: 700px)");
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    const completed = new WeakSet<HTMLElement>();
    let chapters: Chapter[] = [];
    let width = document.documentElement.clientWidth;
    let frame = 0;
    let live = true;

    const finish = (chapter: Chapter) => {
      chapter.animation?.cancel();
      chapter.animation = undefined;
      chapter.heading.style.removeProperty("transform");
      chapter.stage.dataset.chapter = "played";
      chapter.played = true;
      completed.add(chapter.stage);
    };

    const update = () => {
      frame = 0;
      for (const chapter of chapters) {
        if (chapter.played) continue;
        const box = chapter.stage.getBoundingClientRect();
        // Fast flicks and fragment navigation land directly in the natural layout.
        if (box.top < window.innerHeight * .3) {
          finish(chapter);
        } else if (!chapter.animation && box.top < window.innerHeight * .88) {
          // A resize or preference change may cancel the motion, but must not replay it.
          completed.add(chapter.stage);
          chapter.stage.dataset.chapter = "playing";
          chapter.heading.style.removeProperty("transform");
          const animation = chapter.heading.animate([
            { transform: chapter.from },
            { transform: "none" },
          ], { duration: 650, easing: "cubic-bezier(.22, .68, .3, 1)" });
          chapter.animation = animation;
          animation.finished.then(() => {
            if (chapter.animation === animation) finish(chapter);
          }, () => {});
        }
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      window.removeEventListener("scroll", schedule);
      for (const chapter of chapters) {
        chapter.animation?.cancel();
        chapter.heading.style.removeProperty("transform");
        chapter.stage.removeAttribute("data-chapter");
      }
      chapters = [];
    };
    const start = () => {
      stop();
      width = document.documentElement.clientWidth;
      if (!phones.matches || reduced.matches) return;
      for (const stage of document.querySelectorAll<HTMLElement>(".chapter-stage")) {
        if (completed.has(stage) || stage.getBoundingClientRect().top < window.innerHeight) continue;
        const heading = stage.querySelector<HTMLElement>(":scope > .section-heading");
        if (!heading) continue;
        const space = stage.getBoundingClientRect();
        const box = heading.getBoundingClientRect();
        // Move the whole phrase together, respecting its existing line breaks and RTL.
        // Keep the enlarged title within its own column and its existing content gap.
        const scale = Math.max(1, Math.min(1.2, (space.width - 2) / Math.max(1, box.width)));
        const shift = (space.left + space.right - box.left - box.right) / 2;
        const from = `translateX(${shift}px) scale(${scale})`;
        heading.style.transform = from;
        stage.dataset.chapter = "armed";
        chapters.push({ stage, heading, from, played: false });
      }
      if (chapters.length) window.addEventListener("scroll", schedule, { passive: true });
      schedule();
    };
    // Height-only changes from phone browser toolbars must never restage a title.
    const resized = () => { if (document.documentElement.clientWidth !== width) start(); };
    const sizes = new WeakMap<Element, string>();
    const observer = new ResizeObserver((entries) => {
      let changed = false;
      for (const entry of entries) {
        const size = `${entry.contentRect.width}:${entry.contentRect.height}`;
        const previous = sizes.get(entry.target);
        if (previous && previous !== size) changed = true;
        sizes.set(entry.target, size);
      }
      // Text zoom can change a title even when the viewport width stays the same.
      if (changed) start();
    });

    document.fonts.ready.then(() => {
      if (!live) return;
      start();
      for (const heading of document.querySelectorAll(".chapter-stage > .section-heading")) observer.observe(heading);
    });
    phones.addEventListener("change", start);
    reduced.addEventListener("change", start);
    window.addEventListener("resize", resized);
    return () => {
      live = false;
      observer.disconnect();
      stop();
      phones.removeEventListener("change", start);
      reduced.removeEventListener("change", start);
      window.removeEventListener("resize", resized);
    };
  }, []);
  return null;
}
