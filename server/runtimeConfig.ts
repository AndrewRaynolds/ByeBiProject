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
    "STRIPE_SECRET_KEY",
    "STRIPE_PUBLISHABLE_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "PRINTFUL_API_KEY",
    "PRINTFUL_WEBHOOK_SECRET",
    "AVIASALES_PARTNER_ID",
    "AMADEUS_API_KEY_LIVE",
    "AMADEUS_API_SECRET_LIVE",
  ] as const;

  for (const variable of requiredVariables) {
    if (!env[variable]?.trim()) {
      errors.push(`${variable} is required`);
    }
  }

  const merchandiseSalesMode = env.MERCHANDISE_SALES_MODE;
  if (!merchandiseSalesMode) {
    errors.push("MERCHANDISE_SALES_MODE is required");
  } else if (!["disabled", "test", "live"].includes(merchandiseSalesMode)) {
    errors.push("MERCHANDISE_SALES_MODE must be disabled, test, or live");
  }

  if (merchandiseSalesMode === "test") {
    if (env.STRIPE_SECRET_KEY && !env.STRIPE_SECRET_KEY.startsWith("sk_test_")) {
      errors.push("STRIPE_SECRET_KEY must be a Stripe test key in test sales mode");
    }
    if (
      env.STRIPE_PUBLISHABLE_KEY &&
      !env.STRIPE_PUBLISHABLE_KEY.startsWith("pk_test_")
    ) {
      errors.push("STRIPE_PUBLISHABLE_KEY must be a Stripe test key in test sales mode");
    }
  }

  if (merchandiseSalesMode === "live") {
    if (env.PRINTFUL_CONFIRM_ORDERS !== "true") {
      errors.push("PRINTFUL_CONFIRM_ORDERS must be true in live sales mode");
    }
    if (env.STRIPE_SECRET_KEY && !env.STRIPE_SECRET_KEY.startsWith("sk_live_")) {
      errors.push("STRIPE_SECRET_KEY must be a Stripe live key in live sales mode");
    }
    if (
      env.STRIPE_PUBLISHABLE_KEY &&
      !env.STRIPE_PUBLISHABLE_KEY.startsWith("pk_live_")
    ) {
      errors.push("STRIPE_PUBLISHABLE_KEY must be a Stripe live key in live sales mode");
    }

    for (const variable of [
      "VITE_SELLER_LEGAL_NAME",
      "VITE_SELLER_CONTACT_EMAIL",
      "VITE_SELLER_LEGAL_ADDRESS",
      "VITE_SELLER_COUNTRY",
    ] as const) {
      if (!env[variable]?.trim()) {
        errors.push(`${variable} is required in live sales mode`);
      }
    }

    if (
      env.VITE_SELLER_CONTACT_EMAIL &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.VITE_SELLER_CONTACT_EMAIL)
    ) {
      errors.push("VITE_SELLER_CONTACT_EMAIL must be a valid email address");
    }
  }

  const transactionalEmailMode = env.TRANSACTIONAL_EMAIL_MODE || "disabled";
  if (!["disabled", "test", "live"].includes(transactionalEmailMode)) {
    errors.push("TRANSACTIONAL_EMAIL_MODE must be disabled, test, or live");
  }
  if (merchandiseSalesMode === "live" && transactionalEmailMode !== "live") {
    errors.push("TRANSACTIONAL_EMAIL_MODE must be live when merchandise sales are live");
  }
  if (transactionalEmailMode === "test" || transactionalEmailMode === "live") {
    if (!env.RESEND_API_KEY?.trim()) errors.push("RESEND_API_KEY is required when transactional email is enabled");
    if (!env.TRANSACTIONAL_EMAIL_FROM?.trim()) {
      errors.push("TRANSACTIONAL_EMAIL_FROM is required when transactional email is enabled");
    }
  }
  if (transactionalEmailMode === "test" && !env.TRANSACTIONAL_EMAIL_TEST_RECIPIENT?.trim()) {
    errors.push("TRANSACTIONAL_EMAIL_TEST_RECIPIENT is required in test email mode");
  }

  if (env.CRITICAL_DATA_PERSISTENCE !== "database") {
    errors.push("CRITICAL_DATA_PERSISTENCE must be database");
  }

  if (env.AMADEUS_ENV !== "production") {
    errors.push("AMADEUS_ENV must be production");
  }

  if (
    env.APP_BASE_URL &&
    !isAbsoluteUrl(env.APP_BASE_URL, ["https:"])
  ) {
    errors.push("APP_BASE_URL must be an absolute HTTPS URL");
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

  if (
    env.VITE_BOOKING_AFFILIATE_ID &&
    !/^\d{1,20}$/.test(env.VITE_BOOKING_AFFILIATE_ID)
  ) {
    errors.push("VITE_BOOKING_AFFILIATE_ID has an invalid format");
  }

  if (
    env.PRINTFUL_WEBHOOK_SECRET &&
    env.PRINTFUL_WEBHOOK_SECRET.length < 32
  ) {
    errors.push("PRINTFUL_WEBHOOK_SECRET must be at least 32 characters");
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
