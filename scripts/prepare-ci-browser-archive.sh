#!/usr/bin/env bash
set -euo pipefail

# The disposable Ubuntu runner's Azure mirror stalled before Playwright tests.
# Keep Ubuntu's suites, signing keys and package validation; change only its URI.
if [[ "${GITHUB_ACTIONS:-}" != "true" || "${RUNNER_OS:-}" != "Linux" || "${RUNNER_ARCH:-}" != "X64" ]]; then
  printf '%s\n' 'This preparation is restricted to the Ubuntu x64 CI runner.' >&2
  exit 1
fi
grep -qx 'ID=ubuntu' /etc/os-release
grep -qx 'VERSION_ID="24.04"' /etc/os-release

archive_ready=false
for archive_source in /etc/apt/sources.list /etc/apt/sources.list.d/ubuntu.sources; do
  if [[ -f "$archive_source" ]]; then
    sudo sed -i \
      -e 's|mirror+file:/etc/apt/apt-mirrors\.txt|https://archive.ubuntu.com/ubuntu/|g' \
      -e 's|http://azure\.archive\.ubuntu\.com/ubuntu/|https://archive.ubuntu.com/ubuntu/|g' \
      "$archive_source"
    if grep -Fq 'https://archive.ubuntu.com/ubuntu/' "$archive_source"; then archive_ready=true; fi
  fi
done
if [[ "$archive_ready" != "true" ]]; then
  printf '%s\n' 'Canonical Ubuntu archive was not configured; stop before browser setup.' >&2
  exit 1
fi
printf '%s\n' 'Browser dependencies use the canonical Ubuntu HTTPS archive with existing signing keys.'
