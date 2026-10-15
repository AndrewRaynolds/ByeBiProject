import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Compass, ExternalLink, Hotel, Link2, Pencil, Plane, Plus, Trash2 } from "lucide-react";
import type { TripCandidateOption } from "@shared/schema";
import {
  tripOptionInputSchema,
  tripOptionPreviewSchema,
  tripOptionUrlSchema,
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

const categoryCovers = {
  flight: "https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=900&h=500&q=85",
  hotel: "https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=900&h=500&q=85",
  activities: "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=900&h=500&q=85",
};
const categoryIcons = { flight: Plane, hotel: Hotel, activities: Compass };

function OptionCover({ category, imageUrl }: { category: Draft["category"]; imageUrl?: string | null }) {
  const { t } = useTranslation();
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const Icon = categoryIcons[category] ?? Compass;
  const suppliedImage = imageUrl && !failedUrls.includes(imageUrl) ? imageUrl : null;
  const cover = suppliedImage || categoryCovers[category];
  const showImage = cover && !failedUrls.includes(cover);
  return (
    <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/20 via-muted to-primary/5">
      {showImage ? (
        <img src={cover} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"
          onError={() => setFailedUrls((previous) => [...previous, cover])}
          className="h-full w-full object-cover" />
      ) : <Icon aria-hidden="true" className="absolute right-8 top-8 h-24 w-24 -rotate-12 text-primary/20" strokeWidth={1} />}
      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
      <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-soft">
        <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />{t(`tripOptions.${category}`)}
      </span>
      {!suppliedImage && showImage && <span className="absolute bottom-3 right-4 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white">{t("tripOptions.illustrativeImage")}</span>}
    </div>
  );
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
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{t("tripOptions.intro")}</p>
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
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData("text").trim();
                      if (tripOptionUrlSchema.safeParse(pasted).success) {
                        setPreviewError("");
                        preview.mutate(pasted);
                      }
                    }}
                    className="min-w-0 flex-1 rounded-md border px-3 py-2 text-base" />
                  <Button type="button" variant="outline" disabled={preview.isPending || !draft.url.trim()}
                    onClick={() => { setPreviewError(""); preview.mutate(draft.url.trim()); }}>
                    <Link2 className="mr-2 h-4 w-4" />
                    {preview.isPending ? t("tripOptions.loading") : t("tripOptions.getPreview")}
                  </Button>
                </div>
                {previewError && <p role="status" className="text-sm text-amber-800">{previewError}</p>}
              </div>
              <div>
                <label htmlFor="trip-option-image" className="block text-sm font-medium">{t("tripOptions.imageUrl")}</label>
                <input id="trip-option-image" aria-describedby="trip-option-image-help" type="url" maxLength={2048} value={draft.imageUrl} placeholder="https://..."
                  onChange={(e) => update({ imageUrl: e.target.value })}
                  className="mt-1 w-full rounded-md border px-3 py-2 text-base" />
                <p id="trip-option-image-help" className="mt-1 text-xs text-muted-foreground">{t("tripOptions.imageHelp")}</p>
              </div>
              {draft.imageUrl && tripOptionUrlSchema.safeParse(draft.imageUrl).success && (
                <div className="overflow-hidden rounded-lg"><OptionCover category={draft.category} imageUrl={draft.imageUrl} /></div>
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
        <div className="grid items-stretch gap-6 md:grid-cols-2">
          {options.map((option) => (
            <Card key={option.id} className="flex min-w-0 flex-col overflow-hidden rounded-xl border-border/70">
              <OptionCover category={option.category as Draft["category"]} imageUrl={option.imageUrl} />
              <CardContent className="flex flex-1 flex-col p-5 sm:p-6">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{option.source}</span>
                </p>
                <h3 className="break-words font-display text-xl font-semibold leading-snug">{option.title}</h3>
                {option.description && <p className="mt-2 line-clamp-3 break-words text-sm leading-relaxed text-muted-foreground">{option.description}</p>}
                {option.priceNote && <p className="mt-4 rounded-lg bg-primary/5 px-3 py-2 text-sm font-medium">{t("tripOptions.observedPrice")}: {option.priceNote}</p>}
                {option.notes && <p className="mt-3 whitespace-pre-line break-words border-l-2 border-primary/25 pl-3 text-sm leading-relaxed text-muted-foreground">{option.notes}</p>}
                <div className="mt-auto pt-5">
                  <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
                    <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-primary" />{t("tripOptions.considering")}
                  </p>
                  <div className="flex items-center gap-2 border-t border-border/70 pt-4">
                    <Button asChild variant="external" className="min-h-11 flex-1 whitespace-normal">
                      <a href={option.url} target="_blank" rel="noopener noreferrer">
                        {t("tripOptions.open")}<ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
                      </a>
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0"
                      aria-label={t("tripOptions.edit")} title={t("tripOptions.edit")} onClick={() => {
                        setEditingId(option.id); setDraft(fromOption(option)); setPreviewError(""); setSaveError(""); setFormOpen(true);
                      }}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label={t("tripOptions.delete")} title={t("tripOptions.delete")} disabled={remove.isPending}
                      onClick={() => { if (window.confirm(t("tripOptions.confirmDelete"))) remove.mutate(option.id); }}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
