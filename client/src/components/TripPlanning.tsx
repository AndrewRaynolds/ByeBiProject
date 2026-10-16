import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Trip } from "@shared/schema";
import { budgetAllocationCategories, summarizeBudgetAllocations } from "@shared/budgetAllocationSchemas";
import { programIdeaCatalogIds, type ProgramDraft } from "@shared/programSchemas";
import { planningFitsTrip, tripPlanningSchema, tripPlanningSnapshotSchema, type TripPlanningSnapshot } from "@shared/tripPlanningSchemas";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/contexts/LanguageContext";
import { ApiError, apiRequest } from "@/lib/queryClient";
import { previewLocalTripPlanning } from "@/lib/tripPlanningImport";
import { ProgramItemForm } from "./EditorialProgram";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";

type Item = ProgramDraft["plannedItems"][number];
export default function TripPlanning({ trip }: { trip: Trip }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const owner = user?.id === trip.userId;
  const url = `/api/trips/${trip.id}/planning`;
  const query = useQuery({ queryKey: [url, user?.id], enabled: owner, staleTime: 0, gcTime: 0,
    queryFn: async () => tripPlanningSnapshotSchema.parse(await (await apiRequest("GET", url)).json()) });
  if (!owner) return null;
  if (!query.data) return <Card className="mb-8"><CardContent className="space-y-3 pt-6">
    <h2 className="text-2xl font-bold">{t("hubPlanning.title")}</h2>
    <p role={query.error ? "alert" : "status"}>{t(query.error ? "hubPlanning.error" : "hubPlanning.loading")}</p>
    {query.error && <Button className="h-auto min-h-11 whitespace-normal" onClick={() => void query.refetch()}>{t("hubPlanning.retry")}</Button>}
  </CardContent></Card>;
  return <PlanningEditor trip={trip} latest={query.data} reload={async () => {
    const response = await query.refetch();
    if (response.error || !response.data) throw new Error("Reload failed");
    return response.data;
  }} />;
}

function PlanningEditor({ trip, latest, reload }: { trip: Trip; latest: TripPlanningSnapshot; reload: () => Promise<TripPlanningSnapshot> }) {
  const { t, locale } = useTranslation(); const cache = useQueryClient();
  const [base, setBase] = useState(latest);
  const [plan, setPlan] = useState(latest.plan);
  const [cap, setCap] = useState(latest.plan.budgetPerPerson?.toString() ?? "");
  const fieldsFor = (value: typeof plan) => Object.fromEntries(budgetAllocationCategories.map((key) => [key, value.allocations[key]?.toString() ?? ""]));
  const [fields, setFields] = useState(() => fieldsFor(latest.plan));
  const [editing, setEditing] = useState<Item | null>(null); const [formVersion, setFormVersion] = useState(0);
  const [pending, setPending] = useState(false); const busy = useRef(false);
  const [dirty, setDirty] = useState(false); const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null); const [invalidItem, setInvalidItem] = useState(false);
  const [importPreview, setImportPreview] = useState<ReturnType<typeof previewLocalTripPlanning> | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const conflict = failure === "conflict" || latest.revision !== base.revision || latest.contextRevision !== base.contextRevision;
  const blocked = pending || conflict || failure === "error";
  const candidate = tripPlanningSchema.safeParse({ ...plan, budgetPerPerson: cap.trim() === "" ? null : Number(cap),
    allocations: Object.fromEntries(budgetAllocationCategories.map((key) => [key, fields[key].trim() === "" ? null : Number(fields[key])])) });
  const totals = candidate.success ? summarizeBudgetAllocations(candidate.data.allocations, candidate.data.budgetPerPerson, trip.participants) : null;
  const money = (v: number | null) => v === null ? t("allocation.unknown") : new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
  const markDirty = () => { setDirty(true); setMessage(null); };
  const apply = (snapshot: TripPlanningSnapshot) => {
    setBase(snapshot); setPlan(snapshot.plan); setCap(snapshot.plan.budgetPerPerson?.toString() ?? ""); setFields(fieldsFor(snapshot.plan));
    setEditing(null); setFormVersion((n) => n + 1); setDirty(false); setFailure(null); setInvalidItem(false); setImportPreview(null);
  };
  const save = async () => {
    if (busy.current || blocked || !candidate.success || editing) return;
    busy.current = true; setPending(true); setMessage(null); setFailure(null);
    try {
      const response = await apiRequest("PUT", `/api/trips/${trip.id}/planning`, {
        expectedRevision: base.revision, expectedContextRevision: base.contextRevision, plan: candidate.data,
      });
      const snapshot = tripPlanningSnapshotSchema.parse(await response.json());
      apply(snapshot); cache.setQueryData([`/api/trips/${trip.id}/planning`, trip.userId], snapshot);
      void cache.invalidateQueries({ queryKey: [`/api/trips/${trip.id}`] });
      void cache.invalidateQueries({ queryKey: [`/api/trips/user/${trip.userId}`] });
      setMessage("saved"); heading.current?.focus();
    } catch (error) { setFailure(error instanceof ApiError && error.status === 409 ? "conflict" : "error"); }
    finally { busy.current = false; setPending(false); }
  };
  const ideas: ProgramDraft["ideas"] = programIdeaCatalogIds.map((id) => ({ id, title: t(`program.idea.${id}`), durationMinutes: null,
    provenance: { kind: "editorial", catalogVersion: 1, catalogId: id } }));
  const items = [...plan.plannedItems].sort((a, b) => a.date.localeCompare(b.date) || ["morning", "afternoon", "evening"].indexOf(a.slot) - ["morning", "afternoon", "evening"].indexOf(b.slot));
  return <Card className="mb-8"><CardContent className="space-y-6 pt-6" aria-busy={pending}>
    <div className="space-y-2">
      <h2 ref={heading} tabIndex={-1} className="text-2xl font-bold">{t("hubPlanning.title")}</h2>
      <p className="text-sm text-muted-foreground">{t("hubPlanning.privacy")}</p>
      <p role="status">{t(dirty ? "hubPlanning.unsaved" : "hubPlanning.ready")}</p>
      {message && <p role="status">{t(`hubPlanning.${message}`)}</p>}
      {(conflict || failure) && <p role="alert">{t(`hubPlanning.${conflict ? "conflict" : failure}`)}</p>}
    </div>
    <section aria-labelledby="hub-budget" className="space-y-3">
      <h3 id="hub-budget" className="text-xl font-bold">{t("hubPlanning.budget")}</h3>
      <p className="text-sm">{t("hubPlanning.budgetHelp")}</p>
      <fieldset disabled={blocked} className="min-w-0 space-y-3">
        <legend className="sr-only">{t("hubPlanning.budget")}</legend>
        <label className="block text-sm">{t("hubPlanning.cap")}<Input className="min-h-11" type="number" min={1} max={100000} step={1} value={cap} onChange={(e) => { setCap(e.target.value); markDirty(); }} /></label>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">{budgetAllocationCategories.map((key) => <label key={key} className="block min-w-0 text-sm">{t(`allocation.category.${key}`)}<Input className="min-h-11" type="number" min={0} max={100000} step={1} value={fields[key]} onChange={(e) => { setFields({ ...fields, [key]: e.target.value }); markDirty(); }} /></label>)}</div>
      </fieldset>
      {!candidate.success && <p role="alert">{t("allocation.invalidAmount")}</p>}
      {totals && <><h4 className="font-semibold">{t("allocation.summary")}</h4><dl className="space-y-2 text-sm">{([
        ["allocated", totals.allocatedPerPerson], ["remaining", totals.unallocatedPerPerson], ["over", totals.overallocatedPerPerson], ["groupCap", totals.derivedGroupCap],
      ] as const).map(([key, amount]) => <div key={key} className="flex flex-wrap justify-between gap-2"><dt>{t(`allocation.${key}`)}</dt><dd>{money(amount)}</dd></div>)}</dl>
      {totals.incomplete && <p>{t("allocation.incomplete")}</p>}
      {!!totals.overallocatedPerPerson && <p role="status">{t("allocation.overHelp")}</p>}</>}
    </section>
    <section aria-labelledby="hub-program" className="space-y-3">
      <h3 id="hub-program" className="text-xl font-bold">{t("hubPlanning.program")}</h3>
      <p className="text-sm">{t("hubPlanning.programHelp")}</p>
      {!items.length && <p>{t("program.noItems")}</p>}
      {[...new Set(items.map((item) => item.date))].map((day) => <section key={day} aria-label={day} className="space-y-3">
        <h4 className="font-semibold">{new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone: "UTC" }).format(new Date(`${day}T00:00:00Z`))}</h4>
        {items.filter((item) => item.date === day).map((item) => <div key={item.id} className="min-w-0 space-y-2 rounded-md border p-3">
          <p className="break-words font-medium">{t(`program.slot.${item.slot}`)} · {item.title}</p>
          <p>{item.durationMinutes === null ? t("program.noDuration") : t("program.minutes", { count: item.durationMinutes })}</p>
          <p className="text-sm text-muted-foreground">{t(item.provenance.kind === "editorial" ? "program.editorial" : "program.custom")} · {t("program.unverified")}</p>
          <div className="flex flex-wrap gap-2"><Button variant="outline" className="h-auto min-h-11 whitespace-normal" disabled={blocked} onClick={() => { setEditing(item); setInvalidItem(false); }}>{t("program.edit")}</Button>
          <Button variant="outline" className="h-auto min-h-11 whitespace-normal" disabled={blocked} onClick={() => { setPlan({ ...plan, plannedItems: plan.plannedItems.filter((v) => v.id !== item.id) }); if (editing?.id === item.id) setEditing(null); markDirty(); }}>{t("program.remove")}</Button></div>
        </div>)}
      </section>)}
      {invalidItem && <p role="alert">{t("program.invalidAction")}</p>}
      <ProgramItemForm key={`${formVersion}:${editing?.id ?? "new"}`} planner={trip} program={{ ideas }} item={editing} disabled={blocked}
        onCancel={() => { setEditing(null); setInvalidItem(false); }} onSave={(data, ideaId) => {
          const idea = ideas.find((v) => v.id === ideaId);
          const item = editing ? { ...editing, ...data, userEdited: true } : { ...data, id: crypto.randomUUID(),
            title: idea?.title ?? data.title, durationMinutes: idea ? idea.durationMinutes : data.durationMinutes,
            ideaId: idea?.id ?? null, provenance: idea?.provenance ?? { kind: "user" }, feasibility: "not_checked", userEdited: false };
          const next = tripPlanningSchema.safeParse({ ...plan, plannedItems: editing ? plan.plannedItems.map((v) => v.id === editing.id ? item : v) : [...plan.plannedItems, item] });
          if (!next.success || !planningFitsTrip(next.data, trip)) { setInvalidItem(true); return; }
          setPlan(next.data); setInvalidItem(false); setEditing(null); setFormVersion((n) => n + 1); markDirty(); heading.current?.focus();
        }} />
    </section>
    <div className="flex flex-wrap gap-3">
      <Button className="h-auto min-h-11 whitespace-normal" disabled={blocked || !dirty || !candidate.success || Boolean(editing)} onClick={() => void save()}>{t(pending ? "hubPlanning.saving" : "hubPlanning.save")}</Button>
      <Button variant="outline" className="h-auto min-h-11 whitespace-normal" disabled={pending} onClick={async () => {
        if (busy.current) return; busy.current = true; setPending(true);
        try { apply(await reload()); setMessage("reloaded"); } catch { setFailure("error"); }
        finally { busy.current = false; setPending(false); }
      }}>{t("hubPlanning.reload")}</Button>
    </div>
    {base.revision === 0 && <div className="space-y-3 border-t pt-4">
      <p className="text-sm">{t("hubPlanning.importHelp")}</p>
      <Button variant="outline" className="h-auto min-h-11 whitespace-normal" disabled={blocked || dirty} onClick={() => {
        try { setImportPreview(previewLocalTripPlanning(localStorage, trip)); setMessage(null); }
        catch { setMessage("importUnavailable"); setImportPreview(null); }
      }}>{t("hubPlanning.previewImport")}</Button>
      {importPreview && <div className="space-y-2 rounded-md border p-3">
        <p>{trip.departureCity} → {trip.destinations?.join(", ")} · {trip.startDate} — {trip.endDate} · {trip.participants}</p>
        <p>{t("hubPlanning.importPreview", { count: importPreview.plannedItems.length })}</p>
        <dl>{budgetAllocationCategories.map((key) => <div key={key} className="flex flex-wrap justify-between gap-2"><dt>{t(`allocation.category.${key}`)}</dt><dd>{money(importPreview.allocations[key])}</dd></div>)}</dl>
        {importPreview.plannedItems.map((item) => <p key={item.id}>{item.date} · {t(`program.slot.${item.slot}`)} · {item.title} · {item.durationMinutes === null ? t("program.noDuration") : t("program.minutes", { count: item.durationMinutes })}</p>)}
        <Button disabled={blocked || dirty} className="h-auto min-h-11 whitespace-normal" onClick={() => { setPlan(importPreview); setFields(fieldsFor(importPreview)); setImportPreview(null); markDirty(); }}>{t("hubPlanning.useImport")}</Button>
      </div>}
    </div>}
  </CardContent></Card>;
}
