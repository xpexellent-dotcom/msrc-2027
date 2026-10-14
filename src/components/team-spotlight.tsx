/** Decorative backdrop for the Team page: slowly drifting colour orbs. */
export function TeamSpotlight() {
  return <div className="team-backdrop" aria-hidden="true">
    <span className="team-orb team-orb--lilac" />
    <span className="team-orb team-orb--gold" />
    <span className="team-orb team-orb--violet" />
  </div>;
}
