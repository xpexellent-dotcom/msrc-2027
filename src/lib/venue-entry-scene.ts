type EntryScene = { render(progress: number): number; restore(): void };
type StyleValue = { value: string; priority: string };

const clamp = (value: number) => Math.max(0, Math.min(1, value));

/** The established on-screen movement curve: cubic-bezier(.77, 0, .175, 1). */
function travelEase(progress: number) {
  if (progress === 0 || progress === 1) return progress;
  let low = 0;
  let high = 1;
  let time = progress;
  for (let iteration = 0; iteration < 14; iteration++) {
    const inverse = 1 - time;
    const x = 3 * inverse * inverse * time * .77 + 3 * inverse * time * time * .175 + time * time * time;
    if (Math.abs(x - progress) < .00001) break;
    if (x < progress) low = time; else high = time;
    time = (low + high) / 2;
  }
  return 3 * (1 - time) * time * time + time * time * time;
}

/** Restore only properties owned by this scene, preserving unrelated updates. */
function ownStyles(element: HTMLElement, properties: readonly string[]) {
  // Shorthand assignments also own their longhands. Record them independently
  // so a pre-existing axis or timing override survives restoration.
  const expanded = properties.flatMap(property => property === "overflow" ? [property, "overflow-x", "overflow-y"]
    : property === "transition" ? [property, "transition-property", "transition-duration", "transition-timing-function", "transition-delay", "transition-behavior"]
      : [property]);
  const before = new Map<string, StyleValue>(expanded.map(property => [property, {
    value: element.style.getPropertyValue(property),
    priority: element.style.getPropertyPriority(property),
  }]));
  return () => {
    before.forEach(({ value, priority }, property) => {
      if (value) element.style.setProperty(property, value, priority);
      else element.style.removeProperty(property);
    });
  };
}

/**
 * Reveal the real Journey through a moving clip, with no clone or independent
 * timeline. The caller sets native scroll to landingY before restoring flow.
 */
export function createVenueEntryScene(journey: HTMLElement, target: HTMLElement, landingY: number): EntryScene {
  const original = journey.getBoundingClientRect();
  const rootTop = original.top + window.scrollY - landingY;
  const viewHeight = Math.max(1, window.innerHeight - rootTop);
  const world = journey.querySelector<HTMLElement>(".venue-journey-world");
  const frame = journey.querySelector<HTMLElement>(".venue-journey-frame");
  const heading = target.matches(".venue-journey-title") ? target
    : target.querySelector<HTMLElement>(".venue-journey-title");
  const reading = target.querySelector<HTMLElement>(".venue-journey-reading");
  const priorInert = journey.inert;
  const restoreRoot = ownStyles(journey, [
    "position", "left", "right", "top", "bottom", "width", "height",
    "min-height", "max-height", "overflow", "z-index", "transform", "filter",
    "will-change", "transition",
  ]);
  const restoreWorld = world ? ownStyles(world, ["transform", "will-change", "transition"]) : undefined;
  const restoreFrame = frame ? ownStyles(frame, ["transform", "will-change", "transition"]) : undefined;
  const restoreHeading = heading ? ownStyles(heading, ["transform", "opacity", "will-change", "transition"]) : undefined;
  const restoreReading = reading ? ownStyles(reading, ["opacity", "transition"]) : undefined;
  const worldBase = world ? getComputedStyle(world).transform : "none";
  const frameBase = frame ? getComputedStyle(frame).transform : "none";
  const headingBase = heading ? getComputedStyle(heading).transform : "none";
  const compose = (offset: number, base: string) => `translate3d(0,${offset}px,0)${base === "none" ? "" : ` ${base}`}`;

  const placeholder = document.createElement("div");
  placeholder.className = "venue-entry-flow-placeholder";
  placeholder.dataset.venueEntryPlaceholder = "";
  placeholder.setAttribute("aria-hidden", "true");
  placeholder.style.height = `${original.height}px`;
  placeholder.style.pointerEvents = "none";
  journey.before(placeholder);

  journey.inert = true;
  journey.style.position = "fixed";
  journey.style.left = `${original.left}px`;
  journey.style.right = "auto";
  journey.style.top = `${rootTop}px`;
  journey.style.bottom = "auto";
  journey.style.width = `${original.width}px`;
  journey.style.height = `${viewHeight}px`;
  journey.style.minHeight = "0";
  journey.style.maxHeight = "none";
  journey.style.overflow = "clip";
  journey.style.zIndex = "29";
  journey.style.willChange = "transform,filter";
  journey.style.transition = "none";
  if (reading) {
    reading.style.opacity = "1";
    reading.style.transition = "none";
  }
  for (const element of [world, frame, heading]) {
    if (!element) continue;
    element.style.willChange = element === heading ? "transform,opacity" : "transform";
    element.style.transition = "none";
  }

  let restored = false;
  const render = (value: number) => {
    if (restored) return rootTop;
    const progress = clamp(Number.isFinite(value) ? value : 0);
    const eased = travelEase(progress);
    const offset = viewHeight * (1 - eased);
    journey.style.transform = compose(offset, "none");
    journey.style.filter = `blur(${4 * (1 - clamp(progress / .85))}px)`;
    // Countertranslation makes the incoming document composition stationary as
    // the clipping edge advances. Only the atlas frame has restrained parallax;
    // its inner geographic camera continues to own its own transform.
    if (world) world.style.transform = compose(-offset, worldBase);
    if (frame) frame.style.transform = compose(offset * .12, frameBase);
    if (heading) {
      const reveal = clamp((progress - .22) / (.85 - .22));
      const headingEase = 1 - Math.pow(1 - reveal, 3);
      heading.style.opacity = String(headingEase);
      heading.style.transform = compose(12 * (1 - headingEase), headingBase);
    }
    return rootTop + offset;
  };
  render(0);

  return {
    render,
    restore() {
      if (restored) return;
      restored = true;
      restoreHeading?.();
      restoreReading?.();
      restoreFrame?.();
      restoreWorld?.();
      restoreRoot();
      journey.inert = priorInert;
      placeholder.remove();
    },
  };
}

/** The resting scroll position for the complete venue overview before entry. */
export function venueEntryGate(stage: HTMLElement) {
  const bounds = stage.getBoundingClientRect();
  const clearance = Number.parseFloat(getComputedStyle(document.documentElement).scrollPaddingBlockStart) || 96;
  const fits = innerWidth >= 1200 && innerHeight >= 641 && bounds.height + clearance <= innerHeight + 1;
  return { y: Math.max(0, scrollY + (fits ? bounds.top - clearance : bounds.bottom - innerHeight)), fits };
}

/** Dispatched by the journey stepper; the entrance resolves `done` once flow is restored. */
export const venueEntryRequest = "venue-journey:enter";
export type VenueEntryRequest = CustomEvent<{ done: () => void }>;
