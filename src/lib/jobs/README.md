# Durable job boundary

The closed email outbox foundation implements persisted enqueue, leased claims,
bounded retries and fenced completion. `outbox.server.ts` accepts a pluggable store
and sender; `outbox-store.server.ts` supplies service-only database RPC transport.
The protected GET/POST route shares a fail-closed Bearer secret boundary. GET is
the Vercel Cron bridge; HEAD never runs work. The source cron entry is daily for
Hobby compatibility while the Vercel plan remains unconfirmed; every delivery
switch stays off and both daily caps default to zero.

Registration producers now enqueue five DRAFT English templates inside the
business transaction; the generic service enqueue API stays synthetic-only.
Console/test delivery also remains synthetic-only. See
[REGISTRATION_EMAILS.md](../../../docs/features/REGISTRATION_EMAILS.md) for the full
owner-review text, production gates and O10 plan constraints, and
[EMAIL_OUTBOX.md](../../../docs/features/EMAIL_OUTBOX.md) for states, quotas and replay.
Other domain workers remain separate backlog work; operational workflows stay closed.
