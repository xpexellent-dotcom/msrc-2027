import Image from "next/image";
import type { Locale } from "@/lib/i18n";
import { initials } from "@/content/team";
import { localizedContent, type PublishedContent } from "./published";
import "./public-content.css";

export function PublishedContentImage({ item, locale }: { item: PublishedContent; locale: Locale }) {
  return item.media ? <Image src={item.media.src} unoptimized alt={locale === "ar" ? item.media.altAr : item.media.altEn}
    width={item.media.width} height={item.media.height} sizes="(max-width: 700px) 85vw, 320px"
    style={{ objectPosition: `${item.media.focalX}% ${item.media.focalY}%` }} /> : null;
}

export function PublishedTeam({ items, locale }: { items: readonly PublishedContent[]; locale: Locale }) {
  const groups = [...new Set(items.map((item) => localizedContent(item.fields, "group", locale)))];
  return <div data-testid="published-team">{groups.map((group, index) => <section className="team-committee" key={group} aria-labelledby={`published-team-${index}`}>
    <div className="team-committee-heading"><h2 className="team-section-title" id={`published-team-${index}`}>{group}</h2></div>
    <ol className="team-rows">{items.filter((item) => localizedContent(item.fields, "group", locale) === group).map((item) => {
      const name = localizedContent(item.fields, "name", locale);
      return <li key={item.id}><article className="team-row team-row--wide"><div className="team-person">
        <div className="team-photo team-photo--lead public-content-photo">{item.media ? <PublishedContentImage item={item} locale={locale} /> : <span className="team-initials" aria-hidden="true">{initials(name)}</span>}</div>
        <div className="team-identity"><p className="team-role">{localizedContent(item.fields, "title", locale)}</p><h3 className="team-name">{name}</h3>
          {localizedContent(item.fields, "bio", locale) ? <p className="team-description">{localizedContent(item.fields, "bio", locale)}</p> : null}
          {item.fields.links.map((href) => <a className="team-profile" href={href} key={href} target="_blank" rel="noopener noreferrer">{new URL(href).hostname}<span className="sr-only">: {name}</span></a>)}
        </div>
      </div></article></li>;
    })}</ol>
  </section>)}</div>;
}

const tierLabels: Record<string, Record<Locale, string>> = {
  platinum: { en: "Platinum", ar: "البلاتيني" }, gold: { en: "Gold", ar: "الذهبي" },
  silver: { en: "Silver", ar: "الفضي" }, partner: { en: "Partners", ar: "الشركاء" },
};
export function PublishedPartners({ items, locale }: { items: readonly PublishedContent[]; locale: Locale }) {
  const tiers = [...new Set(items.map((item) => item.fields.tier))];
  return <div className="sponsor-tiers" data-testid="published-partners">{tiers.map((tier, index) => <section className={`sponsor-tier sponsor-tier--${tier}`} key={tier} aria-labelledby={`published-tier-${index}`}>
    <div className="sponsor-tier-heading"><h2 id={`published-tier-${index}`}>{tierLabels[tier.toLowerCase()]?.[locale] ?? tier}</h2></div>
    <div className="sponsor-brand-grid">{items.filter((item) => item.fields.tier === tier).map((item) => {
      const card = <><PublishedContentImage item={item} locale={locale} /><span>{localizedContent(item.fields, "name", locale)}</span></>;
      return item.fields.url ? <a className="sponsor-brand public-content-partner" key={item.id} href={item.fields.url} target="_blank" rel="noopener noreferrer">{card}</a>
        : <div className="sponsor-brand public-content-partner" key={item.id}>{card}</div>;
    })}</div>
  </section>)}</div>;
}
