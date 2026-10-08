# Restricted staff setup — final handoff

8 October 2026. BL-AUTH-01/05/06, BL-RPT-01/03; ORG-043/044/046–048.

## Current reconciliation after #51 and #52

The organizer merged [PR #51](https://github.com/xpexellent-dotcom/msrc-2027/pull/51)
at `4952e5a4c27c718ecb07b6a78f8d79f21f515588`, then
[PR #52](https://github.com/xpexellent-dotcom/msrc-2027/pull/52) at current main
`12bcc5d9c3611281c3f13c03e207cc82ad076d09`. The latter includes the reviewed
`4eb38b39490090961c2ebb137b550f52ce7f3d06`, whose seven substantive CI jobs,
Vercel and Preview Comments passed. The screenshot-reviewed filter source and
original assertions are retained. The main application/SQL/test/CI tree matches
that tested head; this handoff reconciliation changes documentation only.

#50 incorporates current main and preserves both journals and all failed
receipts. Fresh exact-head checks must pass before its organizer merge. Final
merged-main CI and owned current Production/alias proof, plus live EN/AR blank
staff sign-in, Programme/Media filter and closed API checks, remain pending that
merge. No authenticated staff DOM or new password/TOTP operation is requested.
Participant collection and cleanup remain closed; the new migration and a
cleanup scheduler have not been installed by this task.

All checkpoints below retain their original captured facts. In particular,
`b1c3763`, proofs `7100a053...`/`2b3ecf58...`, `e236832`, `2c73fff` and `e90fac54`
are earlier observations. Their uses of current/draft/unmerged refer to those
checkpoints; they do not assert the current serving deployment or session.
Original STOP/403, cancelled browser and failed filter/age receipts are not
reclassified or replaced by later successes.

## Captured release after #45

[PR #45](https://github.com/xpexellent-dotcom/msrc-2027/pull/45) was merged by the
organizer at 15:52:30 UTC. Its reviewed head was
`d1fca260fcdf466b0a9ad1b69387a0ddfb4c8bfd`; merged main is
`b1c3763a062f12fa2ae419b2645dd48b34eb17a7`, with parents `20a11ec68...` and
`d1fca260...`. Earlier statements that #45 is draft describe historical checkpoints.
No merge, hosted migration, bootstrap, password or setting operation occurred in
this verification/handoff task.

| Check | Observed result |
| --- | --- |
| Merged-main CI | PASS: all seven substantive jobs and Vercel SUCCESS on exact main. [Foundation 37804314161](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37804314161), [Staff 37804314351](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37804314351), [Participant 37804314206](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37804314206). No Preview Comments check was observed on main. |
| Owned serving deployment | PASS at 18:55:29.647 UTC: `dpl_FpfqUAg2VRaJc49TQQ6w413DA5Bf` is READY/current Production at exact merged main, owned project/team/repository and apex/www aliases. Read-only proof `7100a053-de20-4a3a-b975-c9749e53d212`, seven GET requests. |
| Server gates | Staff portal true; password-change false; participant flag absent/default false. No environment variable changed. |
| Anonymous live boundaries | PASS at 18:44:13.588 UTC, proof `2b3ecf58-d182-4ed0-b2ae-473106dd8d67`: 27 GET requests, EN/AR staff sign-in 200/private/noindex/RTL, Security 404, staff privileged APIs 403, participant and all 15 operational APIs 503, robots exclusion and no public staff navigation links. |
| Database/account operations | NOT RUN in this task. The immutable nine-version setup/owner-change history and database-first feature closure remain the separately recorded historical evidence. |

Serving-source ownership comes from the provider readback, independently of the
anonymous HTTP probe. This task does not inspect signed-in DOM, cookies, JWTs,
passwords, TOTP seeds/codes, or certify live axe/native Arabic-reader approval.
All provider/HTTP probes were read-only; no real email was sent.

The earlier successful provider capture at 16:01:00.416 UTC remains historical.
A subsequent source-binding refresh STOPPED at 18:44:05.356 UTC before gate reads
(proof `96acaaca-7b1f-42b8-887c-4a339a36aa17`); a separate bounded GET at
18:48:37.741 UTC confirmed HTTP 403 (proof
`6f51435c-bc8e-430e-88c2-1a53609dfce3`). The organizer updated the private token,
then the final read above passed. Original STOP/403 receipts remain unchanged;
no automatic retry, closure, Auth attempt or setting operation occurred.

The fresh main runs passed 2,312 unit cases/54 files; public 457 with 29 configured
skips; synthetic security lab 81; Contact 44; staff 32 closed, 32 enabled/copy with 6
skips, 26 password-change with 2 skips and 6+6 independent-gate checks; participant
26 closed and 54 enabled; native staff 26/participant 19; Foundation 75 integrations
in 8 files. Each of three database jobs passed 906 SQL assertions/12 files, clean
lint/advisors and disposable-stack teardown. All four browser artifacts uploaded.
Configured optional repetition/cold passes and skips were not counted as passes.

## Completed participant browser rerun

The pre-merge draft-head participant workflow had a 15-minute cancellation during
attempt 1. Ubuntu APT fetched 21.5 MB in 11m01s at 32.5 kB/s; the 7,472 kB
`fonts-wqy-zenhei` interval accounted for 8m24s. Browser CDN downloads took about
six seconds. Logs cannot distinguish mirror congestion from that runner's
network path. Closed-route26 passed; enabled25/54 had completed before cancellation.
The remaining 29 were not claimed as passes and its evidence upload was skipped.

The organizer authorized one specific browser-job rerun at the same reviewed
head. [Attempt 2 job 113391919266](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37786524299/job/113391919266)
finished SUCCESS at 15:35:00 UTC in 8m17s: **26 closed-route + 54 synthetic enabled
tests PASS**, zero failures/skips. Enabled coverage comprised18 desktop,18 tablet
and18 mobile cases, retaining EN/AR, keyboard, locale preservation and axe
assertions. Installation took 20s; the APT batch fetched in one second at 37.5 MB/s.
Artifact `11560707402` uploaded successfully (247,035 bytes). Assertions,
workflow, timeout and zero test retries were unchanged.

GitHub carried forward the earlier native success under a new result ID, retaining
its original 21 steps, runner identity and 13:42:49–13:45:25 UTC execution times.
The database job did not execute again; Foundation/Staff stayed on attempt 1.
The exact pre-merge head's final seven substantive checks, Vercel and Preview
Comments passed. This is distinct from the fresh merged-main run above.

Both attempts' receipts, annotations and full logs are retained, with verified
copies outside the repository, restricted to the Windows account and marked
read-only. Original cancelled log SHA-256:
`3be211b9ec2419c4dd0d05f61959bc2ded6244dcd79e03201c2143c44be2ca9d`.
Successful rerun log SHA-256:
`9224c672d11ae5f386abe07b8a3fd812f01e9875a1177cb4d7db3c321b5167de`.
The failed receipt is not relabelled or overwritten.

## Staff access and remaining gates

The owner completed password rotation and new-password/TOTP sign-in on their own
device. Separately reviewed native evidence captured at 12:01:51.918 UTC confirmed
the committed/audited change, retained verified authenticator identity and role,
old native/application session revocation and a fresh password/TOTP session inside
the existing idle/absolute limits. That captured session's freshness is not asserted
indefinitely. The frozen verifier STOP is preserved separately; a normal provider
challenge can advance the retained factor timestamp.

There is one shared EN/AR staff sign-in. Database roles determine assurance and
permitted tools; server/database checks enforce access. EN/AR role guidance and
simplified invitation wording from [PR #49](https://github.com/xpexellent-dotcom/msrc-2027/pull/49)
are live. Removed explanatory paragraphs did not change session expiry,
peer recovery, two-admin/self-protection, or auditing safeguards.

- Restricted first-admin setup is complete; no additional account or invitation
  was created during this handoff. The second designated admin's private inputs
  and mutual-recovery UAT remain outstanding before paired administration opens.
- Password changes remain closed after the completed owner operation. A future
  reopening requires a new reviewed attempt with corrected factor-retention
  verification. Never replay the completed change, migrations or bootstrap.
- Participants and all unrelated operational workflows remain closed. Age 18
  enforcement and never-verified 30-day cleanup are prepared in separate draft
  [PR #51](https://github.com/xpexellent-dotcom/msrc-2027/pull/51). All seven
  substantive CI jobs, Vercel and Preview Comments passed at exact head
  `2c73fff30bf4d3ca6bc225489134b19f05aa9bea`. That work is not merged, activated
  or cleared for live delivery.
- Signed-home controlled DOM, live axe, own-device cross-role/mutual-recovery UAT
  and native Arabic-reader approval are not established by these anonymous probes.

## Separate closed participant foundation

PR #51 enforces an explicit 18+ declaration in EN/AR before account/email work,
bound to private database admission proof. It collects no date of birth and does
not independently verify age. A separate default-off database-operator worker
erases only eligible never-verified accounts at least 30 days old; no scheduler is
installed. Hosted admission remains closed. Its sole new migration
`20261008160137_participant_age_retention.sql` has not been applied to production.

Exact-head [Foundation](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37826449390),
[Participant](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37826449469)
and [Staff](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37826449461)
runs passed 2,375 units/58 files, lint/types and a 79-page build; public 457 with
29 configured skips; lab 81; Contact 44; participant 26 closed +62 enabled cases
with four intentional skips; staff 32 closed +32 enabled/six skips, password-change
26/two skips and both six-case independent gate suites; native participant 25/staff
26. Each database job passed 1,023 SQL assertions/13 files, including
117 new age/retention cases, clean lint/advisors and disposable teardown.
Foundation integrations passed 80/80, including five cleanup concurrency cases.
All four browser artifacts uploaded. Optional cold repetitions were skipped,
not counted as passes. Prior failures remain preserved outside the repository.

The first documentation head `f7bc82c884529f51a55af082c3797c993dbfdb31` failed
one existing public-filter assertion in
[Foundation 37807214814](https://github.com/xpexellent-dotcom/msrc-2027/actions/runs/37807214814)
(456 passed, 29 configured skips; lab not reached). Its receipt, trace and
screenshot remain preserved; that head is not reported green or rerun.
The separate hydration fix in draft
[PR #52](https://github.com/xpexellent-dotcom/msrc-2027/pull/52) passed all seven
substantive CI jobs, Vercel and Preview Comments at exact head
`e90fac54f2c8b70bee1f8c67e1d5ec0f693ee252`: public 465 with 29 configured skips
and lab 81. The original assertions remain; no retries or timeout increases were
added. That fix is not merged or deployed. These draft results are separate from
merged-main CI and the current live boundaries.

## Remaining participant-launch prerequisites

1. Review the sole pending `20261008160137_participant_age_retention.sql` against
   actual hosted state and the existing migration ledger. Establish a fresh
   backup and isolated restore proof before a separately authorized application.
   Do not replay the nine earlier migrations or bootstrap; resolve any legacy
   accounts without age proof without fabricating a declaration.
2. Approve retention exceptions and native/provider-log handling. Establish the
   restricted cleanup operator, scheduler, monitoring and failure procedure.
   No scheduler is installed here. Keep current deletion and ever-verified
   records separately from database backups; test their reconciliation on restore
   so erased accounts cannot return and verified accounts cannot be erased.
3. Verify managed Auth/hook boundaries, approved EN/AR notices and native Arabic
   review, privacy/provider/location requirements, support and recovery ownership,
   email credentials and the shared volume cap. Pass controlled inbox, recovery,
   mobile/keyboard/screen-reader and human UAT; synthetic CI is separate evidence.
4. After those operating gates pass, verify a bounded dry-run, then separately
   authorize cleanup and participant database/server enablement with exact
   serving-deployment and live checks. Participant collection cannot open while
   cleanup is disabled. Staff pairing, password change, registration and all
   other operational gates remain separate.

See [the detailed participant guide](PARTICIPANT_AGE_RETENTION.md). No hosted,
account, password, email or cleanup operation is performed by this handoff.

## Rollback and custody

Keep the protected setup/backup/restore receipts, operator source hashes, immutable
migration ledger, audit and revocation records. The execution record lists each
of the nine already-applied migrations individually; no migration is replayed.
No credential, identity input or secret location belongs in this handoff.

If staff access must close, use the separately reviewed database-first closure
procedure, then close the matching server gate and verify the exact owned closed
deployment and anonymous denials. Do not reopen participants or unrelated gates.
Closing a feature does not reverse a committed password: never restore the old
password, delete/re-enroll the authenticator, self-reset or bypass peer recovery.
Presentation rollback is a reviewed PR #49 revert/redeployment with all security
and audit records retained. No rollback action is performed by this document.

Detailed history and procedures:
[setup execution](STAFF_SETUP_EXECUTION.md),
[password resumption](STAFF_PASSWORD_RELEASE_RESUMPTION.md),
[stopped first release](STAFF_PASSWORD_RELEASE_EXECUTION.md),
[backup/restore](STAFF_BACKUP_RESTORE.md),
[activation checklist](STAFF_ACTIVATION_CHECKLIST.md).
