/** ENG-094: completed one-shots release their layers instead of trailing a fast reader. */
function finiteAnimation(animation: Animation): animation is CSSAnimation {
  return animation instanceof CSSAnimation && animation.effect?.getTiming().iterations !== Infinity;
}

export function finishOneShotAnimations(owner: Element) {
  for (const animation of owner.getAnimations({ subtree: true })) {
    if (!finiteAnimation(animation)) continue;
    // Do not consume a research/speaker entrance which has never started.
    if (animation.playState !== "running" && !(animation.playState === "paused" && Number(animation.currentTime) > 0)) continue;
    animation.finish();
  }
}

function offscreen(animation: Animation) {
  const target = (animation.effect as KeyframeEffect | null)?.target;
  if (!(target instanceof Element)) return true;
  const rect = target.getBoundingClientRect();
  return rect.bottom <= 0 || rect.top >= window.innerHeight || rect.right <= 0 || rect.left >= window.innerWidth;
}

/** Only arrivals/state changes call this; there is no scroll or animation-frame loop. */
function enforceBudget(journey: Element) {
  const running = journey.getAnimations({ subtree: true }).filter((animation) => animation instanceof CSSAnimation && animation.playState === "running");
  const excess = running.length - 10;
  if (excess <= 0) return;
  // Preserve visible reading content first. Decorative vectors can settle immediately
  // when several independent arrivals overlap; the belt retains its explicit controls.
  const candidates = running.filter(finiteAnimation).map((animation, index) => ({
    animation, index, away: offscreen(animation), decorative: animation.animationName === "flow-draw",
  })).sort((a, b) => Number(b.away) - Number(a.away) || Number(b.decorative) - Number(a.decorative) || a.index - b.index);
  for (const { animation } of candidates.slice(0, excess)) animation.finish();
}

/** One shared observer handles non-Reveal owners; Reveal retains its own observer. */
export function observeHomeMotionBudget() {
  const journey = document.querySelector(".homepage-journey");
  if (!journey || !window.IntersectionObserver || !window.MutationObserver) return () => {};
  let queued = false;
  let active = true;
  const schedule = () => {
    if (queued || !active) return;
    queued = true;
    queueMicrotask(() => { queued = false; if (active) enforceBudget(journey); });
  };
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) if (!entry.isIntersecting) finishOneShotAnimations(entry.target);
    schedule();
  }, { threshold: 0 });
  for (const owner of journey.querySelectorAll(".hero-content, .research-artwork, .speaker-atmosphere, .history-count")) observer.observe(owner);
  const mutations = new MutationObserver(schedule);
  // ScrollScenes writes style only, so its reversible per-scroll motion never
  // invokes this observer. These attributes change only at an arrival or settle.
  // In particular, do not observe CountUp's per-frame text-node replacements.
  mutations.observe(journey, { subtree: true, attributes: true, attributeFilter: ["class", "data-running", "data-counting", "data-reveal-state"] });
  journey.addEventListener("animationstart", schedule, true);
  schedule();
  return () => {
    active = false;
    mutations.disconnect();
    observer.disconnect();
    journey.removeEventListener("animationstart", schedule, true);
  };
}
