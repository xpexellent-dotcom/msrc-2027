# Email sending setup: Resend for no-reply@msrc2027.com

Runbook for connecting Resend's free plan so the website can later send email **from**
`no-reply@msrc2027.com` with replies going to `contact@msrc2027.com`.

Requirements: AUTH-02, ORG-015, ORG-016 (email-only notifications). Authority: organizer
request of 3 October 2026. Scope is account, DNS and secret setup only.

> **4 October Contact amendment:** ORG-028 records organizer-reported verified domain and
> Production-only Sending key plus approved Contact routing. The Contact adapter is now
> implemented but off by default. Use [Contact activation](contact-delivery.md) for the
> reviewed counter migration, server-only configuration, privacy/abuse checks and human
> delivery test. This setup runbook does not open authentication or approve its email
> provider/recovery/location gates. Its DNS observations below are dated 3 October;
> no DNS/provider/secret setting is changed by the Contact implementation task.

## Before you start

You need:

- Your Namecheap login (the account that owns `msrc2027.com`).
- Your Vercel login (the team that owns the MSRC 2027 project).
- About 30 minutes, plus waiting time for DNS (usually 15 minutes, up to 72 hours).
- Nowhere to store the key. **Do not** paste the API key into email, chat,
  documents, screenshots or this repository. It goes straight from Resend into Vercel.

## What the domain looks like today (checked 3 October 2026)

Read directly from Namecheap's own name servers (`dns1.registrar-servers.com`), which are
the servers the internet uses for this domain (BasicDNS):

| Host | Type | Value | Used by |
|---|---|---|---|
| `@` | A | `216.198.79.1` | Vercel website (bare domain, redirects to www) |
| `www` | CNAME | `faa763cc393bee28.vercel-dns-017.com.` | Vercel website |
| `@` | MX ×5 | `eforward1`–`eforward5.registrar-servers.com` (priorities 10/10/10/15/20) | Namecheap email forwarding |
| `@` | TXT | `v=spf1 include:spf.efwd.registrar-servers.com ~all` | Namecheap email forwarding (required by Namecheap) |
| `@` | TXT | `google-site-verification=…` | Google Search Console |
| `send` | — | nothing exists | free for Resend |
| `resend._domainkey` | — | nothing exists | free for Resend |
| `_dmarc` | — | nothing exists | free for an optional DMARC record |

**Will Resend break anything?** No, as long as you follow this runbook exactly. Every
Resend record goes on its own new host name (`send` and `resend._domainkey`, plus the
optional `_dmarc`). None of them touch `@` or `www`, so:

- the five forwarding MX records on `@` stay as they are, so `contact@` keeps forwarding;
- the forwarding SPF TXT on `@` stays as it is (you do **not** edit or merge it, because
  Resend's SPF lives on `send`, not on the bare domain);
- the Vercel `@` A record and `www` CNAME are untouched, so the website keeps working.

The **one** way to break forwarding is to change Namecheap's **Mail Settings** away from
**Email Forwarding**. Resend's own Namecheap guide tells you to pick *Custom MX*. Do not
do that on this domain; Namecheap says free Email Forwarding cannot run together with
another email service, so switching would replace the forwarding MX records. Step 4
explains what to do instead.

## Part 1. Create the Resend account and add the domain

1. Open <https://resend.com/signup> and sign up. Use an email address the organizing team
   controls long term (for example the address `contact@msrc2027.com` forwards to), not a
   personal one you may lose. Turn on two-factor authentication under your account
   settings once you are in.
2. The free plan is selected by default; you do not need a card. As of 3 October 2026
   Resend lists it as 3,000 emails a month, **100 emails a day**, 30-day log retention and
   a small number of domains. Check <https://resend.com/pricing> for today's numbers.
3. In the left menu click **Domains**, then **Add Domain**.
4. In **Name**, type exactly `msrc2027.com` (the bare domain, because you want to send from
   `no-reply@msrc2027.com`).
5. In **Region**, pick the region closest to most recipients. For participants mainly in
   Saudi Arabia, Europe (Ireland, `eu-west-1`) is the nearest choice Resend offers. This
   is also where message data is processed, which the privacy/data-location gate still
   has to approve. Treat the choice as permanent: changing it later means deleting and
   re-adding the domain and its DNS records.
6. Leave any **Custom Return Path** setting at its default (`send`). Click **Add**.
7. Resend now shows a table of DNS records. Keep this browser tab open. It will show one
   of two layouts, depending on how Resend set up the domain:
   - **Layout A (newer domains):** records of type **CNAME** on `send` (and possibly
     other names Resend shows), plus a **TXT** on `resend._domainkey`. No MX row.
   - **Layout B (older layout):** an **MX** and a **TXT** on `send`, plus a **TXT** on
     `resend._domainkey`.

   Resend's troubleshooting guide says domains created from August 2026 may get the CNAME
   layout. Follow whichever layout your screen shows; never mix them.

> **Copying values.** Each row in Resend has a copy button next to the value. Always use
> it. DKIM values are long and one wrong character makes verification fail.

## Part 2. Open Namecheap Advanced DNS

1. Sign in at <https://www.namecheap.com> and click **Domain List** in the left menu.
2. Find `msrc2027.com` and click **Manage** on its row.
3. Click the **Advanced DNS** tab at the top.
4. Check two things before changing anything, and take a screenshot of this page for
   your records (it shows the "before" state):
   - The **Host Records** table lists the `@` A record and the `www` CNAME from the table
     above.
   - Further down, **Mail Settings** shows **Email Forwarding**. Leave it like that for
     the whole runbook.

### Rules for typing records in Namecheap

- **Host**: type only the part before the domain. `send`, not `send.msrc2027.com`.
  Namecheap adds `.msrc2027.com` itself.
- **Value**: paste exactly what Resend shows. For TXT, paste without surrounding quotes.
- **TTL**: leave **Automatic**.
- After each record, click the small green **tick** at the end of the row to save it.
  Changes are not saved until you do.

## Part 3. Add the records in Namecheap

Under **Host Records**, click **Add New Record** once per record below.

### If Resend shows Layout A (CNAME)

For **each** CNAME row in Resend:

| # | Type | Host | Value | TTL |
|---|---|---|---|---|
| 1 | CNAME Record | the name Resend shows, e.g. `send` | copy from Resend | Automatic |

Then the DKIM key:

| # | Type | Host | Value | TTL |
|---|---|---|---|---|
| 2 | TXT Record | `resend._domainkey` | copy from Resend (starts `p=MIGf…`) | Automatic |

Nothing else exists on these host names today, so a CNAME on `send` has no clash. (A
CNAME cannot share a name with any other record; if you ever add something else on
`send`, it would conflict.) You never touch Mail Settings in Layout A.

### If Resend shows Layout B (MX + TXT)

| # | Type | Host | Value | Priority | TTL |
|---|---|---|---|---|---|
| 1 | TXT Record | `send` | copy from Resend (looks like `v=spf1 include:amazonses.com ~all`) | — | Automatic |
| 2 | TXT Record | `resend._domainkey` | copy from Resend (starts `p=MIGf…`) | — | Automatic |
| 3 | MX Record | `send` | copy from Resend (looks like `feedback-smtp.eu-west-1.amazonses.com`) | `10` | Automatic |

For record 3:

1. Click **Add New Record** and open the **Type** dropdown.
2. **If "MX Record" is in the list** while Mail Settings still says Email Forwarding: pick
   it, type host `send`, paste the value, and type `10` in the unlabeled box after the
   value (that box is the priority). Save with the green tick.
3. **If "MX Record" is not in the list:** stop here for record 3. **Do not** change Mail
   Settings to Custom MX. Instead, open Namecheap Live Chat (Help Center → Live Chat) and
   ask: *"Please add an MX record for host `send` on msrc2027.com, value `<paste from
   Resend>`, priority 10, without changing my Email Forwarding mail settings or the
   eforward MX records on @."* Records 1 and 2 can stay in place meanwhile.

I could not confirm from Namecheap's public documentation whether the MX type appears
while Email Forwarding is on, so the check above is on purpose. Either way, the root
`@` MX records are never edited.

### Optional but recommended: DMARC

There is no DMARC record today. Adding one in "monitor only" mode helps Gmail and Outlook
trust the mail and does not block anything:

| Type | Host | Value | TTL |
|---|---|---|---|
| TXT Record | `_dmarc` | `v=DMARC1; p=none;` | Automatic |

Leave it at `p=none` until mail has been sending cleanly for a few weeks; tightening it
later is a separate decision.

### What you must not do

- Do not change **Mail Settings** away from **Email Forwarding**.
- Do not delete, edit or merge the existing `@` TXT `v=spf1 include:spf.efwd…` record, and
  do not add a second `v=spf1` record on `@`.
- Do not edit the `@` A record or the `www` CNAME.
- Do not add any Resend record with host `@`.

Take an "after" screenshot of Advanced DNS when done.

## Part 4. Verify in Resend

1. Go back to the Resend **Domains** tab and click **Verify DNS Records** (or **Restart
   verification**).
2. Wait. It often verifies within 15 minutes; DNS can take up to 72 hours.
3. Each row turns **Verified**. The domain status should end as **Verified**. With the
   CNAME layout, **Partially verified** means it can send but without a fallback server;
   recheck the row that is not verified.
4. If something stays pending after a few hours, compare the failing row character by
   character with Namecheap. The usual causes are: host typed as `send.msrc2027.com`
   instead of `send`, a value pasted with quotes or missing characters, or the MX priority
   left blank. Resend's guide:
   <https://resend.com/docs/knowledge-base/what-if-my-domain-is-not-verifying>.
5. Re-check that nothing else broke: open <https://www.msrc2027.com> (site loads), and send
   an email from a personal account to `contact@msrc2027.com` (it still arrives where it
   forwards to).
6. While you are in Namecheap, open the **Domain** tab → **Redirect Email** and confirm a
   forwarding rule for `contact` exists. Replies to website emails go there, so it must.
   No mailbox or rule is needed for `no-reply`; it only appears as the sender.

## Part 5. Create the API key

1. In Resend, click **API Keys** in the left menu, then **Create API Key**.
2. **Name**: `msrc2027-vercel-production`.
3. **Permission**: choose **Sending access** (not Full access).
4. **Domain**: restrict it to `msrc2027.com`.
5. Click **Add**. Resend shows the key (it starts with `re_`) **once only**. Click copy
   and go straight to Part 6. If you lose it, delete it in Resend and create a new one;
   never paste it anywhere to "save it for later".

## Part 6. Put the API key in Vercel (server-only)

The key is a password. It goes only into Vercel's encrypted settings, never into the
repository, a `.env` file that gets committed, a document, a chat or a screenshot.

1. Sign in at <https://vercel.com> and open the MSRC 2027 project.
2. Click **Settings** at the top, then **Environment Variables** in the left menu.
3. Fill in the form:
   - **Key**: `RESEND_API_KEY`. Do **not** start the name with `NEXT_PUBLIC_`. Anything
     named `NEXT_PUBLIC_…` is copied into the website code that every visitor's browser
     downloads, which would publish the key.
   - **Value**: paste the `re_…` key.
   - **Environments**: tick **Production** only. Leave Preview and Development unticked,
     so preview links and laptops can never send real email with it.
   - **Sensitive**: turn this **on**. Vercel then hides the value even from people with
     dashboard access; it can be replaced but not read back.
4. Click **Save**.
5. A new variable only reaches the site on the next deployment. Nothing uses it yet, so you
   do not need to redeploy now; the next normal deployment picks it up.
6. For the code side later, the plan is two non-secret settings next to it (also without
   `NEXT_PUBLIC_`): sender `MSRC 2027 <no-reply@msrc2027.com>` and reply-to
   `contact@msrc2027.com`. Reply-To is set on each message by the server code
   (Resend's `replyTo` field), not in DNS or the Resend dashboard. Adding those settings
   is part of the future email-adapter task, not this runbook.

If the key is ever exposed (pasted in chat, committed, screenshotted): delete it in Resend
→ API Keys immediately, create a new one, and replace the value in Vercel.

## Done checklist

- [ ] Resend account created with 2FA, free plan.
- [ ] Domain `msrc2027.com` added in the chosen region.
- [ ] Namecheap records added (Layout A or B) and optional `_dmarc`.
- [ ] Mail Settings still **Email Forwarding**; `@` MX, `@` SPF, `@` A and `www` CNAME
      unchanged (compare before/after screenshots).
- [ ] Resend shows the domain **Verified**.
- [ ] Website loads; a test email to `contact@` still forwards.
- [ ] `RESEND_API_KEY` saved in Vercel: Production only, Sensitive on, no `NEXT_PUBLIC_`.
- [ ] Key not stored anywhere else.

## Still open after this runbook

- Contact provider/sender approved by ORG-028; provider/inbox processing, retention and
  location review remains open. The reviewed Contact adapter/counters/tests exist but
  require hosted application and manual activation under the linked runbook.
- Future staff/participant delivery quotas and operational batch capacity remain separate
  (the organizer-reported free plan is 100/day; Contact reserves at most 60/day).
- Supabase Auth emails (sign-up verification, password reset) use their own SMTP setting;
  pointing them at Resend is a separate, gated task.

## Sources (checked 3 October 2026)

- Resend, Namecheap guide: <https://resend.com/docs/knowledge-base/namecheap>
- Resend, add a domain: <https://resend.com/docs/add-a-domain>
- Resend, domain not verifying: <https://resend.com/docs/knowledge-base/what-if-my-domain-is-not-verifying>
- Resend, pricing: <https://resend.com/pricing>
- Namecheap, free email forwarding: <https://www.namecheap.com/support/knowledgebase/article.aspx/308/2214/how-to-set-up-free-email-forwarding/>
- Namecheap, MX records and Mail Settings: <https://www.namecheap.com/support/knowledgebase/article.aspx/322/2237/how-can-i-set-up-mx-records-required-for-mail-service/>
- Vercel, sensitive environment variables: <https://vercel.com/docs/environment-variables/sensitive-environment-variables>
- Live DNS: queried `dns1.registrar-servers.com` directly for `msrc2027.com`, `www`,
  `send`, `resend._domainkey` and `_dmarc`.
