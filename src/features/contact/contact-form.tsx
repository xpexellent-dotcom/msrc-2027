import { FormField } from "@/components/forms/form-field";
import { Select } from "@/components/forms/select";
import { Button } from "@/components/ui/button";
import { contactConfig, contactTopics } from "@/config/contact";
import { contactCopy } from "@/features/contact/contact-copy";
import type { Locale } from "@/lib/i18n";

/**
 * BL-PUB-06: a closed, server-rendered form. Disabled native controls and a
 * non-submit button also prevent browser submission when JavaScript is absent.
 * No action, browser storage, client submission code or delivery adapter exists.
 */
export function ContactForm({ locale }: { locale: Locale }) {
  const copy = contactCopy[locale];
  const bounds = contactConfig.inputBounds;

  return (
    <form className="contact-form" aria-labelledby="contact-form-title" aria-describedby="contact-form-closed">
      <div id="contact-form-closed" className="contact-closed-note" role="note" aria-labelledby="contact-closed-title">
        <h3 id="contact-closed-title">{copy.closedHeading}</h3>
        <p>{copy.closedBody}</p>
        <p>{copy.closedPrivacy}</p>
      </div>
      <p id="contact-required-hint" className="contact-required-hint">{copy.requiredHint}</p>
      <fieldset disabled aria-describedby="contact-form-closed contact-required-hint" className="contact-fields">
        <legend className="sr-only">{copy.fieldsLegend}</legend>
        <div className="contact-field-wide">
          <Select id="contact-topic" name="topic" label={copy.topic} defaultValue="" required>
            <option value="">{copy.chooseTopic}</option>
            {contactTopics.map((topic) => <option key={topic.id} value={topic.id}>{topic.label[locale]}</option>)}
          </Select>
        </div>
        <FormField id="contact-name" name="name" label={copy.name} autoComplete="name" maxLength={bounds.name} required />
        <FormField id="contact-email" name="email" type="email" label={copy.email} autoComplete="email" dir="ltr" maxLength={bounds.email} required />
        <div className="contact-field-wide">
          <FormField
            id="contact-reference" name="relatedReference" label={copy.relatedReference}
            hint={copy.relatedReferenceHint} autoComplete="off" maxLength={bounds.relatedReference}
          />
        </div>
        <div className="field contact-field-wide">
          <label className="field-label" htmlFor="contact-message">{copy.message}<span className="field-required" aria-hidden="true"> *</span></label>
          <textarea id="contact-message" name="message" className="field-input contact-message" rows={6} maxLength={bounds.message} required />
        </div>
        {/* Accessible anti-spam foundation: never visible or in the tab order.
            The independent server validator rejects a populated honeypot. */}
        <div hidden aria-hidden="true">
          <label htmlFor="contact-website">{copy.website}</label>
          <input id="contact-website" name="website" type="text" autoComplete="off" tabIndex={-1} />
        </div>
      </fieldset>
      <Button type="button" disabled aria-describedby="contact-form-closed">{copy.send}</Button>
    </form>
  );
}
