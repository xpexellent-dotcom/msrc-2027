"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { Section } from "@/components/ui/section";
import { SectionHeading } from "@/components/ui/section-heading";
import { ContentSplit } from "@/components/ui/content-split";
import { Reveal } from "@/components/ui/reveal";
import { FormField } from "@/components/forms/form-field";
import { Select } from "@/components/forms/select";
import { Checkbox } from "@/components/forms/checkbox";
import { Radio } from "@/components/forms/radio";
import { FileUpload } from "@/components/forms/file-upload";
import { Alert } from "@/components/feedback/alert";
import { EmptyState } from "@/components/feedback/empty-state";
import { LoadingSkeleton } from "@/components/feedback/loading-skeleton";
import { Dialog } from "@/components/feedback/dialog";
import { Toast } from "@/components/feedback/toast";
import { StatBlock } from "@/components/data-display/stat-block";
import { ProgramRow } from "@/components/data-display/program-row";
import { Table } from "@/components/data-display/table";
import { Pagination } from "@/components/data-display/pagination";

export function DesignSystemComponents({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const t = (en: string, arabic: string) => ar ? arabic : en;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [page, setPage] = useState(1);
  const columns = [
    { id: "name", header: t("Synthetic item", "عنصر تجريبي"), cell: (row: { id: number }) => `${t("Example", "مثال")} ${row.id}`, rowHeader: true },
    { id: "state", header: t("State", "الحالة"), cell: () => t("Demonstration only", "للعرض فقط") },
  ];
  const tableMessages = { emptyMessage: t("No synthetic rows to show.", "لا توجد صفوف تجريبية للعرض."), loadingMessage: t("Loading synthetic rows", "جارٍ تحميل الصفوف التجريبية") };
  const paginationLabels = { navigation: t("Example pages", "صفحات المثال"), previous: t("Previous", "السابق"), next: t("Next", "التالي"), page: (n: number) => `${t("Page", "صفحة")} ${n}` };

  return <>
    <Section className="design-system-section" aria-labelledby="design-layout">
      <SectionHeading id="design-layout" eyebrow={t("5 / Composition", "٥ / التكوين")} title={t("Space for the story", "مساحة للقصة")} />
      <p className="design-note">{t("The page shell demonstrates Container, Header, MobileNav, Footer and LanguageSwitch. Resize to inspect the navigation disclosure; use the language control to inspect the same components in RTL.", "يعرض إطار الصفحة الحاوية والترويسة وقائمة الهاتف والتذييل ومبدّل اللغة. غيّر حجم النافذة لفحص قائمة التنقل، وبدّل اللغة لفحص المكوّنات من اليمين إلى اليسار.")}</p>
      <div className="design-controls"><Link href="#design-data">{t("Jump to table examples", "انتقل إلى أمثلة الجداول")}</Link><Link href="#design-data" disabled>{t("Unavailable link", "رابط غير متاح")}</Link></div>
      <ContentSplit aside={<StatBlock label={t("Synthetic count", "عدد تجريبي")} value={t("3", "٣")} description={t("A visual sample, not a conference statistic.", "نموذج بصري، وليس إحصائية للمؤتمر.")} />}>
        <h3>{t("Editorial ContentSplit", "تقسيم تحريري للمحتوى")}</h3>
        <p>{t("A reading column and a supporting detail, separated by space. Content remains in a sensible reading order on a narrow screen.", "عمود للقراءة وتفصيل مساند تفصل بينهما مساحة. يحافظ المحتوى على ترتيب قراءة واضح في الشاشات الضيقة.")}</p>
      </ContentSplit>
      <Reveal><ProgramRow time={t("Time unpublished", "الوقت غير منشور")} title={t("Synthetic session example", "مثال تجريبي لجلسة")} meta={t("ProgramRow · no approved event schedule", "صف برنامج · لا يمثّل جدولًا معتمدًا")}><p>{t("Use this row to review reading rhythm and alignment only.", "استخدم هذا الصف لمراجعة إيقاع القراءة والمحاذاة فقط.")}</p></ProgramRow></Reveal>
    </Section>

    <Section className="design-system-section" aria-labelledby="design-fields">
      <SectionHeading id="design-fields" eyebrow={t("6 / Form controls", "٦ / عناصر النماذج")} title={t("Clear at every step", "وضوح في كل خطوة")} description={t("Synthetic UI examples only. Nothing is submitted or uploaded. Do not enter personal information.", "أمثلة واجهة تجريبية فقط. لا يُرسل أو يُرفع أي شيء. لا تُدخل معلومات شخصية.")} />
      <div className="design-example-grid">
        <FormField id="m2-default" label={t("Default field", "حقل افتراضي")} hint={t("Try keyboard focus with synthetic text.", "جرّب التركيز بلوحة المفاتيح بنص تجريبي.")} placeholder={t("Synthetic example", "مثال تجريبي")} autoComplete="off" />
        <FormField id="m2-required" label={t("Required field", "حقل مطلوب")} required hint={t("Required for this UI example only.", "مطلوب لهذا المثال التجريبي فقط.")} autoComplete="off" />
        <FormField id="m2-invalid" label={t("Invalid field", "حقل غير صالح")} defaultValue={t("Example", "مثال")} error={t("Example error: review this value.", "خطأ تجريبي: راجع هذه القيمة.")} />
        <FormField id="m2-valid" label={t("Valid field", "حقل صالح")} readOnly value={t("Synthetic value", "قيمة تجريبية")} success={t("Example value accepted.", "تم قبول القيمة التجريبية.")} />
        <FormField id="m2-disabled" label={t("Disabled field", "حقل معطّل")} disabled value={t("Unavailable", "غير متاح")} />
        <FormField id="m2-loading" label={t("Loading field", "حقل قيد التحميل")} loading loadingLabel={t("Loading example", "جارٍ تحميل المثال")} />
        <FormField id="m2-science" label={t("Scientific text (English)", "نص علمي (بالإنجليزية)")} scientific value="Synthetic scientific title" readOnly hint={t("English and LTR in both languages.", "بالإنجليزية ومن اليسار إلى اليمين في كلتا اللغتين.")} />
        <Select id="m2-select" label={t("Select example", "قائمة اختيار تجريبية")} defaultValue="one" hint={t("Native keyboard selection.", "اختيار أصلي بلوحة المفاتيح.")}><option value="one">{t("Example one", "المثال الأول")}</option><option value="two">{t("Example two", "المثال الثاني")}</option></Select>
        <Select id="m2-select-invalid" label={t("Select with error", "قائمة بها خطأ")} error={t("Choose an example.", "اختر مثالًا.")} defaultValue=""><option value="">{t("Choose", "اختر")}</option><option value="one">{t("Example one", "المثال الأول")}</option></Select>
        <Select id="m2-select-disabled" label={t("Disabled select", "قائمة معطّلة")} disabled><option>{t("Unavailable", "غير متاح")}</option></Select>
        <Select id="m2-select-loading" label={t("Loading select", "قائمة قيد التحميل")} loading loadingLabel={t("Loading options", "جارٍ تحميل الخيارات")}><option>{t("Loading", "جارٍ التحميل")}</option></Select>
      </div>
      <div className="design-example-grid">
        <fieldset className="choice-group"><legend>{t("Checkbox examples", "أمثلة مربعات الاختيار")}</legend>
          <Checkbox id="m2-checkbox" label={t("Toggle synthetic option", "تبديل خيار تجريبي")} hint={t("Space toggles this native checkbox.", "مفتاح المسافة يبدّل مربع الاختيار.")} />
          <Checkbox id="m2-checkbox-checked" label={t("Checked example", "مثال محدد")} defaultChecked />
          <Checkbox id="m2-checkbox-invalid" label={t("Invalid checkbox", "مربع اختيار غير صالح")} error={t("Example validation message.", "رسالة تحقق تجريبية.")} />
          <Checkbox id="m2-checkbox-disabled" label={t("Disabled checkbox", "مربع اختيار معطّل")} disabled />
        </fieldset>
        <fieldset className="choice-group"><legend>{t("Radio examples", "أمثلة أزرار الاختيار")}</legend>
          <Radio id="m2-radio-one" name="m2-radio" value="one" label={t("First option", "الخيار الأول")} defaultChecked />
          <Radio id="m2-radio-two" name="m2-radio" value="two" label={t("Second option", "الخيار الثاني")} />
          <Radio id="m2-radio-disabled" name="m2-radio" value="disabled" label={t("Disabled option", "خيار معطّل")} disabled />
          <Radio id="m2-radio-invalid" name="m2-radio-error" value="error" label={t("Invalid radio example", "مثال اختيار غير صالح")} error={t("Example validation message.", "رسالة تحقق تجريبية.")} />
        </fieldset>
      </div>
      <div className="design-example-grid">
        <FileUpload id="m2-file" label={t("Local file selection demo", "مثال اختيار ملف محلي")} hint={t("Use a synthetic file. Its contents are never read or uploaded; selection is discarded when you leave.", "استخدم ملفًا تجريبيًا. لا يُقرأ محتواه ولا يُرفع، ويُحذف الاختيار عند مغادرة الصفحة.")} clearLabel={t("Clear selection", "مسح الاختيار")} selectionLabel={t("Selected file", "الملف المختار")} />
        <FileUpload id="m2-file-disabled" label={t("Disabled file control", "عنصر ملف معطّل")} disabled clearLabel={t("Clear selection", "مسح الاختيار")} selectionLabel={t("Selected file", "الملف المختار")} />
        <FileUpload id="m2-file-invalid" label={t("File control with error", "عنصر ملف به خطأ")} error={t("Synthetic error; no upload took place.", "خطأ تجريبي؛ لم يُرفع أي ملف.")} clearLabel={t("Clear selection", "مسح الاختيار")} selectionLabel={t("Selected file", "الملف المختار")} />
        <FileUpload id="m2-file-loading" label={t("Loading file control", "عنصر ملف قيد التحميل")} loading loadingLabel={t("Synthetic loading state", "حالة تحميل تجريبية")} clearLabel={t("Clear selection", "مسح الاختيار")} selectionLabel={t("Selected file", "الملف المختار")} />
      </div>
    </Section>

    <Section className="design-system-section" aria-labelledby="design-messages">
      <SectionHeading id="design-messages" eyebrow={t("7 / Feedback patterns", "٧ / أنماط الملاحظات")} title={t("Helpful, without interruption", "مساعدة دون مقاطعة")} />
      <div className="design-stack">{(["info", "success", "warning", "error"] as const).map((tone, index) => <Alert key={tone} tone={tone} title={[
        t("Information example", "مثال معلومات"), t("Success example", "مثال نجاح"), t("Warning example", "مثال تنبيه"), t("Error example", "مثال خطأ"),
      ][index]}>{t("Static synthetic message. The text explains the state without relying on colour.", "رسالة تجريبية ثابتة. يوضّح النص الحالة دون الاعتماد على اللون.")}</Alert>)}</div>
      <EmptyState title={t("Nothing to show yet", "لا يوجد محتوى للعرض بعد")} action={<Link href="#design-data">{t("Explore table states", "استكشف حالات الجداول")}</Link>}><p>{t("An empty-state example, not a report about real records.", "مثال لحالة فارغة، وليس تقريرًا عن سجلات حقيقية.")}</p></EmptyState>
      <LoadingSkeleton label={t("Loading preview example", "جارٍ تحميل مثال المعاينة")} lines={3} />
      <div className="design-controls"><Button onClick={() => setDialogOpen(true)}>{t("Open dialog example", "فتح مثال الحوار")}</Button><Button id="m2-toast-trigger" variant="secondary" onClick={() => setToastOpen(true)}>{t("Show toast example", "إظهار مثال الإشعار")}</Button></div>
      <Toast open={toastOpen} title={t("Example notification", "إشعار تجريبي")} dismissLabel={t("Dismiss notification", "إغلاق الإشعار")} onDismiss={() => { setToastOpen(false); document.getElementById("m2-toast-trigger")?.focus({preventScroll:true}); }}>{t("Nothing was saved or sent. This message stays until you dismiss it.", "لم يُحفظ أو يُرسل أي شيء. تبقى هذه الرسالة حتى تغلقها.")}</Toast>
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} title={t("Synthetic dialog", "حوار تجريبي")} description={t("A keyboard and focus demonstration. No action changes data.", "عرض للوحة المفاتيح والتركيز. لا يغيّر أي إجراء البيانات.")} closeLabel={t("Close dialog", "إغلاق الحوار")} actions={<Button onClick={() => setDialogOpen(false)}>{t("Finish example", "إنهاء المثال")}</Button>}><p>{t("Use Tab and Shift+Tab to move within the dialog. Escape closes it and returns focus to the opener.", "استخدم Tab وShift+Tab للتنقل داخل الحوار. يغلقه Escape ويعيد التركيز إلى زر الفتح.")}</p></Dialog>
    </Section>

    <Section className="design-system-section" id="design-data" aria-labelledby="design-data-title">
      <SectionHeading id="design-data-title" eyebrow={t("8 / Data display", "٨ / عرض البيانات")} title={t("Readable rows, clear navigation", "صفوف مقروءة وتنقل واضح")} />
      <div className="design-stack">
        <Table caption={t("Synthetic table example", "مثال جدول تجريبي")} columns={columns} rows={page === 1 ? [{id:1},{id:2}] : [{id:3}]} getRowKey={(row) => String(row.id)} {...tableMessages} scrollHint={t("Scroll within the table if needed.", "مرّر داخل الجدول عند الحاجة.")} />
        <Pagination currentPage={page} totalPages={2} onPageChange={setPage} labels={paginationLabels} />
        <Table caption={t("Empty table", "جدول فارغ")} columns={columns} rows={[]} getRowKey={(row) => String(row.id)} {...tableMessages} />
        <Table caption={t("Loading table", "جدول قيد التحميل")} columns={columns} rows={[]} getRowKey={(row) => String(row.id)} loading {...tableMessages} />
        <Pagination currentPage={1} totalPages={2} onPageChange={() => {}} disabled labels={{...paginationLabels,navigation:t("Unavailable pagination", "تنقل صفحات غير متاح")}} />
      </div>
    </Section>
  </>;
}
