export function verifyHostedSupabase(
  input: Readonly<{ target?: string; url?: string; publishableKey?: string }>,
  fetcher?: typeof fetch,
): Promise<Readonly<{ origin: string; status: number }>>;
