export type LocalSupabaseConfig = Readonly<{
  url: string;
  publishableKey: string;
}>;

type LocalSupabaseInput = Readonly<{
  url?: string;
  publishableKey?: string;
}>;

/** M1 accepts an optional local endpoint only; remote data requires a later decision. */
export function resolveLocalSupabaseConfig({
  url,
  publishableKey,
}: LocalSupabaseInput): LocalSupabaseConfig | null {
  if (!url && !publishableKey) return null;

  if (!url || !publishableKey) {
    throw new Error("Both local Supabase environment variables must be configured.");
  }

  let endpoint: URL;
  try {
    endpoint = new URL(url);
  } catch {
    throw new Error("The local Supabase URL is invalid.");
  }

  if (
    endpoint.protocol !== "http:" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname) ||
    endpoint.username ||
    endpoint.password ||
    endpoint.search ||
    endpoint.hash ||
    endpoint.pathname !== "/"
  ) {
    throw new Error("M1 data clients require a loopback HTTP Supabase origin.");
  }

  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) {
    throw new Error("Use only the local Supabase publishable key for M1.");
  }

  return Object.freeze({ url: endpoint.origin, publishableKey });
}

export function getLocalSupabaseConfig(): LocalSupabaseConfig | null {
  // Keep direct references so Next.js can inline the intentionally public values.
  return resolveLocalSupabaseConfig({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
