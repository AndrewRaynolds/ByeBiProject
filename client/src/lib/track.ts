/**
 * Simple event tracking helper
 * For now, logs to console in a structured format
 * Can be extended to send to analytics backend later
 */
export function trackEvent(name: string, payload: Record<string, unknown>) {
  console.log("[track]", name, payload);
}
