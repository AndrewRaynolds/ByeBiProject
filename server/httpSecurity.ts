import helmet from "helmet";

type ContentSecurityPolicyOptions =
  | false
  | {
      directives: Record<string, string[]>;
    };

export function buildContentSecurityPolicy(
  nodeEnv: string | undefined,
  supabaseUrl: string | undefined,
): ContentSecurityPolicyOptions {
  if (nodeEnv !== "production") return false;

  const connectSources = [
    "'self'",
    "https://*.supabase.co",
    "wss://*.supabase.co",
  ];

  if (supabaseUrl) {
    try {
      const origin = new URL(supabaseUrl).origin;
      if (origin !== "null" && !connectSources.includes(origin)) {
        connectSources.push(origin);
      }
    } catch {
      // Environment validation reports malformed URLs; keep the baseline policy safe.
    }
  }

  return {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: [
        "'self'",
        "'unsafe-inline'",
        "https://fonts.googleapis.com",
      ],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: connectSources,
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [],
    },
  };
}

export function createHttpSecurityMiddleware() {
  return helmet({
    contentSecurityPolicy: buildContentSecurityPolicy(
      process.env.NODE_ENV,
      process.env.SUPABASE_URL,
    ),
    crossOriginResourcePolicy: { policy: "cross-origin" },
  });
}
