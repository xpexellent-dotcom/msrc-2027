// ENG-045: only registration needs a fresh document nonce; sibling public pages stay SSG.
export const dynamic = "force-dynamic";

export default function RegistrationLayout({ children }: { children: React.ReactNode }) {
  return children;
}
