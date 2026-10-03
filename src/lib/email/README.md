# Email library boundary

`isolated-staff-preview.server.ts` is an optional Windows loopback test bridge for the
synthetic staff security preview. It passes one generated staff code through bounded
stdin to an ignored local helper. The helper owns the organizer-approved self-recipient,
private Windows-encrypted credential and persistent test-send limits. Neither address
nor credential is committed or sent to the browser. No code is returned by the isolated
delivery API; the default synthetic inbox remains available without this opt-in.

This is not a production email adapter. Missing configuration/helper, deployment/CI,
malformed helper output, timeout or delivery failure denies delivery without fallback
or automatic retry. SMTP acceptance is distinct from observed inbox receipt. Production
provider/SMTP, custody, privacy/location and release approval remain unresolved; every
operational workflow and managed staff readiness stays closed.
