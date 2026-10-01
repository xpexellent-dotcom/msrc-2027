export const cinematicRequestEvent = "msrc:watch-opening-film";
export const cinematicPlaybackEvent = "msrc:cinematic-playback";
export type CinematicPlayback = { active: boolean; explicit: boolean };

export function setCinematicPlayback(detail: CinematicPlayback) {
  window.dispatchEvent(new CustomEvent<CinematicPlayback>(cinematicPlaybackEvent, { detail }));
}
