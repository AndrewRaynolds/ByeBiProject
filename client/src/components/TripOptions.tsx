import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ExternalLink, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import type { TripCandidateOption } from "@shared/schema";
import {
  tripOptionInputSchema,
  tripOptionPreviewSchema,
  type TripOptionInput,
  type TripOptionPreview,
} from "@shared/tripOptionSchemas";
import { useTranslation } from "@/contexts/LanguageContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Draft = {
  category: TripOptionInput["category"];
  url: string;
  title: string;
  source: string;
  description: string;
  imageUrl: string;
  priceNote: string;
  notes: string;
};
const emptyDraft: Draft = {
  category: "flight", url: "", title: "", source: "", description: "",
  imageUrl: "", priceNote: "", notes: "",
};

function fromOption(option: TripCandidateOption): Draft {
  return {
    category: option.category as Draft["category"], url: option.url,
    title: option.title, source: option.source,
    description: option.description ?? "", imageUrl: option.imageUrl ?? "",
    priceNote: option.priceNote ?? "", notes: option.notes ?? "",
  };
}

export default function TripOptions({ tripId }: { tripId: number }) {
  const { t } = useTranslation();
  const apiUrl = `/api/trips/${tripId}/options`;
  const { data: options, isLoading, error } = useQuery<TripCandidateOption[]>({
    queryKey: [apiUrl],
    enabled: Number.isInteger(tripId) && tripId > 0,
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [previewError, setPreviewError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [deleteError, setDeleteError] = useState("");

  const reset = () => {
    setFormOpen(false);
    setEditingId(null);
    setDraft(emptyDraft);
    setPreviewError("");
    setSaveError("");
  };
  const update = (part: Partial<Draft>) => setDraft((previous) => ({ ...previous, ...part }));
  const preview = useMutation({
    mutationFn: async (url: string) => {
      const response = await apiRequest("POST", `${apiUrl}/preview`, { url });
      return tripOptionPreviewSchema.parse(await response.json());
    },
    onSuccess: (result: TripOptionPreview) => {
      setPreviewError(result.available ? "" : t("tripOptions.previewFallback"));
      setDraft((current) => ({
        ...current, url: result.url, title: result.title, source: result.source,
        description: result.description ?? "", imageUrl: result.imageUrl ?? "",
      }));
    },
    onError: () => setPreviewError(t("tripOptions.previewError")),
  });
  const save = useMutation({
    mutationFn: async (payload: TripOptionInput) => {
      const response = await apiRequest(editingId === null ? "POST" : "PATCH",
        editingId === null ? apiUrl : `${apiUrl}/${editingId}`, payload);
      return response.json();
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [apiUrl] });
      reset();
    },
    onError: () => setSaveError(t("tripOptions.saveError")),
  });
  const remove = useMutation({
    mutationFn: (optionId: number) => apiRequest("DELETE", `${apiUrl}/${optionId}`),
    onSuccess: () => {
      setDeleteError("");
      void queryClient.invalidateQueries({ queryKey: [apiUrl] });
    },
    onError: () => setDeleteError(t("tripOptions.deleteError")),
  });

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = tripOptionInputSchema.safeParse({
      category: draft.category, url: draft.url.trim(),
      title: draft.title.trim(), source: draft.source.trim(),
      description: draft.description.trim() || null,
      imageUrl: draft.imageUrl.trim() || null,
      priceNote: draft.priceNote.trim() || null,
      notes: draft.notes.trim() || null,
    });
    if (!result.success) { setSaveError(t("tripOptions.invalid")); return; }
    setSaveError("");
    save.mutate(result.data);
  };

  return (
    <section aria-labelledby="trip-options-heading" className="mb-8 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="trip-options-heading" className="text-2xl font-bold">{t("tripOptions.title")}</h2>
          <p className="mt-1 text-sm text-gray-600">{t("tripOptions.intro")}</p>
        </div>
        {!formOpen && (
          <Button type="button" onClick={() => { setDraft(emptyDraft); setEditingId(null); setFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />{t("tripOptions.add")}
          </Button>
        )}
      </div>
      {formOpen && (
        <Card>
          <CardHeader><CardTitle>{editingId === null ? t("tripOptions.add") : t("tripOptions.edit")}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <label className="block text-sm font-medium">{t("tripOptions.category")}
                <select className="mt-1 w-full rounded-md border px-3 py-2 text-base" value={draft.category}
                  onChange={(e) => update({ category: e.target.value as Draft["category"] })}>
                  {(["flight", "hotel", "activities"] as const).map((kind) =>
                    <option key={kind} value={kind}>{t(`tripOptions.${kind}`)}</option>)}
                </select>
              </label>
              <div className="space-y-2">
                <label htmlFor="trip-option-url" className="block text-sm font-medium">{t("tripOptions.url")}</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input id="trip-option-url" type="url" required maxLength={2048} value={draft.url}
                    placeholder="https://..." onChange={(e) => update({ url: e.target.value })}
                    className="min-w-0 flex-1 rounded-md border px-3 py-2 text-base" />
                  <Button type="button" variant="outline" disabled={preview.isPending || !draft.url.trim()}
                    onClick={() => { setPreviewError(""); preview.mutate(draft.url.trim()); }}>
                    <Link2 className="mr-2 h-4 w-4" />
                    {preview.isPending ? t("tripOptions.loading") : t("tripOptions.getPreview")}
                  </Button>
                </div>
                {previewError && <p role="status" className="text-sm text-amber-800">{previewError}</p>}
              </div>
              {draft.imageUrl && (
                <img src={draft.imageUrl} alt="" className="max-h-40 w-full rounded-md border object-contain" referrerPolicy="no-referrer" />
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium">{t("tripOptions.optionTitle")}
                  <input required maxLength={160} value={draft.title} onChange={(e) => update({ title: e.target.value })}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-base" />
                </label>
                <label className="block text-sm font-medium">{t("tripOptions.source")}
                  <input required maxLength={100} value={draft.source} onChange={(e) => update({ source: e.target.value })}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-base" />
                </label>
              </div>
              <label className="block text-sm font-medium">{t("tripOptions.description")}
                <textarea maxLength={500} rows={2} value={draft.description} onChange={(e) => update({ description: e.target.value })}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-base" />
              </label>
              <label className="block text-sm font-medium">{t("tripOptions.priceNote")}
                <input maxLength={100} value={draft.priceNote} onChange={(e) => update({ priceNote: e.target.value })}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-base" />
              </label>
              <label className="block text-sm font-medium">{t("tripOptions.notes")}
                <textarea maxLength={500} rows={2} value={draft.notes} onChange={(e) => update({ notes: e.target.value })}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-base" />
              </label>
              <p className="text-xs text-gray-600">{t("tripOptions.disclaimer")}</p>
              {saveError && <p role="alert" className="text-sm text-red-700">{saveError}</p>}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={save.isPending || preview.isPending}>{save.isPending ? t("tripOptions.saving") : t("tripOptions.save")}</Button>
                <Button type="button" variant="outline" onClick={reset}>{t("tripOptions.cancel")}</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      {deleteError && <p role="alert" className="text-sm text-red-700">{deleteError}</p>}
      {error && <p role="alert" className="text-sm text-red-700">{t("tripOptions.loadError")}</p>}
      {isLoading && <p role="status" className="text-sm text-gray-600">{t("tripOptions.loading")}</p>}
      {!isLoading && !error && !options?.length && <p className="text-sm text-gray-600">{t("tripOptions.empty")}</p>}
      {!!options?.length && (
        <div className="grid gap-4 md:grid-cols-2">
          {options.map((option) => (
            <Card key={option.id} className="overflow-hidden">
              {option.imageUrl && <img src={option.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-36 w-full object-cover" />}
              <CardContent className="space-y-2 pt-5">
                <p className="text-xs font-semibold uppercase text-gray-500">{t(`tripOptions.${option.category}`)} · {option.source}</p>
                <h3 className="break-words font-bold">{option.title}</h3>
                {option.description && <p className="text-sm text-gray-600">{option.description}</p>}
                {option.priceNote && <p className="text-sm">{t("tripOptions.observedPrice")}: {option.priceNote}</p>}
                {option.notes && <p className="text-sm">{option.notes}</p>}
                <p className="text-xs font-medium text-gray-600">{t("tripOptions.considering")}</p>
                <div className="flex flex-wrap gap-2">
                  <a href={option.url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex min-h-10 items-center rounded-md border px-3 py-2 text-sm font-semibold hover:bg-gray-50">
                    <ExternalLink className="mr-2 h-4 w-4" />{t("tripOptions.open")}
                  </a>
                  <Button type="button" variant="outline" onClick={() => {
                    setEditingId(option.id); setDraft(fromOption(option)); setPreviewError(""); setSaveError(""); setFormOpen(true);
                  }}>
                    <Pencil className="mr-2 h-4 w-4" />{t("tripOptions.edit")}
                  </Button>
                  <Button type="button" variant="outline" disabled={remove.isPending}
                    onClick={() => { if (window.confirm(t("tripOptions.confirmDelete"))) remove.mutate(option.id); }}>
                    <Trash2 className="mr-2 h-4 w-4" />{t("tripOptions.delete")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
