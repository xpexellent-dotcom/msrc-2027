# Participant profile — ENG-087 / ORG-067

The owner approved this requirement on 27–28 October 2026. It supersedes the
optional-only ENG-086 / ORG-066 rule for abstract, hackathon and 3MT submission.
Participants can still save any valid partial profile. Conference registration
and workshop booking have no profile-completeness prerequisite.

Requirements AUTH-05/06/07/08, ABS-01/12, HAC-01/03/10, TMT-01,
PRV-02/03/04/05/06, SEC-01/02/06, LOC-01/03 and ACC-01 apply.
See the [implementation receipt](../progress/2026-10-28-codex-profile-complete.md)
and [original profile receipt](../progress/2026-10-27-codex-participant-profile.md).

## Completion and editing

Completion requires a private picture, institution, status, full Arabic name,
ISO 3166-1 alpha-2 nationality, gender, date of birth establishing age 18 or older,
city (80 characters maximum), E.164 contact phone, and a saved identity document.
At least one specialty interest is required only while the edition's abstract
specialty catalog is nonempty. The card shows ten baseline items, or eleven with
configured specialties, and a complete state when all are present.

Status is one of Year 1–6, Internship, Clinical placement, Postgraduate, Residency,
or Faculty. The migration maps medical-student years, intern, resident and faculty
values to these choices; legacy other becomes null. Existing institution text moves
to `institution_other`. A listed `institution_id` and `institution_other` are
mutually exclusive. The bilingual Ministry-sourced catalog and accessible
combobox support EN/AR search, Arabic article/diacritic normalization and keyboard
selection. Other reveals a free-text field. Country names display in EN/AR while
only assigned ISO codes are stored. The phone picker starts at +966 and accepts
international E.164 contact numbers; ORG-016 still prohibits authentication phone
collection, SMS, phone verification and phone-based sign-in.

The editor supports removal and partial saving. New identity numbers, birth dates
and contact details remain in the current editor only; they are not placed in
browser persistent storage or the cross-language draft. Arabic names are RTL;
phone and identity inputs are LTR. Scientific specialty labels remain English/LTR.

## Private authority and submission enforcement

`PARTICIPANT_PROFILE_ENABLED` remains server-only and absent/false by default.
It controls profile editing, private avatar routes and profile display. Account,
abstract and competition release gates remain independent. No flag is changed by
this implementation. Missing new RPCs show `area-not-ready` and preserve sign-in.

Review-only migration `20261028120000_participant_profile_complete.sql` extends
the existing `msrc_participant.profile_details`; it creates no extra private table.
Forced RLS, no direct application-role grants, no client policies, exact native
session authorization, READ COMMITTED guards, per-participant advisory locks and
optimistic versions remain in force. The old scalar-save signature is removed.
The new server-only save RPC accepts an allowlisted JSON payload.

`msrc_participant.profile_complete(actor, edition)` checks current stored fields,
active avatar ownership and the configured specialty list. Final abstract and
competition submissions acquire the profile lock and check completion inside the
database transaction before proceeding. An incomplete profile returns the
distinct `profile_incomplete` state. Handlers also check the server-only completion
RPC; submit controls show a bilingual message linking to `/{locale}/my-msrc#profile`.
Draft saving remains available. Existing ownership, idempotency, deadlines,
evidence rules and immutable submission snapshots remain in place.

## Identity protection, staff access and deletion

Identity formats are National ID (10 digits starting 1), Iqama (10 starting 2),
and passport (6–20 alphanumeric characters). Profile identity uses the ORG-039
server key configuration: `REGISTRATION_IDENTITY_ENCRYPTION_KEYS`,
`REGISTRATION_IDENTITY_ACTIVE_KEY_VERSION`, and the separate
`REGISTRATION_IDENTITY_HMAC_SECRET`. AES-256-GCM uses a fresh IV and authenticates
owner, edition and document type. An edition/type/number HMAC supports uniqueness
and lookup without a database-only dictionary attack. Missing keys fail closed;
no key is generated or configured by this work. The active cipher key and HMAC
secret must differ. Retain the versioned keyring under the existing custody,
rotation, backup and restoration process before collecting real identifiers.

Plaintext identity numbers never enter a profile RPC or saved response. Only type
and last four characters return to participants and the existing audited staff
detail path. Authorized Super Admins and registration/workshop administrators see
the expanded private profile; no public profile, directory or export is added.
Registration's current identity storage is unaffected by this profile change.

Account erasure cascades through the existing profile FK. The existing profile
retention function deletes all scalar data, identity ciphertext, HMAC and mask by
the configured conference-end-plus-one-year deadline. Avatar deletion still uses
the durable Storage deletion queue, including replacement, removal, stale staging,
account deletion and retention. The existing authenticated outbox maintenance
drains it even when profile editing or mail is disabled. No scheduler is added or
enabled. Hosted worker execution, byte deletion, backup expiry and restore
suppression remain release checks; a metadata deletion is not byte-deletion proof.

## Policy and rollout

Owner-approved Privacy Policy v1.2 describes the required profile, submission
purposes, private access, contact-only phone and encrypted identity retention.
v1.0 and v1.1 remain archived; Terms remain v1.0. Short version URLs redirect to
the corresponding localized version. Deploy the hosted migration and switch
`msrc_participant.policy.privacy_version` to `v1.2` together: the existing readiness
check closes sign-up on a policy-version mismatch. No hosted migration, policy
setting, feature activation, announcement or real email is authorized here.

CI migration reset, strict SQL lint, pgTAP, two-connection database concurrency,
and human EN/AR UAT are required before activation. Local verification outcomes
and unrun checks are recorded in the receipt.
