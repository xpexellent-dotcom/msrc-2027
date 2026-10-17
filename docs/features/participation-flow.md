# Public participation flow — ORG-053 / ENG-048

17 October 2026 follow-up: the owner requested a separate decorative-artwork
redesign and pull request. See [participation artwork](participation-artwork.md)
for the current placement model, scope and verification evidence. The ownership
and delivery notes below describe the original 16 October task.

Owner-approved scope, 16 October 2026: public presentation and navigation only.
Claude is the planner/visual QA and owns rechecks, commit and PR. Implementation
creates no branch/commit/push, opens no account or workflow and changes no hosted
state, environment, database or backend.

## Audit and chosen slice

The starting hub had five numbered editorial blocks, with only the title linking
out. The five option pages already shared `JourneyExperience`, but rendered dense
rules and no simple steps. Registration's primary action pointed back at the
closed notice. Program download was an unavailable resource block; there is no
published brochure. The header, mobile action, hero and closing CTA went directly
to registration. The abstract navigation/category still said Research / البحث العلمي.

Priority: correct those entry points, make the hub a five-row whole-link list,
then reuse the shared component for benefits, steps and the next move. Keep all
new styles in `participation-flow.css`; header edits are six label/href lines.
No changes to the overlapping conference CSS or Playwright configuration.

## Copy before and after

Page headers retain their existing bilingual titles/leads, apart from the hub's
invitation to find an experience instead of reviewing requirements. Abstract page
metadata/breadcrumb already used the right label and continue to do so.

| Page | Before EN / AR | After EN / AR |
|---|---|---|
| Hub | “Choose your path and review its requirements.” / «اختر مسارك وراجع متطلباته.» | “Find the experience for you.” / «اكتشف التجربة التي تناسبك.» Five linked horizontal rows: Attend MSRC / حضور المؤتمر; Abstract submission / تقديم الملخصات; Workshops / ورش العمل; Hackathon / الهاكاثون; Three Minute Thesis / الأطروحة في ثلاث دقائق. |
| Attend | “Before you register”; “Reserve your seat” / «قبل التسجيل»؛ «احجز مقعدك» | “Two days. So much to take away.”; “Sign up for MSRC” / «يومان يفتحان لك آفاقًا.»؛ «سجّل في MSRC». Benefits: conference certificate (both day check-ins + general survey), research learning, networking, homepage CME wording, two days of sessions. / شهادة المؤتمر بالشروط المذكورة، التعلّم، التواصل، ساعات التعليم الطبي بصياغة الصفحة الرئيسية، وجلسات اليومين. |
| Abstract | Navigation/category “Research”; “Prepare your abstract”; “Research submissions are not open yet” / «البحث العلمي»؛ «جهّز ملخصك البحثي»؛ «لم يُفتح تقديم الأبحاث بعد» | “Abstract submission”; “Give your work a wider conversation.”; “Abstract submissions are not open yet” / «تقديم الملخصات»؛ «افتح لبحثك باب الحوار.»؛ «لم يُفتح تقديم الملخصات بعد». Present your work, scientific feedback, awards and cash prizes (details forthcoming), community. / عرض البحث، الملاحظات العلمية، جوائز ومكافآت نقدية بتفاصيل لاحقة، والمجتمع البحثي. |
| Workshops | “Make space for practical learning”; “Browse before you book” / «مساحة للتعلّم العملي»؛ «استكشف قبل الحجز» | “About the workshops” / «عن ورش العمل». Practical learning; own certificate with confirmed booking/check-in/completion/survey; separate booking with confirmed conference registration; more than one if times do not overlap. / التعلّم العملي، شهادة الورشة بشروطها، الحجز المستقل بعد تأكيد التسجيل، وتعدد الورش دون تداخل. |
| Hackathon | “Two directions. Your idea.” + six rule cards / «مساران. وفكرتك.» وست بطاقات شروط | “Build on a question that matters.” / «ابنِ على سؤال يصنع فرقًا.» Two existing English/LTR track names, solo or preformed teams up to five, development through orientation/mentoring/pitch. / اسما المسارين المنشوران، المشاركة الفردية أو فريق حتى خمسة، والتهيئة والإرشاد والعرض. |
| 3MT | “A distinct research pathway” + pending terms / «مسار بحثي مستقل» وتفاصيل بانتظار الإعلان | “A clearer voice for your research.” / «صوت أوضح لبحثك.» Share postgraduate research; communicate scientific content in English through the separate pathway. / مشاركة بحث الدراسات العليا والتواصل العلمي بالإنجليزية في المسار المستقل. |

Shared section labels: “What you gain” / «ما الذي تكتسبه» (Workshops:
“Practical learning” / «تعلّم عملي»), “Simple steps” / «خطوات بسيطة»,
“Your next move.” / «خطوتك التالية.». View my ticket stays disabled; Find another
path and FAQ retain their destinations. The disabled program download is compact
near every header and explains the brochure will be available once published.
It is never rendered as a fake downloadable link.

| Page | Steps EN | Steps AR |
|---|---|---|
| Attend | Create your account → Verify your email → Reserve your seat → Receive your confirmation email and ticket | أنشئ حسابك ← تحقّق من بريدك الإلكتروني ← احجز مقعدك ← استلم رسالة التأكيد وتذكرتك |
| Abstract | Prepare your abstract → Submit when applications open → Scientific review → Decision by email | جهّز ملخصك ← قدّم عند فتح الطلبات ← المراجعة العلمية ← القرار عبر البريد الإلكتروني |
| Workshops | Choose a workshop → Book it with your confirmed conference registration → Receive your confirmation email | اختر ورشة عمل ← احجزها بعد تأكيد تسجيلك في المؤتمر ← استلم رسالة تأكيد الحجز |
| Hackathon | Prepare your idea and apply when entries open → Preparation and compulsory orientation → Day-one mentoring → Day-two pitch and judging | جهّز فكرتك وقدّم عند فتح الطلبات ← التحضير والتهيئة الإلزامية ← الإرشاد في اليوم الأول ← العرض والتحكيم في اليوم الثاني |
| 3MT | Review the confirmed guidelines when published → Prepare your scientific content in English → Apply through the separate 3MT pathway when it opens | راجع إرشادات المسابقة المعتمدة عند نشرها ← جهّز محتواك العلمي بالإنجليزية ← قدّم عبر مسار 3MT المستقل عند فتحه |

Abstract “Good to know” / «معلومات مفيدة»: ongoing or completed work; 300 body
words; two submissions per PI per edition. Hackathon keeps its existing English
title / pitch up to 300 words and new-idea / optional-prototype facts in the same
compact treatment. No 3MT duration, slide rule, prize, fee or eligibility is inferred
from its name. No presenter certificate, CME or publication claim is introduced.

## Preserved form guidance

`src/content/participation-form-guidance.ts` contains the exact preceding EN/AR
journey objects, including all details, pending paragraphs and old steps. It is
not imported by any public rendering code. Future forms must show the applicable
guidance before submission. It retains research evidence/privacy, separate
attendance/co-authors, supervisor timing, word-count exclusions/finalized-PI limit,
workshop conditions and unresolved hackathon/3MT terms. Requirement IDs are in
its header and the decision record; a dated archive never supersedes later decisions.

## Icon replacement

In `src/content/conference-experiences.ts`, each `participationPaths` entry has
`icon: null`. After the owner supplies an approved SVG/image, place it at e.g.
`public/media/participate/icons/submissions.svg` and change one field to
`icon: "/media/participate/icons/submissions.svg"`. The shared component sizes it
inside the inline-start slot. Missing values use the existing geometric glyph
chosen by `glyph`. Icons remain decorative because the adjacent heading names
the whole-row link. Use a versioned new filename for later replacements (ORG-008).
No custom icons or approvals are invented by this task.

## Rendering and review

Hub/abstract/workshops/hackathon/3MT retain static output. Registration was already
dynamic under ENG-045 to provide its nonce CSP and preserve the gated registration
foundation. That existing security boundary is deliberately unchanged; a blanket
“all five static” requirement conflicts with it. Sign-up also remains the existing
closed dynamic account page. No route is newly made dynamic.

Tests cover entry points, names, whole-row geometry/RTL, keyboard activation,
closed actions, bottom signup/top abstract CTA, workshop slider arrival, removed
rules, axe, widths and enlarged text. Screenshot filenames are
`.tools/participation-flow/screenshots/{en|ar}-{participate|registration|submissions|workshops|hackathon|3mt}-{390|1440}.png`
(24 full-page images). Exact results, failures and limits are in
[the O9 receipt](../progress/2026-10-16-claude-participation-flow.md).
