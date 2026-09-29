"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { StatusBadge } from "@/components/ui/status-badge";
import { TextField } from "@/components/ui/text-field";
import { HeroMedia } from "@/components/hero-media";
import type { Locale } from "@/lib/i18n";

const copy = {
  en: {
    eyebrow: "MSRC 2027 / design study", title: "A shared visual language.",
    intro: "Working design defaults for review. These components use synthetic examples; no registration or submissions are available here.",
    foundations: "01 / Foundations", foundationsTitle: "Colour, space & type",
    foundationsDescription: "The source palette and locally served typefaces are working defaults, pending final brand approval.",
    palette: ["Royal purple", "Warm gold", "Ivory", "Soft lilac", "Deep ink"],
    typography: "Type specimens", headingSample: "Research starts with a question.",
    bodySample: "A clear interface makes room for ideas. Reading surfaces, labels and supporting text share a consistent rhythm.",
    headingFont: "DM Sans · headings and buttons", bodyFont: "Inter · body and details", arabicFont: "Noto Sans Arabic · Arabic interface",
    spacing: "Spacing scale", interaction: "02 / Interaction", interactionTitle: "Responsive, restrained controls",
    interactionDescription: "Use Tab to inspect focus, hover to preview feedback, and press to see the active state. Motion is removed when reduced motion is requested.",
    primary: "Primary action", secondary: "Secondary action", quiet: "Quiet action", gold: "On a dark surface",
    disabled: "Unavailable", loading: "Loading example", home: "Return to homepage",
    feedback: "03 / Feedback", feedbackTitle: "States with meaning",
    statuses: ["Information", "Not open yet", "Example complete", "Needs attention", "Example error"],
    formTitle: "A synthetic form example", formNote: "For interface testing only. Choose a predefined example; the choice remains in this browser tab when you change language. No personal or research information is collected or submitted.",
    choiceLabel: "Choose a synthetic example", choicePrompt: "Choose an example", choices: ["Synthetic research question", "Synthetic clinical observation"],
    choiceHint: "This sample choice demonstrates validation and preserves its value across language changes.",
    fieldLabel: "Example research title (English)", fieldHint: "Read-only synthetic text. Scientific content stays English and left-to-right in both interfaces.",
    fieldPlaceholder: "Synthetic research example", check: "Check example", checking: "Checking example…",
    errorTitle: "Check the example field", error: "Choose one of the synthetic examples.",
    success: "Demo checked. No submission was created or sent.",
    media: "04 / Media & motion", mediaTitle: "Still first. Motion when appropriate.",
    mediaDescription: "The homepage uses original still artwork while conference footage awaits selection and publication approval. This isolated motion sample tests playback, pause and still-image fallbacks.",
    mediaNote: "Synthetic motion test · not conference footage",
    motionNote: "Button feedback: 180 ms · one-time reveal: 400 ms / 12 px · native scrolling · reduced-motion still mode",
  },
  ar: {
    eyebrow: "مؤتمر أبحاث طلاب الطب ٢٠٢٧ / دراسة التصميم", title: "لغة بصرية مشتركة.",
    intro: "قيم تصميم مبدئية للمراجعة. تستخدم هذه المكوّنات أمثلة تجريبية؛ التسجيل وتقديم الطلبات غير متاحين هنا.",
    foundations: "٠١ / الأسس", foundationsTitle: "الألوان والمسافات والخطوط",
    foundationsDescription: "لوحة الألوان والخطوط المستضافة محليًا قيم عمل مبدئية بانتظار الاعتماد النهائي للهوية.",
    palette: ["البنفسجي الملكي", "الذهبي الدافئ", "العاجي", "الليلكي الفاتح", "الحبر الداكن"],
    typography: "نماذج الخطوط", headingSample: "البحث يبدأ بسؤال.",
    bodySample: "تتيح الواجهة الواضحة مساحة للأفكار. تتبع مساحات القراءة والعناوين والنصوص المساندة إيقاعًا متّسقًا.",
    headingFont: "DM Sans · العناوين والأزرار الإنجليزية", bodyFont: "Inter · النصوص والتفاصيل الإنجليزية", arabicFont: "Noto Sans Arabic · الواجهة العربية",
    spacing: "مقياس المسافات", interaction: "٠٢ / التفاعل", interactionTitle: "عناصر تحكم واضحة ومتجاوبة",
    interactionDescription: "استخدم مفتاح Tab لفحص التركيز، ومرّر المؤشر ثم اضغط لمعاينة التفاعل. تُزال الحركة عند تفعيل تفضيل تقليل الحركة.",
    primary: "إجراء أساسي", secondary: "إجراء ثانوي", quiet: "إجراء بسيط", gold: "على خلفية داكنة",
    disabled: "غير متاح", loading: "مثال قيد التحميل", home: "العودة إلى الصفحة الرئيسية",
    feedback: "٠٣ / الملاحظات", feedbackTitle: "حالات واضحة المعنى",
    statuses: ["معلومة", "لم تُفتح بعد", "اكتمل المثال", "يحتاج إلى انتباه", "خطأ تجريبي"],
    formTitle: "نموذج تجريبي", formNote: "لاختبار الواجهة فقط. اختر مثالًا جاهزًا؛ يبقى الاختيار في علامة تبويب المتصفح عند تغيير اللغة. لا تُجمع أو تُرسل أي معلومات شخصية أو بحثية.",
    choiceLabel: "اختر مثالًا تجريبيًا", choicePrompt: "اختر مثالًا", choices: ["سؤال بحثي تجريبي", "ملاحظة سريرية تجريبية"],
    choiceHint: "يوضح هذا الاختيار التجريبي التحقق من الحقول، ويحتفظ بقيمته عند تغيير اللغة.",
    fieldLabel: "عنوان بحث تجريبي (بالإنجليزية)", fieldHint: "نص تجريبي للقراءة فقط. يبقى المحتوى العلمي بالإنجليزية ومن اليسار إلى اليمين في كلتا الواجهتين.",
    fieldPlaceholder: "Synthetic research example", check: "تحقق من المثال", checking: "جارٍ التحقق من المثال…",
    errorTitle: "تحقق من الحقل التجريبي", error: "اختر أحد الأمثلة التجريبية.",
    success: "تم التحقق من المثال. لم يُنشأ أو يُرسل أي طلب.",
    media: "٠٤ / الوسائط والحركة", mediaTitle: "صورة ثابتة أولًا، وحركة عند ملاءمتها.",
    mediaDescription: "تستخدم الصفحة الرئيسية عملًا زخرفيًا ثابتًا بانتظار اختيار لقطات المؤتمر واعتماد نشرها. يختبر نموذج الحركة المنفصل التشغيل والإيقاف والعودة إلى الصورة الثابتة.",
    mediaNote: "اختبار حركة مصطنعة · ليس من لقطات المؤتمر",
    motionNote: "تفاعل الأزرار: ١٨٠ مللي ثانية · ظهور واحد: ٤٠٠ مللي ثانية / ١٢ بكسل · تمرير طبيعي · صورة ثابتة عند تقليل الحركة",
  },
};

const colours = ["#3B1E6D", "#C9A24A", "#F8F6F0", "#DCCFF0", "#1F1930"];
const tones = ["info", "neutral", "success", "warning", "error"] as const;
const examples = {
  "research-question": "Synthetic research question",
  "clinical-observation": "Synthetic clinical observation",
} as const;
type Example = keyof typeof examples | "";
const choiceKey = "msrc-design-synthetic-choice";
let fallbackChoice: Example = "";

function readChoice(): Example {
  try {
    const stored = sessionStorage.getItem(choiceKey);
    return stored === "research-question" || stored === "clinical-observation" ? stored : "";
  } catch {
    return fallbackChoice;
  }
}

function changeChoice(choice: Example) {
  fallbackChoice = choice;
  try { sessionStorage.setItem(choiceKey, choice); } catch { /* In-memory fallback if storage is disabled. */ }
  window.dispatchEvent(new Event(choiceKey));
}

function subscribeChoice(update: () => void) {
  window.addEventListener(choiceKey, update);
  return () => window.removeEventListener(choiceKey, update);
}

export function DesignSystemDemo({ locale }: { locale: Locale }) {
  const text = copy[locale];
  const choice = useSyncExternalStore(subscribeChoice, readChoice, (): Example => "");
  const title = choice ? examples[choice] : "";
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const summary = useRef<HTMLDivElement>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { if (error) summary.current?.focus(); }, [error]);

  function checkExample(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(false);
    setSuccess(false);
    timer.current = setTimeout(() => {
      const valid = choice !== "";
      setError(!valid);
      setSuccess(valid);
      setLoading(false);
    }, 350);
  }

  return (
    <Container className="design-system">
      <header className="design-system-intro">
        <p className="eyebrow">{text.eyebrow}</p>
        <h1>{text.title}</h1>
        <p>{text.intro}</p>
      </header>

      <section className="design-system-section" aria-labelledby="design-foundations">
        <SectionHeading id="design-foundations" eyebrow={text.foundations} title={text.foundationsTitle} description={text.foundationsDescription} />
        <ul className="design-palette">
          {colours.map((colour, index) => (
            <li key={colour}>
              <span className="design-swatch" style={{ backgroundColor: colour }} aria-hidden="true" />
              <strong>{text.palette[index]}</strong>
              <code dir="ltr">{colour}</code>
            </li>
          ))}
        </ul>
        <div className="design-type-specimen">
          <h3>{text.typography}</h3>
          <p className="design-type-heading">{text.headingSample}</p>
          <p className="design-type-body">{text.bodySample}</p>
          <p lang="ar" dir="rtl" className="design-type-arabic">مساحة للأفكار، وخطوة نحو المعرفة.</p>
          <ul><li>{text.headingFont}</li><li>{text.bodyFont}</li><li>{text.arabicFont}</li></ul>
        </div>
        <div className="design-spacing">
          <h3>{text.spacing}</h3>
          {[4, 8, 12, 16, 24, 32, 48, 64, 96].map((space) => (
            <div key={space}><code dir="ltr">{space}px</code><span style={{ inlineSize: space }} aria-hidden="true" /></div>
          ))}
        </div>
      </section>

      <section className="design-system-section" aria-labelledby="design-interaction">
        <SectionHeading id="design-interaction" eyebrow={text.interaction} title={text.interactionTitle} description={text.interactionDescription} />
        <div className="design-controls">
          <Button>{text.primary}</Button><Button variant="secondary">{text.secondary}</Button>
          <Button variant="ghost">{text.quiet}</Button><Button disabled>{text.disabled}</Button>
          <Button loading loadingLabel={text.loading}>{text.primary}</Button>
        </div>
        <div className="design-dark-surface"><Button variant="gold">{text.gold}</Button></div>
        <p className="design-note">{text.motionNote}</p>
      </section>

      <section className="design-system-section" aria-labelledby="design-feedback">
        <SectionHeading id="design-feedback" eyebrow={text.feedback} title={text.feedbackTitle} />
        <div className="design-statuses">{tones.map((tone, index) => <StatusBadge key={tone} tone={tone}>{text.statuses[index]}</StatusBadge>)}</div>
        <form className="design-form" onSubmit={checkExample} noValidate aria-labelledby="demo-form-title">
          <h3 id="demo-form-title">{text.formTitle}</h3>
          <p>{text.formNote}</p>
          {error && <div className="design-error-summary" ref={summary} tabIndex={-1} role="alert"><strong>{text.errorTitle}</strong><a href="#demo-example">{text.error}</a></div>}
          <div className="design-select-field">
            <label htmlFor="demo-example">{text.choiceLabel}</label>
            <p id="demo-example-hint">{text.choiceHint}</p>
            <select id="demo-example" value={choice} disabled={loading}
              aria-invalid={error || undefined} aria-describedby={`demo-example-hint${error ? " demo-example-error" : ""}`}
              onChange={(event) => {
                const next = event.target.value;
                changeChoice(next === "research-question" || next === "clinical-observation" ? next : "");
                setError(false); setSuccess(false);
              }}>
              <option value="">{text.choicePrompt}</option>
              <option value="research-question">{text.choices[0]}</option>
              <option value="clinical-observation">{text.choices[1]}</option>
            </select>
            {error && <p id="demo-example-error" className="design-field-error">{text.error}</p>}
          </div>
          <TextField
            id="demo-title" label={text.fieldLabel} hint={text.fieldHint}
            scientific autoComplete="off" placeholder={text.fieldPlaceholder} value={title} readOnly
          />
          <Button type="submit" loading={loading} loadingLabel={text.checking}>{text.check}</Button>
          {success && <p className="design-success" role="status">{text.success}</p>}
        </form>
      </section>

      <section className="design-system-section" aria-labelledby="design-media">
        <SectionHeading id="design-media" eyebrow={text.media} title={text.mediaTitle} description={text.mediaDescription} />
        <div className="design-media-frame"><HeroMedia locale={locale} video={{ src: "/brand/synthetic-motion.webm", poster: "/brand/hero-poster.svg", approval: "approved" }} /><p>{text.mediaNote}</p></div>
      </section>
      <ButtonLink href={`/${locale}`} variant="secondary">{text.home}</ButtonLink>
    </Container>
  );
}
