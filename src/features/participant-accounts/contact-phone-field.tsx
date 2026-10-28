"use client";

import { FormField } from "@/components/forms/form-field";
import { Select } from "@/components/forms/select";
import { COUNTRIES } from "@/content/countries";
import type { Locale } from "@/lib/i18n";

export const phoneCountries = [{ code: "SA", prefix: "+966" }, { code: "AE", prefix: "+971" }, { code: "BH", prefix: "+973" }, { code: "KW", prefix: "+965" }, { code: "OM", prefix: "+968" }, { code: "QA", prefix: "+974" }, { code: "JO", prefix: "+962" }, { code: "EG", prefix: "+20" }, { code: "IN", prefix: "+91" }, { code: "PK", prefix: "+92" }, { code: "GB", prefix: "+44" }, { code: "US", prefix: "+1" }];
/** Shared contact-only profile/supervisor input. No authentication or delivery behavior. */
export function ContactPhoneField({ id, locale, country, onCountryChange, value, onChange, labels, error, name }: {
  id: string; locale: Locale; country: string; onCountryChange: (value: string) => void; value: string; onChange: (value: string) => void;
  labels: { country: string; phone: string; hint: string; international: string }; error?: string; name?: string;
}) {
  return <div className="participant-profile-phone">
    <Select id={`${id}-country`} label={labels.country} value={country} onChange={(event) => { const prefix = event.target.value; onCountryChange(prefix); if (value) onChange(prefix); }}>
      {phoneCountries.map(({ code, prefix }) => <option key={code} value={prefix}>{COUNTRIES.find((item) => item.code === code)?.[locale === "ar" ? "nameAr" : "nameEn"]} {`⁦(${prefix})⁩`}</option>)}
      <option value="">{labels.international}</option>
    </Select>
    <FormField id={id} name={name} type="tel" label={labels.phone} hint={labels.hint} value={value} placeholder={country || "+"} dir="ltr" inputMode="tel" autoComplete="tel" maxLength={16} error={error}
      onChange={(event) => { const entered = event.target.value.replace(/[ ()-]/g, ""); onChange(entered && !entered.startsWith("+") && country ? country + entered.replace(/^0/, "") : entered); }} />
  </div>;
}
