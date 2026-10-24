import type { ContentFields, ContentItem } from "@/features/staff-portal/content-contract";
import type { Locale } from "@/lib/i18n";
import { formatRegistrationOpeningDate } from "@/content/registration-opening";
import { formatProgramTime, invalidSessionRange, sessionsOverlap } from "./schedule";

export function EditorSchedule({ locale, fields, items, itemId }: { locale: Locale; fields: ContentFields; items: readonly ContentItem[]; itemId?: string }) {
  const ar = locale === "ar";
  const conflicts = items.filter((item) => item.id !== itemId && sessionsOverlap(fields, item.draft));
  const rows = [...items.filter((item) => item.id !== itemId).map((item) => ({ id: item.id, fields: item.draft })), { id: "preview", fields }]
    .filter((item) => item.fields.day === fields.day).sort((a, b) => a.fields.startTime.localeCompare(b.fields.startTime) || a.id.localeCompare(b.id));
  return <section className="staff-content-preview" aria-label={ar ? "معاينة جدول اليوم" : "Day grid preview"}>
    <h3>{ar ? "معاينة جدول اليوم" : "Day grid preview"}</h3>
    <p>{ar ? "مسودات المجموعة الحالية، بما فيها التغييرات غير المحفوظة. جميع الأوقات بتوقيت الرياض." : "Current collection drafts, including unsaved changes. All times are Riyadh time."}</p>
    {invalidSessionRange(fields) ? <p role="alert">{ar ? "يجب أن يكون وقت الانتهاء بعد وقت البدء في اليوم نفسه." : "End time must be after start time on the same day."}</p> : null}
    {conflicts.length ? <div role="status"><p>{ar ? "تحذير: توجد جلسات متداخلة في القاعة نفسها. راجع الجدول قبل النشر." : "Warning: sessions overlap in the same room. Review the schedule before publishing."}</p><ul>{conflicts.map((item) => <li key={item.id}>{item.draft[ar ? "titleAr" : "titleEn"]}</li>)}</ul></div> : null}
    {fields.day ? <><h4>{formatRegistrationOpeningDate(`${fields.day}T00:00:00+03:00`, locale, false)}</h4><div className="programme-editor-grid">{rows.map(({ id, fields: row }) => <article key={id} data-current={id === "preview" ? true : undefined}>
      <p><bdi>{formatProgramTime(`${row.day}T${row.startTime}:00+03:00`, locale)} – {formatProgramTime(`${row.day}T${row.endTime}:00+03:00`, locale)}</bdi></p>
      <p>{row[ar ? "roomAr" : "roomEn"]}</p><h4 dir="auto">{row[ar ? "titleAr" : "titleEn"]}</h4>
    </article>)}</div></> : <p>{ar ? "اختر اليوم لمعاينة الجدول." : "Choose a day to preview the grid."}</p>}
  </section>;
}
