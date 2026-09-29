export type LocalSupabaseConfig = Readonly<{
  url: string;
  publishableKey: string;
}>;

type LocalSupabaseInput = Readonly<{
  url?: string;
  publishableKey?: string;
}>;

export type SupabaseTarget = "local" | "hosted";

export type SupabaseConfig = LocalSupabaseConfig & Readonly<{
  target: SupabaseTarget;
}>;

type SupabaseInput = LocalSupabaseInput & Readonly<{
  target?: string;
}>;

/** The local fixture/helper API deliberately never accepts a hosted endpoint. */
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

  if (publishableKey.trim() !== publishableKey || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) {
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

/** A hosted endpoint is opt-in; blank/missing target preserves existing local behavior. */
export function resolveSupabaseConfig({
  target: configuredTarget,
  url,
  publishableKey,
}: SupabaseInput): SupabaseConfig | null {
  const target = configuredTarget === undefined || configuredTarget === "" ? "local" : configuredTarget;
  if (target === "local") {
    const config = resolveLocalSupabaseConfig({ url, publishableKey });
    return config ? Object.freeze({ ...config, target }) : null;
  }

  if (target !== "hosted") {
    throw new Error("Supabase target must be local or hosted.");
  }

  if (!url || !publishableKey) {
    throw new Error("Both hosted Supabase environment variables must be configured.");
  }

  // Check the original spelling as well as the parsed origin: URL parsing alone
  // normalizes credentials, default ports, dot segments and encoded hostnames.
  if (url.trim() !== url || !/^https:\/\/[a-z0-9]{20}\.supabase\.co\/?$/.test(url)) {
    throw new Error("Hosted Supabase requires a standard HTTPS project origin.");
  }

  if (publishableKey.trim() !== publishableKey || !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) {
    throw new Error("Use only a Supabase publishable key for the hosted client.");
  }

  return Object.freeze({ target, url: new URL(url).origin, publishableKey });
}

export function getSupabaseConfig(): SupabaseConfig | null {
  // Direct references allow Next.js to inline only these intentionally public values.
  return resolveSupabaseConfig({
    target: process.env.NEXT_PUBLIC_SUPABASE_TARGET,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    publishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
}
