# Reusable feature, review, and continuity prompts

## Implement one feature

Replace the bracketed fields before sending.

```text
Continue MSRC 2027. Read AGENTS.md and docs/PROGRESS.md.
Implement [FEATURE] using source requirement IDs [IDS] from v0.5.
The intended milestone/release is [MILESTONE/RELEASE].

Read the relevant source sections and decision register. Define the actor,
scope, source states, validation, resulting states, audit/email effects,
privacy/retention implications, and acceptance criteria in a short feature
note. Preserve unresolved business values as closed configuration gates.

Implement one complete, reviewable slice using the current stack. Include
the relevant server/database/storage authorization, failure and recovery
states, concurrency/idempotency, language/accessibility behavior, immutable
records, and durable jobs. Tests should address real behavior and risks.

Run relevant checks, inspect the result, and update docs/PROGRESS.md.
Report evidence, blocked decisions, release state, and the next task.
```

## Review a change

```text
Review [BRANCH/CHANGE] against source requirement IDs [IDS].
Prioritize incorrect behavior, authorization leaks, data loss, payment/capacity
errors, review anonymity, accessibility, and source-rule drift.
Check both permitted and forbidden actions. Distinguish code inspection from
executed tests. Return findings with the affected file, scenario, consequence,
and concrete fix. Make routine scoped fixes that this task authorizes and
record meaningful verification. Do not broaden the product scope.
```

## Resume work in a new chat

```text
Resume MSRC 2027 in this repository. Read AGENTS.md, docs/PROGRESS.md,
docs/DECISIONS.md, and the latest relevant feature notes. Inspect actual Git
state and recent changes. Summarize what is completed with evidence, what is
blocked, and the next smallest unblocked task. Continue that task within the
current milestone using synthetic data unless a live task is explicitly
authorized. Do not assume old chat context or document checkboxes prove a
deployed feature.
```

## Apply a new organizer decision

```text
New organizer decision: [EXACT DECISION].
Source/date/approver: [SOURCE].
Update docs/DECISIONS.md and affected current requirements. Preserve the old
source snapshot and log what was superseded. Identify affected code, tests,
content, configuration, migrations and release gates. Implement the authorized
scope, keeping unrelated flows unchanged. Update progress with evidence.
```
