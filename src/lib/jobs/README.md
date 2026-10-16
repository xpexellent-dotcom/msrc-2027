# Durable job boundary

The closed email outbox foundation implements persisted enqueue, leased claims,
bounded retries and fenced completion. `outbox.server.ts` accepts a pluggable store
and sender; `outbox-store.server.ts` supplies service-only database RPC transport.
The protected POST route has no installed scheduler or business event producer.

Only synthetic recipients and the synthetic versioned template are accepted in
this slice. See [EMAIL_OUTBOX.md](../../../docs/features/EMAIL_OUTBOX.md) for states,
transactional producer integration, quotas, replay and the unresolved O10 trigger.
Other domain workers remain separate backlog work; operational workflows stay closed.
