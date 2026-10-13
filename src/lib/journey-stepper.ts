/**
 * One deliberate wheel or key gesture moves exactly one journey stop, whatever the input
 * speed. Wheel spins, trackpad inertia and held keys are measured as
 * gestures, not distances, so a fast flick and a slow notch land in the same
 * place. Touch keeps native scrolling everywhere, as do all inputs outside
 * the stops; the journey animates continuously with the scroll position.
 */
export type JourneyStepper = { go(index: number): void; destroy(): void };

type StepperOptions = {
  /** Ascending document scroll positions, measured on demand. */
  stops(): number[];
  enabled(): boolean;
  /** Pixels of the stop's own content still hidden below the reading area. */
  overflow?(index: number): number;
  /** A bespoke transition between two stops; resolve once flow is restored. */
  transition?(from: number, to: number): Promise<void> | undefined;
  onMoving?(moving: boolean): void;
  onArrive?(index: number): void;
};

type Target = { y: number; index?: number; from?: number };

const tolerance = 3;
// Wheel silence that separates one gesture from the next. Trackpad inertia and
// continuous wheel spins emit events far more often than this.
const quietGap = 170;
const settleWindow = 220;
const easeInOutCubic = (t: number) => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const clamp = (value: number) => Math.max(0, Math.min(1, value));

function ownsInput(source: EventTarget | null, direction: number, keyboard = false) {
  if (!(source instanceof Element)) return false;
  if (source.closest("input,select,textarea,[contenteditable=true],[role=dialog]")) return true;
  if (keyboard && source.closest("a,button,summary")) return true;
  for (let node: Element | null = source; node && node !== document.documentElement; node = node.parentElement) {
    if (node instanceof HTMLElement && /auto|scroll/.test(getComputedStyle(node).overflowY)
      && node.scrollHeight > node.clientHeight + 2
      && (direction < 0 ? node.scrollTop > 0 : node.scrollTop + node.clientHeight < node.scrollHeight - 1)) return true;
  }
  return false;
}

export function createJourneyStepper(options: StepperOptions): JourneyStepper {
  let frame = 0;
  let moving = false;
  let token = 0;
  let lastWheel = -Infinity;
  let wheelLevel = 0;
  let gestureUsed = false;
  let nativeInputAt = -Infinity;
  let lastY = scrollY;
  let complete = () => {};
  let settledAt = -Infinity;
  let holdUntil = 0;
  let heldY = 0;

  const docked = (stops: number[]) => stops.findIndex(stop => Math.abs(stop - scrollY) <= tolerance);

  /** Where input in this direction travels, or undefined when native scrolling owns it. */
  const plan = (direction: 1 | -1): Target | undefined => {
    if (!options.enabled()) return;
    const stops = options.stops();
    if (!stops.length) return;
    const y = scrollY;
    const last = stops.length - 1;
    const from = docked(stops);
    const at = from < 0 ? undefined : from;
    if (direction > 0) {
      // Approaching from above: one gesture glides to the first stop, which
      // also catches fast spins before they can overshoot the entrance.
      if (y < stops[0] - tolerance) return stops[0] - y <= innerHeight ? { y: stops[0], index: 0, from: at } : undefined;
      if (y > stops[last] + tolerance) return;
      let current = 0;
      stops.forEach((stop, index) => { if (stop <= y + tolerance) current = index; });
      if (current >= last) return;
      const hidden = options.overflow?.(current) ?? 0;
      // Long content is read before leaving it, never skipped.
      if (hidden > tolerance) return { y: y + Math.min(hidden, innerHeight * .6) };
      return { y: stops[current + 1], index: current + 1, from: at };
    }
    if (y > stops[last] + tolerance) return y - stops[last] <= innerHeight ? { y: stops[last], index: last, from: at } : undefined;
    if (y < stops[0] - tolerance) return;
    let previous = -1;
    stops.forEach((stop, index) => { if (stop < y - tolerance) previous = index; });
    return previous < 0 ? undefined : { y: stops[previous], index: previous, from: at };
  };

  const finish = (id: number, index?: number, heavy = false) => {
    if (id !== token) return;
    frame = 0;
    moving = false;
    settledAt = performance.now();
    lastY = heldY = scrollY;
    options.onMoving?.(false);
    if (index !== undefined) options.onArrive?.(index);
    // A bespoke transition (the entrance reveal) ends in a burst of layout and
    // rendering. On a slow device that delays the queued tail of the same
    // gesture, so restart the window once that work has been painted.
    if (heavy) requestAnimationFrame(() => requestAnimationFrame(() => {
      if (id === token && !moving) settledAt = performance.now();
    }));
  };

  const cancel = () => {
    if (!frame) return;
    cancelAnimationFrame(frame);
    finish(token);
  };

  const travel = (target: Target) => {
    cancelAnimationFrame(frame); frame = 0;
    const id = ++token;
    moving = true;
    options.onMoving?.(true);
    const custom = target.index !== undefined && target.from !== undefined ? options.transition?.(target.from, target.index) : undefined;
    if (custom) { custom.then(() => finish(id, target.index, true), () => finish(id, target.index, true)); return; }
    const start = scrollY;
    const distance = target.y - start;
    if (Math.abs(distance) < 1) { finish(id, target.index); return; }
    // Long journeys take a little longer but never feel sluggish.
    const duration = Math.min(1100, Math.max(620, 380 + Math.abs(distance) * .4));
    const began = performance.now();
    const step = (now: number) => {
      if (id !== token) return;
      const progress = clamp((now - began) / duration);
      scrollTo({ top: start + distance * easeInOutCubic(progress), behavior: "instant" });
      if (progress < 1) frame = requestAnimationFrame(step);
      else finish(id, target.index);
    };
    // Hidden pages receive no animation frames; never leave input locked.
    complete = () => { cancelAnimationFrame(frame); step(Number.POSITIVE_INFINITY); };
    frame = requestAnimationFrame(step);
    if (document.hidden) complete();
  };

  const wheel = (event: WheelEvent) => {
    if (event.ctrlKey || event.metaKey || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
    const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1);
    if (!delta) return;
    const size = Math.abs(delta);
    const gap = event.timeStamp - lastWheel;
    // A rising delta after inertia has decayed is a new swipe, even if the
    // trackpad never paused between the two.
    const accelerating = !moving && wheelLevel > 0 && size > wheelLevel * 1.8 && size - wheelLevel > 12;
    if (gap > quietGap || accelerating) gestureUsed = false;
    wheelLevel = gap > quietGap ? size : wheelLevel * .6 + size * .4;
    lastWheel = event.timeStamp;
    // Arrival work can delay queued events past the quiet gap; anything this
    // close to an arrival is still the gesture that caused it.
    const settling = event.timeStamp - settledAt < settleWindow;
    // Everything during a move, and the rest of the gesture that started it,
    // is consumed so it cannot carry on as native scrolling.
    if (moving || gestureUsed || settling) {
      if (event.cancelable) event.preventDefault();
      // Once Chrome has latched a gesture as native, its remaining packets
      // cannot be cancelled; hold the arrived stop until that tail goes quiet.
      else if (!moving) holdUntil = Math.min(performance.now() + quietGap, settledAt + 700);
      gestureUsed = true;
      return;
    }
    if (ownsInput(event.target, delta)) return;
    const target = plan(delta > 0 ? 1 : -1);
    if (!target) { nativeInputAt = performance.now(); return; }
    // A non-cancelable packet still moves one stop; the tween overrides the
    // native movement frame by frame, and the hold absorbs what follows.
    if (event.cancelable) event.preventDefault();
    gestureUsed = true;
    travel(target);
  };


  const keyboard = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    const direction = event.key === "ArrowDown" || event.key === "PageDown" || (event.key === " " && !event.shiftKey) ? 1
      : event.key === "ArrowUp" || event.key === "PageUp" || (event.key === " " && event.shiftKey) ? -1 : 0;
    if (!direction) {
      if (event.key === "Home" || event.key === "End") cancel();
      return;
    }
    if (ownsInput(event.target, direction, event.key === " ")) return;
    if (moving) { if (options.enabled()) event.preventDefault(); return; }
    const target = plan(direction);
    if (!target) { nativeInputAt = performance.now(); return; }
    event.preventDefault();
    if (!event.repeat) travel(target);
  };

  const scroll = () => {
    if (moving) return;
    if (performance.now() < holdUntil && Math.abs(scrollY - heldY) > 1) {
      scrollTo({ top: heldY, behavior: "instant" });
      return;
    }
    const y = scrollY;
    const previous = lastY;
    lastY = y;
    // A native fling that began outside the stops (or a smooth wheel scroll
    // already in flight) must not sail through the journey unguided.
    if (performance.now() - nativeInputAt > 900 || !options.enabled()) return;
    const stops = options.stops();
    const last = stops.length - 1;
    if (last < 0) return;
    if (previous < stops[0] - tolerance && y > stops[0] + tolerance) travel({ y: stops[0], index: 0 });
    else if (previous > stops[last] + tolerance && y < stops[last] - tolerance) travel({ y: stops[last], index: last });
  };

  const navigate = () => { holdUntil = 0; cancel(); };
  const pointer = () => { holdUntil = 0; };
  const visibility = () => { if (document.hidden && frame) complete(); };

  addEventListener("wheel", wheel, { passive: false });
  addEventListener("keydown", keyboard);
  addEventListener("scroll", scroll, { passive: true });
  addEventListener("popstate", navigate);
  addEventListener("pointerdown", pointer, { passive: true });
  document.addEventListener("visibilitychange", visibility);

  return {
    go(index: number) {
      const stops = options.stops();
      if (stops[index] === undefined) return;
      const from = docked(stops);
      travel({ y: stops[index], index, from: from < 0 ? undefined : from });
    },
    destroy() {
      token++;
      cancelAnimationFrame(frame);
      if (moving) options.onMoving?.(false);
      removeEventListener("wheel", wheel);
      removeEventListener("keydown", keyboard);
      removeEventListener("scroll", scroll);
      removeEventListener("popstate", navigate);
      removeEventListener("pointerdown", pointer);
      document.removeEventListener("visibilitychange", visibility);
    },
  };
}
