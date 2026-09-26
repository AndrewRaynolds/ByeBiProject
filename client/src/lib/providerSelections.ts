import {
  PROVIDER_SELECTION_STORAGE_KEY,
  PROVIDER_SELECTION_VERSION,
  providerSelectionSchema,
  type ProviderSelections,
} from "@shared/providerSelectionSchemas";

export function loadProviderSelections(
  storage: Storage,
  searchFingerprint: string,
): ProviderSelections | null {
  const raw = storage.getItem(PROVIDER_SELECTION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = providerSelectionSchema.safeParse(JSON.parse(raw));
    if (parsed.success && parsed.data.searchFingerprint === searchFingerprint) {
      return parsed.data;
    }
  } catch {
    // Invalid persisted state is discarded below.
  }

  storage.removeItem(PROVIDER_SELECTION_STORAGE_KEY);
  return null;
}

export function saveProviderSelections(
  storage: Storage,
  value: Omit<ProviderSelections, "version" | "updatedAt">,
): ProviderSelections | null {
  if (!value.selectedFlight && !value.selectedHotel) {
    storage.removeItem(PROVIDER_SELECTION_STORAGE_KEY);
    return null;
  }

  const parsed = providerSelectionSchema.parse({
    ...value,
    version: PROVIDER_SELECTION_VERSION,
    updatedAt: new Date().toISOString(),
  });
  storage.setItem(PROVIDER_SELECTION_STORAGE_KEY, JSON.stringify(parsed));
  return parsed;
}
