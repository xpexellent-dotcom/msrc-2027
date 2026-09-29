import { notFound } from "next/navigation";
import { dictionaries, isLocale } from "@/lib/i18n";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const copy = dictionaries[locale];

  return (
    <>
      <section className="hero site-container" aria-labelledby="conference-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="eyebrow-rule" aria-hidden="true" />{copy.edition}</p>
          <h1 id="conference-title">{copy.title}<span className="hero-year" dir="ltr">2027</span></h1>
          <p className="hero-description">{copy.introduction}</p>
          <div className="institution">
            <span className="institution-mark" aria-hidden="true">↗</span>
            <div><p>{copy.institution}</p><span>{copy.location}</span></div>
          </div>
        </div>
        <div className="edition-art" aria-hidden="true">
          <div className="art-topline"><span>MSRC</span><span>2027</span></div>
          <span className="art-number">05</span>
          <svg className="art-waves" viewBox="0 0 540 380" fill="none">
            <path d="M-100 90C40 90 70 250 240 250S400 60 620 60" />
            <path d="M-100 116C40 116 70 276 240 276S400 86 620 86" />
            <path d="M-100 142C40 142 70 302 240 302S400 112 620 112" />
            <path d="M-100 168C40 168 70 328 240 328S400 138 620 138" />
            <path d="M-100 194C40 194 70 354 240 354S400 164 620 164" />
            <path d="M-100 220C40 220 70 380 240 380S400 190 620 190" />
          </svg>
          <div className="art-bottomline"><span>{copy.edition}</span><span>↗</span></div>
        </div>
      </section>

      <section className="conference-status site-container" aria-label={copy.participation}>
        <dl className="event-details">
          <div><dt>{copy.date}</dt><dd>{copy.pending}</dd></div>
          <div><dt>{copy.venue}</dt><dd>{copy.pending}</dd></div>
        </dl>
        <div className="participation-status">
          <div className="status-heading"><span className="status-dot" aria-hidden="true" /><h2>{copy.participation}: {copy.closed}</h2></div>
          <p>{copy.closedDescription}</p>
        </div>
      </section>
    </>
  );
}
