"use client";

import { useEffect } from "react";

/**
 * ORG-010: on phones each chapter title arrives big and centred, holds there while the reader
 * scrolls, then settles: it shrinks to its own size, still centred, and its words are placed
 * back where they belong (across, then into their lines), as the section rises to meet it.
 * - Text is never hidden. Without JavaScript, with reduced motion and above 700px (two-column
 *   sections, or the desktop chapter bar) every title stays as rendered.
 * - Only chapters still below the screen are staged, so nothing the reader can see moves.
 * - The settle runs on time and scrolling can only hurry it, so it always finishes before the
 *   section's content reaches the title.
 */
const phones = "(max-width: 700px)";
const settle = { delay: 60, duration: 1200, shrink: "cubic-bezier(.6, 0, .35, 1)", across: "cubic-bezier(.5, 0, .5, 1)", into: "cubic-bezier(.4, 0, .2, 1)" };
const largest = 1.8;

type View = { width: number; top: number; bottom: number };
type Move = { element: HTMLElement; frames: Keyframe[] };
type Chapter = { stage: HTMLElement; lockup: HTMLElement; pin: number; runway: number; moves: Move[]; animations: Animation[]; state: "armed" | "playing" | "played" };

function measureView(): View {
  // The small viewport, so the iPhone toolbar folding away never moves a pinned title.
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;inset-block-start:0;block-size:100svh;visibility:hidden;pointer-events:none";
  document.body.append(probe);
  const height = probe.offsetHeight || window.innerHeight;
  probe.remove();
  // Once the page scrolls, the floating header rests about 1rem from the top.
  const header = document.querySelector<HTMLElement>(".site-header-inner")?.offsetHeight ?? 70;
  return { width: document.documentElement.clientWidth, top: 16 + header + 14, bottom: height - 24 };
}

function place(element: HTMLElement, frame?: Keyframe) {
  element.style.translate = frame ? String(frame.translate) : "";
  element.style.scale = frame?.scale ? String(frame.scale) : "";
}

function stage(element: HTMLElement, view: View): Chapter | null {
  const lockup = element.querySelector<HTMLElement>(":scope > .section-heading");
  const title = lockup?.querySelector<HTMLElement>("h2");
  const words = [...(title?.querySelectorAll<HTMLElement>(".title-word") ?? [])];
  if (!lockup || !title || !words.length) return null;
  const eyebrow = lockup.querySelector<HTMLElement>(".eyebrow");
  element.dataset.chapter = "armed";
  for (const target of [eyebrow, ...words]) if (target) place(target);
  const box = lockup.getBoundingClientRect();
  const natural = words.map((word) => word.getBoundingClientRect());
  const inset = Math.max(16, Math.min(box.left, view.width - box.right));
  const measure = view.width - 2 * inset;
  const room = view.bottom - view.top;
  const label = eyebrow?.getBoundingClientRect().height ?? 0;
  const gap = 22;

  // The large title is laid out for real, centred, in an invisible copy. It keeps the title's
  // own line breaks, wrapping further only where a line is too wide, so few words change line.
  const probe = title.cloneNode(true) as HTMLElement;
  probe.removeAttribute("id");
  probe.removeAttribute("aria-label");
  probe.style.cssText = `position:absolute;inset-block-start:0;inset-inline-start:0;inline-size:${measure}px;margin:0;text-align:center;visibility:hidden;pointer-events:none`;
  lockup.append(probe);
  const size = parseFloat(getComputedStyle(title).fontSize);
  let scale = Math.min(largest, measure * .96 / Math.max(...natural.map((word) => word.width)));
  let big = probe.getBoundingClientRect();
  let spots: DOMRect[] = [];
  for (let attempt = 0; attempt < 8; attempt++) {
    probe.style.fontSize = `${size * scale}px`;
    big = probe.getBoundingClientRect();
    spots = [...probe.querySelectorAll<HTMLElement>(".title-word")].map((word) => word.getBoundingClientRect());
    if (label + gap + big.height <= room * .8 || scale <= 1.15) break;
    scale *= .92;
  }
  probe.remove();

  const height = label + gap + big.height;
  const pin = Math.round(view.top + Math.max(0, (room - height) / 2));
  // Enough scroll for the hold, with the section's content clear of the large title.
  const runway = Math.round(Math.max(0, height - box.height) + Math.max(56, room * .14));
  const centre = view.width / 2 - box.left;
  const lead = natural[0].top - box.top;
  // Positions are the words' top-left corners within the lockup; scale grows from that corner.
  // Placing back goes across first, then into the lines: the large layout keeps the title's line
  // breaks, so words sharing a row share a line and no two words cross on the way.
  const moves: Move[] = words.map((word, index) => {
    const at = { x: natural[index].left - box.left, y: natural[index].top - box.top };
    const inBig = { x: spots[index].left - big.left - big.width / 2, y: spots[index].top - big.top };
    const large = { x: centre + inBig.x, y: label + gap + inBig.y };
    const own = { x: centre + inBig.x / scale, y: lead + inBig.y / scale };
    return { element: word, frames: [
      { translate: `${large.x - at.x}px ${large.y - at.y}px`, scale: String(scale), easing: settle.shrink },
      { translate: `${own.x - at.x}px ${own.y - at.y}px`, scale: "1", offset: .5, easing: settle.across },
      { translate: `0px ${own.y - at.y}px`, scale: "1", offset: .75, easing: settle.into },
      { translate: "0px 0px", scale: "1" },
    ] };
  });
  if (eyebrow) {
    const range = document.createRange();
    range.selectNodeContents(eyebrow);
    const content = range.getBoundingClientRect();
    const shift = `${view.width / 2 - content.left - content.width / 2}px 0px`;
    moves.unshift({ element: eyebrow, frames: [
      { translate: shift, easing: settle.shrink },
      { translate: shift, offset: .5, easing: settle.across },
      { translate: "0px 0px", offset: .75 },
      { translate: "0px 0px" },
    ] });
  }
  element.style.setProperty("--chapter-pin", `${pin}px`);
  element.style.setProperty("--chapter-runway", `${runway}px`);
  for (const move of moves) place(move.element, move.frames[0]);
  return { stage: element, lockup, pin, runway, moves, animations: [], state: "armed" };
}

function play(chapter: Chapter) {
  chapter.state = "playing";
  chapter.stage.dataset.chapter = "playing";
  chapter.animations = chapter.moves.map(({ element, frames }) => {
    const animation = element.animate(frames, { duration: settle.duration, delay: settle.delay, fill: "backwards" });
    place(element);
    return animation;
  });
  Promise.all(chapter.animations.map((animation) => animation.finished)).then(() => {
    chapter.state = "played";
    chapter.stage.dataset.chapter = "played";
  }, () => {});
}

/** Scrolling through the hold can only move the settle forward, finishing it by 85% of the way. */
function hurry(chapter: Chapter) {
  const progress = Math.min(1, Math.max(0, (chapter.pin - chapter.stage.getBoundingClientRect().top) / (chapter.runway * .85)));
  const at = progress * (settle.delay + settle.duration);
  for (const animation of chapter.animations) {
    if (Number(animation.currentTime ?? 0) < at) animation.currentTime = at;
  }
}

function reset(chapter: Chapter) {
  for (const animation of chapter.animations) animation.cancel();
  for (const move of chapter.moves) place(move.element);
  chapter.stage.removeAttribute("data-chapter");
  chapter.stage.style.removeProperty("--chapter-pin");
  chapter.stage.style.removeProperty("--chapter-runway");
}

export function ChapterTitles() {
  useEffect(() => {
    if (typeof Element.prototype.animate !== "function" || !CSS.supports("overflow", "clip") || !CSS.supports("translate", "1px")) return;
    const narrow = matchMedia(phones);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)");
    let chapters: Chapter[] = [];
    let width = document.documentElement.clientWidth;
    let frame = 0;
    let recheck = 0;
    let live = true;

    const update = () => {
      frame = 0;
      const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      let waiting = false;
      for (const chapter of chapters) {
        if (chapter.state === "armed") {
          const top = chapter.lockup.getBoundingClientRect().top;
          // Pinned, jumped past, or the last chapter with no page left to pin it.
          if (top <= chapter.pin + 1 || (atEnd && top < window.innerHeight)) play(chapter);
          else waiting ||= top < window.innerHeight;
        }
        if (chapter.state === "playing") hurry(chapter);
      }
      // A reveal or late layout can still nudge a title on screen after scrolling stops.
      if (waiting && !recheck) recheck = window.setTimeout(() => { recheck = 0; schedule(); }, 250);
      if (chapters.every((chapter) => chapter.state === "played")) window.removeEventListener("scroll", schedule);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const stop = () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(recheck);
      frame = recheck = 0;
      window.removeEventListener("scroll", schedule);
      for (const chapter of chapters) reset(chapter);
      chapters = [];
    };
    const start = () => {
      stop();
      width = document.documentElement.clientWidth;
      if (!narrow.matches || reduced.matches) return;
      const view = measureView();
      chapters = [...document.querySelectorAll<HTMLElement>(".chapter-stage")]
        .filter((element) => element.getBoundingClientRect().top >= window.innerHeight)
        .map((element) => stage(element, view))
        .filter((chapter): chapter is Chapter => chapter !== null);
      if (!chapters.length) return;
      window.addEventListener("scroll", schedule, { passive: true });
      schedule();
    };
    // Height alone changes as the iPhone toolbar folds; only a new width re-lays the titles.
    const resized = () => { if (document.documentElement.clientWidth !== width) start(); };

    // Words are measured in their final font, never a fallback that swaps out later.
    document.fonts.ready.then(() => { if (live) start(); });
    narrow.addEventListener("change", start);
    reduced.addEventListener("change", start);
    window.addEventListener("resize", resized);
    return () => {
      live = false;
      stop();
      narrow.removeEventListener("change", start);
      reduced.removeEventListener("change", start);
      window.removeEventListener("resize", resized);
    };
  }, []);
  return null;
}
