type RuntimeEnvironment = Record<string, string | undefined>;

function isAbsoluteUrl(
  value: string,
  allowedProtocols: readonly string[],
): boolean {
  try {
    const url = new URL(value);
    return allowedProtocols.includes(url.protocol);
  } catch {
    return false;
  }
}

export function validateRuntimeEnvironment(env: RuntimeEnvironment): void {
  if (env.NODE_ENV !== "production") return;

  const errors: string[] = [];
  const requiredVariables = [
    "APP_BASE_URL",
    "DATABASE_URL",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_API_KEY",
    "AVIASALES_PARTNER_ID",
  ] as const;

  for (const variable of requiredVariables) {
    if (!env[variable]?.trim()) {
      errors.push(`${variable} is required`);
    }
  }

  if (env.CRITICAL_DATA_PERSISTENCE !== "database") {
    errors.push("CRITICAL_DATA_PERSISTENCE must be database");
  }

  if (
    env.APP_BASE_URL &&
    !isAbsoluteUrl(env.APP_BASE_URL, ["http:", "https:"])
  ) {
    errors.push("APP_BASE_URL must be an absolute HTTP(S) URL");
  }

  if (
    env.DATABASE_URL &&
    !isAbsoluteUrl(env.DATABASE_URL, ["postgres:", "postgresql:"])
  ) {
    errors.push("DATABASE_URL must be a PostgreSQL URL");
  }

  if (env.SUPABASE_URL && !isAbsoluteUrl(env.SUPABASE_URL, ["https:"])) {
    errors.push("SUPABASE_URL must be an HTTPS URL");
  }

  if (
    env.AVIASALES_PARTNER_ID &&
    !/^[A-Za-z0-9_-]{1,64}$/.test(env.AVIASALES_PARTNER_ID)
  ) {
    errors.push("AVIASALES_PARTNER_ID has an invalid format");
  }

  if (env.PORT) {
    const port = Number(env.PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65_535) {
      errors.push("PORT must be an integer between 1 and 65535");
    }
  }

  if (env.HOST !== undefined && !env.HOST.trim()) {
    errors.push("HOST cannot be empty");
  }

  if (errors.length > 0) {
    throw new Error(`Invalid production environment: ${errors.join("; ")}`);
  }
}
