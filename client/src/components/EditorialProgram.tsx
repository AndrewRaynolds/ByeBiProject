import { ZodError } from "zod";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/contexts/LanguageContext";
import { getPlannerStorageKey } from "@/lib/plannerStorage";
import { ProgramStorageError, programStorageKey, readProgram, writeProgram } from "@/lib/programStorage";
import { plannerReviewSchema, type PlannerDraft } from "@shared/plannerSchemas";
import { programIdeaCatalogIds, type ProgramDraft } from "@shared/programSchemas";
import { ProgramTransitionError, applyProgramAction, assessProgramContext, createProgramDraft } from "@shared/programTransitions";

type Item = ProgramDraft["plannedItems"][number];
export default function EditorialProgram({ planner, onReloadPlanner }: { planner: PlannerDraft; onReloadPlanner: (next: PlannerDraft) => void }) {
  const { t } = useTranslation();
  const [stored, setStored] = useState<ReturnType<typeof readProgram> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState(false);
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const heading = useRef<HTMLHeadingElement>(null); const focusHeading = useRef(false);
  const alive = useRef(true); const busy = useRef(false); const generation = useRef(0);
  const [reloadVersion, setReloadVersion] = useState(0);
  const load = () => {
    try { setStored(readProgram(localStorage, planner)); setError(null); setEditing(null); setMessage(false); setReloadVersion((n) => n + 1); }
    catch { setError("storageError"); }
  };
  useEffect(() => {
    alive.current = true; busy.current = false; setPending(false); load();
    const changed = (event: StorageEvent) => {
      if (event.storageArea && event.storageArea !== localStorage) return;
      if (event.key === null || [programStorageKey(planner.brand), getPlannerStorageKey(planner.brand)].includes(event.key)) {
        setError("conflict"); setMessage(false);
      }
    };
    window.addEventListener("storage", changed);
    return () => { alive.current = false; ++generation.current; window.removeEventListener("storage", changed); };
  }, [planner]);

  useEffect(() => { if (focusHeading.current) { heading.current?.focus(); focusHeading.current = false; } }, [stored]);

  const commit = async (build: () => ProgramDraft, resetForm = true) => {
    if (busy.current || !stored || (error && error !== "invalidAction")) return;
    const request = generation.current; setError(null);
    busy.current = true; setPending(true); setMessage(false);
    try {
      const next = await writeProgram(localStorage, planner, stored.raw, build);
      if (!alive.current || request !== generation.current) return;
      setStored(next); setMessage(true);
      if (resetForm) { setEditing(null); setReloadVersion((n) => n + 1); focusHeading.current = true; }
    } catch (reason) {
      if (alive.current && request === generation.current) setError(reason instanceof ProgramStorageError ? reason.code === "planner_changed" ? "conflict" : reason.code : reason instanceof ZodError || reason instanceof ProgramTransitionError ? "invalidAction" : "storageError");
    } finally { if (alive.current && request === generation.current) { busy.current = false; setPending(false); } }
  };
  const program = stored?.program;
  const assessment = program ? assessProgramContext(program, planner) : null;
  const act = (action: object, resetForm = true) => program && commit(() => applyProgramAction(program, { expectedRevision: program.revision, ...action }, planner), resetForm);
  const editorialIdeas = () => programIdeaCatalogIds.map((id) => ({ id, title: t(`program.idea.${id}`), durationMinutes: null, provenance: { kind: "editorial", catalogVersion: 1, catalogId: id } }));
  const start = () => commit(() => {
    const blank = createProgramDraft(planner);
    return applyProgramAction(blank, { type: "set_ideas", expectedRevision: blank.revision,
      ideas: editorialIdeas() }, planner);
  });
  const reload = () => {
    try {
      const parsed = plannerReviewSchema.parse(JSON.parse(localStorage.getItem(getPlannerStorageKey(planner.brand)) ?? "null"));
      if (JSON.stringify(parsed) !== JSON.stringify(planner)) onReloadPlanner(parsed);
      else load();
    } catch { setError("storageError"); }
  };

  return <details className="mt-5 rounded-lg border border-border p-3" data-testid="editorial-program">
    <summary className="min-h-11 cursor-pointer py-2 font-semibold">{t("program.open")}</summary>
    <p className="my-3 text-sm text-muted-foreground">{t("program.disclaimer")}</p>
    {message && <p role="status" className="mb-3 text-sm">{t("program.saved")}</p>}
    {error && <p role="alert" className="mb-3 text-sm">{t(`program.${error}`)}</p>}
    <div className="space-y-4" aria-busy={pending}>
      {stored && !program && <><p className="text-sm">{t(`program.${stored.kind}`)}</p><Button type="button" onClick={() => void start()} disabled={pending || Boolean(error && error !== "invalidAction")} className="h-auto min-h-11 w-full whitespace-normal">{t(stored.kind === "empty" ? "program.create" : "program.replace")}</Button></>}
      {program && assessment?.contextChanged && <form onSubmit={(event) => {
        event.preventDefault(); const data = new FormData(event.currentTarget);
        void act({ type: "rebase_program", positions: program.plannedItems.map((item) => ({ itemId: item.id, date: String(data.get(`${item.id}-date`)), slot: String(data.get(`${item.id}-slot`)) })) });
      }} className="space-y-3">
        <p role="status">{t("program.reviewContext")}</p>
        <p className="break-words text-sm">{planner.origin?.canonical} → {planner.destination?.canonical} · {planner.startDate} — {planner.endDate} · {planner.participants}</p>
        {program.plannedItems.map((item) => <fieldset key={item.id} className="space-y-2 rounded-md border p-3"><legend className="max-w-full break-words px-1 text-sm">{item.title}</legend><Position item={item} planner={planner} /></fieldset>)}
        <Button disabled={pending || Boolean(error && error !== "invalidAction")} type="submit" className="h-auto min-h-11 whitespace-normal">{t("program.confirmContext")}</Button>
      </form>}
      {program && !assessment?.contextChanged && <>
        <h3 ref={heading} tabIndex={-1} className="font-semibold">{t("program.items")}</h3>
        {!program.plannedItems.length && <p className="text-sm">{t("program.noItems")}</p>}
        {program.plannedItems.map((item) => <div key={item.id} className="min-w-0 space-y-2 rounded-md border p-3">
          <h4 className="break-words font-medium">{item.title}</h4><p className="text-sm">{item.date} · {t(`program.slot.${item.slot}`)} · {item.durationMinutes === null ? t("program.noDuration") : t("program.minutes", { count: item.durationMinutes })}</p>
          <p className="text-xs text-muted-foreground">{t(item.provenance.kind === "editorial" ? "program.editorial" : "program.custom")} · {t("program.unverified")}</p>
          <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" className="h-auto min-h-11 whitespace-normal" disabled={pending || Boolean(error && error !== "invalidAction")} onClick={() => setEditing(item)}>{t("program.edit")}</Button><Button type="button" variant="outline" className="h-auto min-h-11 whitespace-normal" disabled={pending || Boolean(error && error !== "invalidAction")} onClick={() => void act({ type: "remove_item", itemId: item.id })}>{t("program.remove")}</Button></div>
        </div>)}
        <Button type="button" variant="outline" className="h-auto min-h-11 whitespace-normal" disabled={pending || Boolean(error && error !== "invalidAction")} onClick={() => void act({ type: "set_ideas", ideas: editorialIdeas() }, false)}>{t("program.refreshIdeas")}</Button>
        <ProgramItemForm key={`${reloadVersion}:${editing?.id ?? "new"}`} planner={planner} program={program} item={editing} disabled={pending || Boolean(error && error !== "invalidAction")} onCancel={() => setEditing(null)} onSave={(data, ideaId) => {
          if (editing) void act({ type: "edit_item", itemId: editing.id, patch: data });
          else if (ideaId) void act({ type: "add_from_idea", ideaId, itemId: crypto.randomUUID(), date: data.date, slot: data.slot });
          else void act({ type: "add_custom", item: { ...data, id: crypto.randomUUID() } });
        }} />
      </>}
      <Button type="button" variant="ghost" disabled={pending} onClick={reload} className="h-auto min-h-11 whitespace-normal">{t("program.reload")}</Button>
    </div>
  </details>;
}

function Position({ item, planner }: { item?: Item; planner: Pick<PlannerDraft, "startDate" | "endDate"> }) {
  const { t } = useTranslation(); const prefix = item ? `${item.id}-` : "";
  return <div className="grid min-w-0 gap-3 sm:grid-cols-2"><label className="block min-w-0 text-sm">{t("program.date")}<Input className="min-h-11" name={`${prefix}date`} type="date" required min={planner.startDate!} max={planner.endDate!} defaultValue={item?.date ?? ""} /></label>
    <label className="block min-w-0 text-sm">{t("program.slot")}<select name={`${prefix}slot`} required defaultValue={item?.slot ?? ""} className="min-h-11 w-full rounded-md border bg-background px-2"><option value="">{t("program.choose")}</option>{["morning", "afternoon", "evening"].map((slot) => <option key={slot} value={slot}>{t(`program.slot.${slot}`)}</option>)}</select></label></div>;
}

export function ProgramItemForm({ planner, program, item, disabled, onSave, onCancel }: {
  planner: Pick<PlannerDraft, "startDate" | "endDate">; program: Pick<ProgramDraft, "ideas">; item: Item | null; disabled: boolean;
  onSave: (data: { title: string; date: string; slot: string; durationMinutes: number | null }, ideaId: string) => void; onCancel: () => void;
}) {
  const { t } = useTranslation(); const [ideaId, setIdeaId] = useState("");
  return <form onSubmit={(event) => {
    event.preventDefault(); const data = new FormData(event.currentTarget);
    const duration = String(data.get("duration") ?? "").trim();
    onSave({ title: String(data.get("title") ?? ""), date: String(data.get(item ? `${item.id}-date` : "date")), slot: String(data.get(item ? `${item.id}-slot` : "slot")), durationMinutes: duration ? Number(duration) : null }, ideaId);
  }}><fieldset disabled={disabled} className="min-w-0 space-y-3 rounded-md border p-3"><legend className="px-1 font-semibold">{t(item ? "program.editItem" : "program.addItem")}</legend>
    {!item && <label className="block text-sm">{t("program.inspiration")}<select value={ideaId} onChange={(event) => setIdeaId(event.target.value)} className="min-h-11 w-full rounded-md border bg-background px-2"><option value="">{t("program.custom")}</option>{program.ideas.map((idea) => <option key={idea.id} value={idea.id}>{idea.title}</option>)}</select></label>}
    {ideaId ? <p className="break-words text-sm">{program.ideas.find((idea) => idea.id === ideaId)?.title}</p> : <label className="block text-sm">{t("program.title")}<Input className="min-h-11" name="title" defaultValue={item?.title ?? ""} maxLength={200} required /></label>}
    <Position planner={planner} item={item ?? undefined} />
    {!ideaId && <label className="block text-sm">{t("program.duration")}<Input className="min-h-11" name="duration" type="number" min={1} max={720} step={1} defaultValue={item?.durationMinutes ?? ""} /></label>}
    <div className="flex flex-wrap gap-2"><Button type="submit" className="h-auto min-h-11 whitespace-normal">{t(item ? "program.saveItem" : "program.add")}</Button>{item && <Button type="button" variant="outline" className="h-auto min-h-11 whitespace-normal" onClick={onCancel}>{t("common.cancel")}</Button>}</div>
  </fieldset></form>;
}
