type RuntimeEnvironment = Record<string, string | undefined>;

export type AmadeusEnvironment = "production" | "test";
export type AmadeusCredentialSource = "live" | "test" | "legacy" | "missing";

export class AmadeusConfigurationError extends Error {
  readonly code = "AMADEUS_CREDENTIALS_MISSING";

  constructor(environment: AmadeusEnvironment) {
    super(`Amadeus ${environment} credentials are not configured`);
    this.name = "AmadeusConfigurationError";
  }
}

export function resolveAmadeusEnvironment(env: RuntimeEnvironment): AmadeusEnvironment {
  const configured = env.AMADEUS_ENV?.trim().toLowerCase();
  if (["production", "prod", "live"].includes(configured ?? "")) return "production";
  if (["test", "sandbox", "development", "dev"].includes(configured ?? "")) return "test";
  return env.NODE_ENV === "production" ? "production" : "test";
}

function configuredPair(key?: string, secret?: string): { apiKey: string; apiSecret: string } | null {
  const apiKey = key?.trim();
  const apiSecret = secret?.trim();
  return apiKey && apiSecret ? { apiKey, apiSecret } : null;
}

export function resolveAmadeusConfig(env: RuntimeEnvironment = process.env): {
  environment: AmadeusEnvironment;
  baseUrl: string;
  credentialSource: AmadeusCredentialSource;
  apiKey?: string;
  apiSecret?: string;
} {
  const environment = resolveAmadeusEnvironment(env);
  const preferred = environment === "production"
    ? configuredPair(env.AMADEUS_API_KEY_LIVE, env.AMADEUS_API_SECRET_LIVE)
    : configuredPair(env.AMADEUS_API_KEY_TEST, env.AMADEUS_API_SECRET_TEST);
  const legacy = configuredPair(env.AMADEUS_API_KEY, env.AMADEUS_API_SECRET);
  const credentials = preferred ?? legacy;
  const credentialSource: AmadeusCredentialSource = preferred
    ? environment === "production" ? "live" : "test"
    : legacy
      ? "legacy"
      : "missing";

  return {
    environment,
    baseUrl: environment === "production" ? "https://api.amadeus.com" : "https://test.api.amadeus.com",
    credentialSource,
    ...(credentials ?? {}),
  };
}

export function getAmadeusRuntimeDiagnostics(env: RuntimeEnvironment = process.env) {
  const config = resolveAmadeusConfig(env);
  return {
    environment: config.environment,
    credentialSource: config.credentialSource,
    credentialsPresent: Boolean(config.apiKey && config.apiSecret),
    liveKeyPresent: Boolean(env.AMADEUS_API_KEY_LIVE?.trim()),
    liveSecretPresent: Boolean(env.AMADEUS_API_SECRET_LIVE?.trim()),
    testKeyPresent: Boolean(env.AMADEUS_API_KEY_TEST?.trim()),
    testSecretPresent: Boolean(env.AMADEUS_API_SECRET_TEST?.trim()),
    legacyKeyPresent: Boolean(env.AMADEUS_API_KEY?.trim()),
    legacySecretPresent: Boolean(env.AMADEUS_API_SECRET?.trim()),
  };
}

export function logAmadeusRuntimeDiagnostics(
  env: RuntimeEnvironment = process.env,
  logger: (message: string, metadata: ReturnType<typeof getAmadeusRuntimeDiagnostics>) => void = console.info,
): void {
  logger("Amadeus runtime configuration", getAmadeusRuntimeDiagnostics(env));
}
