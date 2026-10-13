# 13 October 2026 — Next.js security patch and CI hygiene

- Started from main `df758b78b303d1cfbb876d11e6a1f719c5f6feb2` on `codex/next-16-3-8-patch`; the only open PR (#72) touches no dependency, workflow or Vercel configuration files. Preserved the original dirty checkout.
- Pinned Next.js and eslint-config-next to 16.3.8; refreshed the lockfile's matching Next packages and source-map-js to 1.2.2. Node 24.21.0 and pnpm 11.19.0 remain unchanged. IDs: SEC-06, INF-05, REL-06.
- Limited cancellation to pull-request events in the three workflows, preserving action SHAs and permissions. Removed the two obsolete deploymentEnabled branch entries; regions remains `["bom1"]`. No hosted settings, database access or operational change.
- PASS: frozen dependency installation, production audit (no known vulnerabilities), lint, types, 2,402 unit tests and 81-page production build. Browser and exact-head CI receipts are recorded in the draft PR body after execution. Owner merges.
