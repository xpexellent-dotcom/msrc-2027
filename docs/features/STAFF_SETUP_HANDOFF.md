# Restricted staff setup — final handoff

8 October 2026. BL-AUTH-01/05/06, BL-RPT-01/03; ORG-043/044/046–048.

## Current release

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
| Owned serving deployment | PASS at 16:01:00.416 UTC: `dpl_FpfqUAg2VRaJc49TQQ6w413DA5Bf` is READY/current Production at exact merged main, owned project/team/repository and apex/www aliases. Read-only proof `a892485f-b987-4158-9a6a-d1e7ca1e9680`. |
| Server gates | Staff portal true; password-change false; participant flag absent/default false. No environment variable changed. |
| Anonymous live boundaries | PASS at 15:57:32.544 UTC, proof `83dfbb40-5b04-4bc0-bd78-8e98db4e9f64`: 27 GET requests, EN/AR staff sign-in200/private/noindex/RTL, Security404, staff privileged APIs403, participant and all 15 operational APIs503, robots exclusion and no public staff navigation links. |
| Database/account operations | NOT RUN in this task. The immutable nine-version setup/owner-change history and database-first feature closure remain the separately recorded historical evidence. |

Serving-source ownership comes from the provider readback, independently of the
anonymous HTTP probe. This task does not inspect signed-in DOM, cookies, JWTs,
passwords, TOTP seeds/codes, or certify live axe/native Arabic-reader approval.
All provider/HTTP probes were read-only; no real email was sent.

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
  enforcement and never-verified 30-day cleanup are being implemented in a
  separate closed branch; its reviewed PR is pending. That work is not activation
  or clearance for live delivery.
- Signed-home controlled DOM, live axe, own-device cross-role/mutual-recovery UAT
  and native Arabic-reader approval are not established by these anonymous probes.

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
