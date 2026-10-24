# Check-in outage fallback (ENG-082, CHK-05)

Online scanning in **Staff portal → Check-in** is the normal method. Use this
procedure only when the internet, the portal or Supabase is unavailable at the
door. It is an engineering default until the organizers confirm who does each
step; nothing here opens registration or check-in.

## Before each conference day

1. A named Super Admin, signed in with their authenticator, opens
   **Check-in**, selects the day and presses **Download roster (CSV)** in the
   **Outage fallback** section.
2. The file holds only the 12-character reference code and display name of
   every ticket that is admissible for that day at the moment of export. It has
   no email, identity document, QR credential or ticket secret. The export is
   recorded in the attendance audit log with a count only.
3. Keep the file on **one** organizer-approved device. Do not email it, print
   extra copies, or upload it to chat or shared drives. If it must be printed,
   keep the single copy with the Super Admin who exported it.
4. Admissibility can change after the export (cancellations, revocations,
   suspensions). The roster is a fallback reference, not a fresh decision.
   Export it as close to opening as practical.

## During an outage

1. Door staff stop retrying the scanner once the portal shows it is offline.
2. For each attendee, find their reference code on the roster (it is printed
   under the QR code on the ticket) and write one line per person:
   **reference, Riyadh time (HH:MM), staff name or initials**.
3. Admit only people whose reference is on the roster. Anyone else waits for the
   registration team, as they would after a refused scan.
4. Resume online scanning as soon as the connection returns. People already
   written on paper do not need to be scanned again.

## Reconciliation (same day, after service returns)

1. The Super Admin types or pastes the paper lines into **Reconcile offline
   records** (or opens a CSV with columns `reference,time,recorder`; a header
   row is optional), selects the same conference day, presses **Check rows**,
   then **Reconcile records**. Up to 2,000 rows per batch.
2. Each row is processed with the same locks and admission rules as an online
   scan:
   - admissible and not yet checked in → recorded with method **offline**, the
     uploader as performer, the paper time (clamped to that day and never later
     than now) and the recorder text;
   - already checked in online → left unchanged and reported;
   - a check-in that a Super Admin had undone → listed for review, not restored;
   - unknown, revoked, unpaid, suspended or malformed → listed for review.
3. If the page loses its connection while reconciling, press **Reconcile
   records** again without editing the rows. The same batch ID is reused and the
   saved result is returned instead of being applied twice.
4. Resolve every row marked for review with the registration team. Use the
   normal online check-in for any person who should still be recorded.

## Destroying the roster

After reconciliation is complete and reviewed, the Super Admin deletes the CSV
from the device (including downloads and trash/recycle bin) and destroys any
printed copy and the paper sheets. Record the deletion in the event log.
