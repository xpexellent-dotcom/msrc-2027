import Image from "next/image";
import { Container } from "@/components/ui/container";
import { peopleAndPartnersCopy } from "@/content/people-and-partners";
import type { HomepageSponsor } from "@/content/sponsor-belt";
import type { Locale } from "@/lib/i18n";

export function ApprovedSponsorBelt({ locale, sponsors }: {
  locale: Locale;
  sponsors: readonly HomepageSponsor[];
}) {
  return (
    <section data-header-section="light" className="sponsor-belt">
      <Container>
        <h2 id="home-sponsors-title" className="belt-caption">{peopleAndPartnersCopy[locale].sponsors.label}</h2>
        <div className="approved-belt-window" role="region" aria-labelledby="home-sponsors-title" tabIndex={0}>
          <ul className="approved-belt-list" role="list">
            {sponsors.map(({ id, name, logo }) => (
              <li className="approved-belt-item" key={id}>
                <Image className="approved-belt-logo" {...logo} alt="" sizes="128px" />
                <bdi>{name[locale]}</bdi>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
