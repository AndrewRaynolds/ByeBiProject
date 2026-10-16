import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Compass, ExternalLink, Hotel, Link2, Pencil, Plane, Plus, Trash2 } from "lucide-react";
import { getCityDefinition } from "@shared/cityMapping";
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

const categoryIcons = { flight: Plane, hotel: Hotel, activities: Compass };
const labelStyles = "block text-sm font-semibold leading-6 text-foreground sm:text-base";
const fieldStyles = "mt-2 min-h-12 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-base font-medium text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-base";

type PreviewRequest = {
  url: string;
  generation: number;
  before: Pick<Draft, "title" | "source" | "description" | "imageUrl">;
};

// Only an actual source/user image represents the specific offer.
// The fallback illustrates the category and repeats the user's saved title, not a random property or activity.
function OptionCover({
  category, imageUrl, title, source,
}: {
  category: Draft["category"];
  imageUrl?: string | null;
  title?: string;
  source?: string;
}) {
  const { t } = useTranslation();
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const Icon = categoryIcons[category] ?? Compass;
  const parsedImage = tripOptionUrlSchema.safeParse(imageUrl);
  const suppliedImage = parsedImage.success && !failedUrls.includes(parsedImage.data) ? parsedImage.data : null;
  const imageHost = suppliedImage ? new URL(suppliedImage).hostname : null;
  return (
    <div className="relative aspect-[16/9] overflow-hidden bg-gradient-to-br from-primary/15 via-background to-muted text-foreground">
      {suppliedImage ? (
        <>
          <img src={suppliedImage} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer"
            onError={() => setFailedUrls((previous) => previous.includes(suppliedImage) ? previous : [...previous, suppliedImage])}
            className="h-full w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />
        </>
      ) : (
        <div className="absolute inset-0 flex items-center gap-4 px-6 pb-12 pt-14 sm:px-8">
          <div className="relative z-10 min-w-0 flex-1">
            <p className="line-clamp-2 break-words font-display text-lg font-semibold leading-snug text-foreground sm:text-2xl">
              {title?.trim() || t(`tripOptions.${category}`)}
            </p>
            {source?.trim() && <p className="mt-2 truncate text-sm font-medium text-muted-foreground">{source}</p>}
          </div>
          <div className="shrink-0 rounded-2xl border border-primary/20 bg-primary/10 p-3 sm:p-5">
            <Icon aria-hidden="true" className="h-12 w-12 text-primary sm:h-16 sm:w-16" strokeWidth={1.5} />
          </div>
        </div>
      )}
      <span className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-xs font-semibold text-foreground shadow-soft">
        <Icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />{t(`tripOptions.${category}`)}
      </span>
      {suppliedImage ? (
        <span className="absolute bottom-3 left-4 right-4 truncate rounded-md bg-background/95 px-2.5 py-1 text-xs font-semibold text-foreground" title={imageHost!}>
          {t("tripOptions.imageOrigin")}: {imageHost}
        </span>
      ) : (
        <span className="absolute bottom-3 right-4 rounded-full border border-border bg-background/95 px-2.5 py-1 text-xs font-semibold text-foreground">
          {t("tripOptions.illustrativeImage")}
        </span>
      )}
    </div>
  );
}

// A search page is not a property. Only use the saved destination when the URL agrees.
function bookingSearchDestination(url: string, title: string, destinations: string[]) {
  if (!/^(www\.)?booking\.com$/i.test(title.trim())) return null;
  try {
    const parsed = new URL(url);
    if (!/^(www\.)?booking\.com$/i.test(parsed.hostname) ||
        !/^\/searchresults(?:\.[a-z]{2}(?:-[a-z]{2})?)?\.html$/i.test(parsed.pathname)) return null;
    const searches = parsed.searchParams.getAll("ss");
    if (searches.length !== 1) return null;
    return destinations.find((destination) => destination.trim() &&
      destination.trim().toLocaleLowerCase() === searches[0].trim().toLocaleLowerCase())?.trim() ?? null;
  } catch { return null; }
}

export default function TripOptions({ tripId, destinations = [] }: { tripId: number; destinations?: string[] }) {
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
  const previewGeneration = useRef(0);
  const editedFields = useRef(new Set<keyof Draft>());
  useEffect(() => () => { previewGeneration.current += 1; }, []);
  const contextualTitle = (url: string, title: string) => {
    const destination = bookingSearchDestination(url, title, destinations);
    if (!destination) return title;
    const city = getCityDefinition(destination);
    return t("tripOptions.accommodationIn", {
      destination: city ? t(`destinations.city.${city.translationKey}.name`) : destination,
    });
  };

  const reset = () => {
    previewGeneration.current += 1;
    editedFields.current.clear();
    setFormOpen(false);
    setEditingId(null);
    setDraft(emptyDraft);
    setPreviewError("");
    setSaveError("");
  };
  const update = (part: Partial<Draft>) => {
    for (const field of Object.keys(part) as (keyof Draft)[]) {
      editedFields.current.add(field);
    }
    // Invalidate even A → B → A: equality at response time alone is insufficient.
    if (part.url !== undefined) {
      previewGeneration.current += 1;
      setPreviewError("");
    }
    setDraft((previous) => ({ ...previous, ...part }));
  };
  const preview = useMutation({
    mutationFn: async (request: PreviewRequest) => {
      const response = await apiRequest("POST", `${apiUrl}/preview`, { url: request.url });
      return tripOptionPreviewSchema.parse(await response.json());
    },
    onSuccess: (result: TripOptionPreview, request: PreviewRequest) => {
      if (request.generation !== previewGeneration.current) return;
      setDraft((current) => {
        // Ignore previews for an earlier link, and never replace fields the user filled in.
        if (request.generation !== previewGeneration.current || current.url.trim() !== request.url) return current;
        const suggested = (field: keyof PreviewRequest["before"], value: string) =>
          current[field] === request.before[field] && !request.before[field].trim() &&
          !editedFields.current.has(field)
            ? value : current[field];
        return {
          ...current,
          url: result.url,
          title: suggested("title", contextualTitle(result.url, result.title)),
          source: suggested("source", result.source),
          description: suggested("description", result.description ?? ""),
          imageUrl: suggested("imageUrl", result.imageUrl ?? ""),
        };
      });
      setPreviewError(result.available ? "" : t("tripOptions.previewFallback"));
    },
    onError: (_error, request: PreviewRequest) => {
      if (request.generation === previewGeneration.current) setPreviewError(t("tripOptions.previewError"));
    },
  });

  const startPreview = (url: string) => {
    const parsedUrl = tripOptionUrlSchema.safeParse(url.trim());
    if (!parsedUrl.success) {
      setPreviewError(t("tripOptions.invalid"));
      return;
    }
    setPreviewError("");
    preview.mutate({
      url: parsedUrl.data,
      generation: ++previewGeneration.current,
      before: {
        title: draft.title, source: draft.source,
        description: draft.description, imageUrl: draft.imageUrl,
      },
    });
  };
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
          <Button type="button" onClick={() => { previewGeneration.current += 1; editedFields.current.clear(); setDraft(emptyDraft); setEditingId(null); setFormOpen(true); }}>
            <Plus className="mr-2 h-4 w-4" />{t("tripOptions.add")}
          </Button>
        )}
      </div>
      {formOpen && (
        <Card>
          <CardHeader><CardTitle>{editingId === null ? t("tripOptions.add") : t("tripOptions.edit")}</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4 [color-scheme:light]">
              <label className={labelStyles}>{t("tripOptions.category")}
                <select className={fieldStyles} value={draft.category}
                  onChange={(e) => update({ category: e.target.value as Draft["category"] })}>
                  {(["flight", "hotel", "activities"] as const).map((kind) =>
                    <option key={kind} value={kind}>{t(`tripOptions.${kind}`)}</option>)}
                </select>
              </label>
              <div className="space-y-2">
                <label htmlFor="trip-option-url" className={labelStyles}>{t("tripOptions.url")}</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input id="trip-option-url" type="url" required maxLength={2048} value={draft.url}
                    placeholder="https://..." onChange={(e) => update({ url: e.target.value })}
                    onPaste={(e) => {
                      const pasted = e.clipboardData.getData("text").trim();
                      if (tripOptionUrlSchema.safeParse(pasted).success) {
                        // Apply exactly the URL being previewed, including replacement pastes.
                        e.preventDefault();
                        update({ url: pasted });
                        startPreview(pasted);
                      }
                    }}
                    className={`${fieldStyles} mt-0 min-w-0 flex-1`} />
                  <Button type="button" variant="outline" disabled={preview.isPending || !draft.url.trim()}
                    onClick={() => startPreview(draft.url)}>
                    <Link2 className="mr-2 h-4 w-4" />
                    {preview.isPending ? t("tripOptions.loading") : t("tripOptions.getPreview")}
                  </Button>
                </div>
                {previewError && <p role="status" className="text-sm text-amber-800">{previewError}</p>}
              </div>
              <div>
                <label htmlFor="trip-option-image" className={labelStyles}>{t("tripOptions.imageUrl")}</label>
                <Input id="trip-option-image" aria-describedby="trip-option-image-help" type="url" maxLength={2048} value={draft.imageUrl} placeholder="https://..."
                  onChange={(e) => update({ imageUrl: e.target.value })}
                  className={fieldStyles} />
                <p id="trip-option-image-help" className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("tripOptions.imageHelp")}</p>
              </div>
              {draft.imageUrl && tripOptionUrlSchema.safeParse(draft.imageUrl).success && (
                <div className="overflow-hidden rounded-lg"><OptionCover category={draft.category} imageUrl={draft.imageUrl} title={draft.title} source={draft.source} /></div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className={labelStyles}>{t("tripOptions.optionTitle")}
                  <Input required maxLength={160} value={draft.title} onChange={(e) => update({ title: e.target.value })}
                    className={fieldStyles} />
                </label>
                <label className={labelStyles}>{t("tripOptions.source")}
                  <Input required maxLength={100} value={draft.source} onChange={(e) => update({ source: e.target.value })}
                    className={fieldStyles} />
                </label>
              </div>
              <label className={labelStyles}>{t("tripOptions.description")}
                <Textarea maxLength={500} rows={2} value={draft.description} onChange={(e) => update({ description: e.target.value })}
                  className={fieldStyles} />
              </label>
              <label className={labelStyles}>{t("tripOptions.priceNote")}
                <Input maxLength={100} value={draft.priceNote} onChange={(e) => update({ priceNote: e.target.value })}
                  className={fieldStyles} />
              </label>
              <label className={labelStyles}>{t("tripOptions.notes")}
                <Textarea maxLength={500} rows={2} value={draft.notes} onChange={(e) => update({ notes: e.target.value })}
                  className={fieldStyles} />
              </label>
              <p className="text-sm leading-relaxed text-muted-foreground">{t("tripOptions.disclaimer")}</p>
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
              <OptionCover category={option.category as Draft["category"]} imageUrl={option.imageUrl} title={contextualTitle(option.url, option.title)} source={option.source} />
              <CardContent className="flex flex-1 flex-col p-5 sm:p-6">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{option.source}</span>
                </p>
                <h3 className="break-words font-display text-xl font-semibold leading-snug">{contextualTitle(option.url, option.title)}</h3>
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
                        previewGeneration.current += 1; editedFields.current.clear(); setEditingId(option.id); setDraft(fromOption(option)); setPreviewError(""); setSaveError(""); setFormOpen(true);
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
