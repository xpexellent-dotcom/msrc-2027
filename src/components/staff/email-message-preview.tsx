import Image from "next/image";
import type { ReactNode } from "react";
import { emailBrand } from "@/lib/email/brand-layout";

export function EmailMessagePreview({ testId, english, arabic }: {
  testId: string;
  english: ReactNode;
  arabic?: ReactNode;
}) {
  return <div className="staff-email-message" data-testid={testId}>
    <div className="staff-email-brand" dir="ltr" lang="en">
      <Image src={emailBrand.seal.src} alt="" width={emailBrand.seal.displaySize} height={emailBrand.seal.displaySize} unoptimized />
      <span>{emailBrand.wordmark}</span>
    </div>
    <div className="staff-email-message-body">
      <div lang="en" dir="ltr" data-testid="email-message-english">{english}</div>
      {arabic !== undefined ? <>
        <hr />
        <div lang="ar" dir="rtl" className="staff-email-arabic" data-testid="email-message-arabic">{arabic}</div>
      </> : null}
    </div>
  </div>;
}
