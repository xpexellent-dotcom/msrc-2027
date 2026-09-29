"use client";

// A failure of the root layout has no reliable locale context. Both recovery
// messages are provided, without exposing exception text or confidential data.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en" dir="ltr">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: "3rem", color: "#1F1930", background: "#F8F6F0" }}>
        <main>
          <h1>We could not load this page.</h1>
          <p>Please try again.</p>
          <div lang="ar" dir="rtl"><p>تعذّر تحميل هذه الصفحة. يرجى المحاولة مجددًا.</p></div>
          <button onClick={reset} style={{ minHeight: "44px", padding: "0.5rem 1rem" }}>Try again / حاول مجددًا</button>
        </main>
      </body>
    </html>
  );
}
