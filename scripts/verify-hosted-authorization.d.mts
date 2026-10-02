type HostedAuthorizationInput = Readonly<{ target?: string; url?: string; publishableKey?: string }>;
export function verifyHostedAuthorization(
  input: HostedAuthorizationInput,
  fetcher?: typeof fetch,
): Promise<Readonly<{ origin: string; status: number; anonymousContextDenied: true }>>;
