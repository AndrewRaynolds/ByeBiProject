import { z } from "zod";

export const tripPreferenceNotesSchema = z.array(z.string().trim().min(1).max(100)).max(20);
export const tripPreferencesPatchSchema = z.object({
  notes: tripPreferenceNotesSchema,
  expectedRevision: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();

// Historical notes are read intact; new-write limits must not truncate legacy data.
export const tripPreferencesSnapshotSchema = z.object({
  notes: z.array(z.string()).nullable(),
  revision: z.string().regex(/^[a-f0-9]{64}$/),
}).strict();
export type TripPreferencesPatch = z.infer<typeof tripPreferencesPatchSchema>;
export type TripPreferencesSnapshot = z.infer<typeof tripPreferencesSnapshotSchema>;
export type TripPreferencesUpdateResult =
  | { status: "not_found" }
  | { status: "conflict" | "updated"; preferences: TripPreferencesSnapshot };

export function preferenceNotesEqual(left: string[] | null, right: string[] | null): boolean {
  return JSON.stringify((left ?? []).map((note) => note.trim())) ===
    JSON.stringify((right ?? []).map((note) => note.trim()));
}
