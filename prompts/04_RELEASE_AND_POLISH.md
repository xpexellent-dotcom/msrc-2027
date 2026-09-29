# Release and polish prompts

## Audit a release candidate

```text
Audit MSRC 2027 release candidate [REVISION] for [SPECIFIC WORKFLOW].
Read docs/ACCEPTANCE_AND_RELEASE.md, current decisions and exact source IDs.
For each applicable gate, record PASS, FAIL, BLOCKED or NOT TESTED, evidence,
owner, and remediation. Verify ownership, production configuration, relevant
permissions, bilingual/RTL/accessibility, failure paths, email, monitoring,
backup/restore, and the operational runbook. Never infer payment readiness
from a mock or consent/privacy readiness from a selected provider.
Prepare a concrete release and rollback checklist. Do not open the workflow
unless the current task authorizes that action and its requirements are met.
```

## Publish an approved release

```text
Publish the approved [PUBLIC SITE / WORKFLOW] release at [APPROVED REVISION]
using the established organizational deployment target. First verify the
recorded release evidence and any environment differences. Keep other
operational flags closed. Execute the authorized deployment steps, run
production smoke checks, and record the actual URL, revision, feature flags,
observed results, known limitations and rollback path. Stop and explain any
material mismatch between the approved candidate and the deployment target.
```

## Polish an existing experience

```text
Improve [PAGE OR FLOW] in the current MSRC 2027 build.
Inspect the actual result on desktop/mobile and English/Arabic before editing.
Prioritize concrete usability, visual hierarchy, copy, keyboard/accessibility,
motion, media performance, and failure-state issues. Preserve the approved
brand and product rules. Implement a focused set of improvements, compare the
result, run relevant checks, and update progress. Avoid unrelated rewrites.
```
