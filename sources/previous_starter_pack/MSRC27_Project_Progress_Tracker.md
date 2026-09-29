# MSRC 2027 — Project Board and Progress Tracker

## 1. Board columns

1. **Inbox**
2. **Decision Required**
3. **Backlog**
4. **Ready**
5. **In Progress**
6. **Code Review**
7. **Preview QA**
8. **Staging**
9. **Approval Required**
10. **Ready for Release**
11. **Released**
12. **Blocked**
13. **Archived**

A ticket may enter **Ready** only when its dependencies, acceptance criteria, and unresolved values are clear.

---

## 2. Labels

### Work type

- `type:decision`
- `type:feature`
- `type:bug`
- `type:security`
- `type:design`
- `type:content`
- `type:infrastructure`
- `type:migration`
- `type:test`
- `type:documentation`
- `type:operations`

### Product area

- `area:public-site`
- `area:cms`
- `area:auth`
- `area:registration`
- `area:payments`
- `area:abstracts`
- `area:review`
- `area:ai-assessment`
- `area:workshops`
- `area:hackathon`
- `area:3mt`
- `area:program`
- `area:check-in`
- `area:surveys`
- `area:certificates`
- `area:reporting`
- `area:privacy`
- `area:handover`

### Priority and state

- `priority:critical`
- `priority:high`
- `priority:normal`
- `priority:low`
- `blocked:tbd`
- `blocked:approval`
- `blocked:integration`
- `gate:public-launch`
- `gate:submission`
- `gate:registration-payment`
- `gate:event`
- `gate:certificate`

---

## 3. Feature issue template

```markdown
# [Feature name]

## Purpose

## Source requirements
- Requirement IDs:

## Scope

## Explicit exclusions

## Actors and permissions

| Actor | Allowed | Denied |
|---|---|---|

## States and transitions

## Data touched

## Validation and business rules

## Deadlines/timezone

## Files/storage

## Emails and background jobs

## Audit events

## Privacy/retention

## English/Arabic behavior

## Accessibility

## Failure and recovery states

## Security/RLS acceptance criteria

## Functional acceptance criteria

## Automated tests

## Manual staging UAT

## Release gate

## Dependencies

## Unresolved decisions

## Operational owner

## Rollback/data-reconciliation notes
```

---

## 4. Decision issue template

```markdown
# Decision: [Question]

## Why this decision is required

## Affected workflows

## Current confirmed constraints

## Options

### Option A
Benefits:
Risks:
Technical impact:
Operational impact:
Privacy/financial impact:

### Option B
Benefits:
Risks:
Technical impact:
Operational impact:
Privacy/financial impact:

## Recommendation

## Required approver

## Decision deadline

## Final decision

## Configuration/migration/documentation changes required
```

---

## 5. Pull request template

```markdown
## Summary

## Ticket

## Scope

## Exclusions

## Screens/routes

## Database changes
- [ ] No migration
- [ ] Migration included
- [ ] Grants reviewed
- [ ] RLS reviewed
- [ ] RLS allow/deny tests included

## Security
- [ ] Server authorization
- [ ] Direct-ID access tested
- [ ] No secret/public-env exposure
- [ ] File access reviewed
- [ ] Logs contain no sensitive data

## UX
- [ ] Mobile
- [ ] English
- [ ] Arabic RTL
- [ ] Keyboard
- [ ] Reduced motion
- [ ] Loading/empty/error states

## Operations
- [ ] Audit events
- [ ] Email jobs
- [ ] Feature flag
- [ ] Monitoring impact
- [ ] Runbook impact

## Checks run
- [ ] lint
- [ ] type-check
- [ ] unit tests
- [ ] database tests
- [ ] E2E
- [ ] production build

## Preview/UAT evidence

## Risks

## Rollback

## Blocked decisions
```

---

## 6. Milestone progress table

| Milestone | Requirements | Build | Tests | Staging | Released | Owner | Status |
|---|---:|---:|---:|---:|---:|---|---|
| M0 Governance |  |  |  |  |  |  |  |
| M1 Foundation |  |  |  |  |  |  |  |
| M2 Design system |  |  |  |  |  |  |  |
| M3 Public alpha |  |  |  |  |  |  |  |
| M4 CMS/public beta |  |  |  |  |  |  |  |
| M5 Auth/dashboard |  |  |  |  |  |  |  |
| M6 Abstract/review |  |  |  |  |  |  |  |
| M7 Registration/workshops |  |  |  |  |  |  |  |
| M8 Competitions |  |  |  |  |  |  |  |
| M9 Event operations |  |  |  |  |  |  |  |
| M10 Certificates/archive |  |  |  |  |  |  |  |
| M11 Handover |  |  |  |  |  |  |  |

---

## 7. Evidence-based feature score

- **0%** — no approved issue
- **20%** — requirements, states, and acceptance criteria approved
- **40%** — schema and interface skeleton
- **60%** — happy path works locally
- **75%** — permission, failure, and concurrency tests pass
- **90%** — staging UAT and operational review pass
- **100%** — production release, smoke test, monitoring, and runbook complete

---

## 8. Release log template

```markdown
# Release [version/date]

## Scope

## Included tickets

## Migrations

## Feature flags changed

## Production configuration changed

## Smoke tests

## Known limitations

## Monitoring focus

## Rollback deployment

## Data rollback/reconciliation notes

## Release approver

## Operational owner
```

---

## 9. Weekly review agenda

1. What was released?
2. What reached staging?
3. Which tests failed?
4. Which decisions are blocking work?
5. Which release gates remain closed?
6. Any security/privacy concerns?
7. Any production incidents or failed jobs?
8. Which three tickets are next?
9. Does the roadmap still match conference deadlines?
10. Are ownership, billing, renewals, and documentation still under organizational control?
