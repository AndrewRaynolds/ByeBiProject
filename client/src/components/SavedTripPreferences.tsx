import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/LanguageContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { preferenceNotesEqual, tripPreferencesPatchSchema, tripPreferencesSnapshotSchema, type TripPreferencesSnapshot } from "@shared/tripPreferencesSchemas";

export default function SavedTripPreferences({ tripId, ownerId, notes }: { tripId: number; ownerId: string; notes: string[] }) {
  const { t } = useTranslation();
  const [snapshot, setSnapshot] = useState<TripPreferencesSnapshot | null>(null);
  const [pending, setPending] = useState(true);
  const [message, setMessage] = useState<"error" | "conflict" | "updated" | null>(null);
  const generation = useRef(0);
  const busy = useRef(false);
  const abort = useRef<AbortController | null>(null);

  const load = useCallback(async (conflict = false) => {
    abort.current?.abort();
    const controller = new AbortController(); abort.current = controller;
    const current = ++generation.current;
    busy.current = true; setPending(true); setSnapshot(null); setMessage(conflict ? "conflict" : null);
    try {
      const response = await apiRequest("GET", `/api/trips/${tripId}/preferences`, undefined, { signal: controller.signal });
      const value = tripPreferencesSnapshotSchema.parse(await response.json());
      if (current === generation.current) setSnapshot(value);
    } catch {
      if (current === generation.current) setMessage("error");
    } finally {
      if (current === generation.current) { busy.current = false; setPending(false); }
    }
  }, [tripId, ownerId]);

  useEffect(() => {
    void load();
    return () => { ++generation.current; abort.current?.abort(); busy.current = false; };
  }, [load]);

  const update = async () => {
    if (busy.current || !snapshot) return;
    const patch = tripPreferencesPatchSchema.safeParse({ notes, expectedRevision: snapshot.revision });
    if (!patch.success) return;
    const controller = new AbortController(); abort.current = controller;
    const current = ++generation.current;
    busy.current = true; setPending(true); setMessage(null);
    try {
      const response = await apiRequest("PATCH", `/api/trips/${tripId}/preferences`, patch.data, { signal: controller.signal });
      const value = tripPreferencesSnapshotSchema.parse(await response.json());
      if (current !== generation.current) return;
      // A malformed or mismatched acknowledgement must never look like a saved edit.
      if (!preferenceNotesEqual(value.notes, patch.data.notes)) throw new Error("Invalid preference acknowledgement");
      setSnapshot(value); setMessage("updated");
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: [`/api/trips/user/${ownerId}`] }),
        queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}`] }),
        queryClient.invalidateQueries({ queryKey: ["/api/trips/organization-statuses"] }),
        queryClient.invalidateQueries({ predicate: (query) => typeof query.queryKey[0] === "string" && query.queryKey[0].startsWith("/api/shared-trips/") }),
      ]).catch(() => { /* A cache failure must not repeat a successful write. */ });
    } catch (error) {
      if (current !== generation.current) return;
      if (typeof error === "object" && error !== null && "status" in error && error.status === 409) {
        await load(true);
      } else setMessage("error");
    } finally {
      if (current === generation.current) { busy.current = false; setPending(false); }
    }
  };

  const changed = snapshot && !preferenceNotesEqual(snapshot.notes, notes);
  const valid = tripPreferencesPatchSchema.safeParse({ notes, expectedRevision: snapshot?.revision }).success;
  return <section className="space-y-3 rounded-lg border border-border p-4" aria-labelledby="saved-preferences-title" data-testid="saved-trip-preferences">
    <h2 id="saved-preferences-title" className="font-semibold">{t("savedPreferences.title")}</h2>
    {pending && <p role="status">{t("common.loading")}</p>}
    {message && <p role={message === "error" ? "alert" : "status"} className="text-sm">{t(`savedPreferences.${message}`)}</p>}
    {!pending && snapshot && <>
      {changed ? <>
        <p className="text-sm">{t("savedPreferences.different")}</p>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <PreferenceList label={t("savedPreferences.saved")} notes={snapshot.notes} empty={t("savedPreferences.empty")} />
          <PreferenceList label={t("savedPreferences.draft")} notes={notes} empty={t("savedPreferences.empty")} />
        </div>
        <p className="text-sm text-muted-foreground">{t(notes.length ? "savedPreferences.replaceHelp" : "savedPreferences.removeHelp")}</p>
        {!valid && <p role="alert" className="text-sm">{t("savedPreferences.invalid")}</p>}
        <Button type="button" variant="outline" disabled={!valid} onClick={() => void update()} className="h-auto min-h-11 w-full whitespace-normal">{t(notes.length ? "savedPreferences.update" : "savedPreferences.remove")}</Button>
      </> : !message && <p role="status" className="text-sm">{t("savedPreferences.aligned")}</p>}
    </>}
    {!pending && <Button type="button" variant="ghost" onClick={() => void load()} className="h-auto min-h-11 whitespace-normal">{t("savedPreferences.reload")}</Button>}
  </section>;
}

function PreferenceList({ label, notes, empty }: { label: string; notes: string[] | null; empty: string }) {
  return <div className="min-w-0"><h3 className="text-sm font-semibold">{label}</h3>{notes?.length
    ? <ul className="list-inside list-disc break-words text-sm">{notes.map((note, index) => <li key={index}>{note}</li>)}</ul>
    : <p className="text-sm text-muted-foreground">{empty}</p>}</div>;
}
