import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/contexts/LanguageContext";
import { plannerReviewSchema, type PlannerDraft } from "@shared/plannerSchemas";
import { budgetAllocationCategories, budgetAllocationNeedsReview, budgetAllocationsSchema, emptyBudgetAllocations, summarizeBudgetAllocations, type BudgetAllocations } from "@shared/budgetAllocationSchemas";
import { readBudgetAllocation, writeBudgetAllocation } from "@/lib/budgetAllocationStorage";
import { budgetAllocationStorageKey } from "@/lib/planningDraftKeys";
import { getPlannerStorageKey } from "@/lib/plannerStorage";
import { ProgramStorageError } from "@/lib/programStorage";

type Fields = Record<keyof BudgetAllocations, string>;
const fieldsFor = (allocations: BudgetAllocations): Fields => Object.fromEntries(budgetAllocationCategories.map((key) => [key, allocations[key] === null ? "" : String(allocations[key])])) as Fields;

export default function BudgetAllocationEditor({ planner, onReloadPlanner }: { planner: PlannerDraft; onReloadPlanner: (next: PlannerDraft) => void }) {
  const { t, locale } = useTranslation();
  const summaryId = useId();
  const date = (value: string) => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
  const [stored, setStored] = useState<ReturnType<typeof readBudgetAllocation> | null>(null);
  const [fields, setFields] = useState<Fields>(() => fieldsFor(emptyBudgetAllocations()));
  const [dirty, setDirty] = useState(false); const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null); const [pending, setPending] = useState(false);
  const busy = useRef(false); const generation = useRef(0); const summary = useRef<HTMLHeadingElement>(null);
  const load = () => {
    try {
      const value = readBudgetAllocation(localStorage, planner);
      setStored(value); setFields(fieldsFor(value.allocation?.allocations ?? emptyBudgetAllocations()));
      setError(null); setDirty(false); setSaved(false);
    } catch { setStored(null); setError("storageError"); }
  };
  useEffect(() => {
    busy.current = false; setPending(false); load();
    const changed = (event: StorageEvent) => {
      if (event.storageArea && event.storageArea !== localStorage) return;
      if (event.key === null || [budgetAllocationStorageKey(planner.brand), getPlannerStorageKey(planner.brand)].includes(event.key)) { setError("conflict"); setSaved(false); }
    };
    window.addEventListener("storage", changed);
    return () => { ++generation.current; window.removeEventListener("storage", changed); };
  }, [planner]);
  useEffect(() => { if (saved) summary.current?.focus(); }, [saved]);

  const amounts = budgetAllocationsSchema.safeParse(Object.fromEntries(budgetAllocationCategories.map((key) => [key, fields[key].trim() === "" ? null : Number(fields[key])])));
  const totals = amounts.success ? summarizeBudgetAllocations(amounts.data, planner.budgetPerPerson, planner.participants) : null;
  const needsReview = stored?.allocation ? budgetAllocationNeedsReview(stored.allocation, planner) : false;
  const blocked = error === "conflict" || error === "unsupported" || !stored;
  const money = (amount: number | null) => amount === null ? t("allocation.unknown") : new Intl.NumberFormat(locale, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(amount);
  const reload = () => {
    try {
      const active = plannerReviewSchema.parse(JSON.parse(localStorage.getItem(getPlannerStorageKey(planner.brand)) ?? "null"));
      if (JSON.stringify(active) !== JSON.stringify(planner)) onReloadPlanner(active); else load();
    } catch { setError("storageError"); }
  };
  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy.current || blocked || !stored || !amounts.success) return;
    const current = generation.current; busy.current = true; setPending(true); setSaved(false); setError(null);
    try {
      const next = await writeBudgetAllocation(localStorage, planner, stored.raw, amounts.data);
      if (current !== generation.current) return;
      setStored(next); setDirty(false); setSaved(true);
    } catch (reason) {
      if (current === generation.current) setError(reason instanceof ProgramStorageError ? reason.code === "planner_changed" ? "conflict" : reason.code : "storageError");
    } finally { if (current === generation.current) { busy.current = false; setPending(false); } }
  };

  return <details className="mt-5 rounded-lg border border-border p-3" data-testid="budget-allocation">
    <summary className="min-h-11 cursor-pointer py-2 font-semibold">{t("allocation.open")}</summary>
    <p className="my-3 text-sm text-muted-foreground">{t("allocation.disclaimer")}</p>
    {error && <p role="alert" className="mb-3 text-sm">{t(`allocation.${error}`)}</p>}
    {stored && ["foreign", "invalid"].includes(stored.kind) && <p className="mb-3 text-sm">{t("allocation.replaceHelp")}</p>}
    {needsReview && <div className="mb-3 space-y-1 rounded-md border p-3" role="status">
      <p>{t("allocation.review")}</p>
      <p className="break-words text-sm">{t("allocation.previousContext", { cap: money(stored!.allocation!.basis.budgetPerPerson), count: stored!.allocation!.basis.participants })} · {stored!.allocation!.basis.origin} → {stored!.allocation!.basis.destination} · {date(stored!.allocation!.basis.startDate)} — {date(stored!.allocation!.basis.endDate)}</p>
    </div>}
    <p className="mb-3 break-words text-sm">{t("allocation.currentContext", { cap: money(planner.budgetPerPerson), count: planner.participants! })} · {planner.origin?.canonical} → {planner.destination?.canonical} · {date(planner.startDate!)} — {date(planner.endDate!)}</p>
    <form onSubmit={(event) => void save(event)}>
      <fieldset disabled={pending || blocked} className="min-w-0 space-y-3">
        <legend className="mb-3 font-medium">{t("allocation.fields")}</legend>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">{budgetAllocationCategories.map((key) => <label key={key} className="block min-w-0 text-sm">{t(`allocation.category.${key}`)}<Input className="min-h-11" name={key} type="number" min={0} max={100000} step={1} value={fields[key]} onChange={(event) => { setFields((previous) => ({ ...previous, [key]: event.target.value })); setDirty(true); setSaved(false); }} /></label>)}</div>
        <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!amounts.success} className="h-auto min-h-11 whitespace-normal">{t(stored && ["foreign", "invalid"].includes(stored.kind) ? "allocation.replace" : needsReview ? "allocation.confirm" : "allocation.save")}</Button><Button type="button" variant="outline" className="h-auto min-h-11 whitespace-normal" onClick={() => { setFields(fieldsFor(emptyBudgetAllocations())); setDirty(true); setSaved(false); }}>{t("allocation.clear")}</Button></div>
      </fieldset>
    </form>
    <section className="mt-4 space-y-2" aria-labelledby={summaryId}>
      <h3 id={summaryId} ref={summary} tabIndex={-1} className="font-semibold">{t("allocation.summary")}</h3>
      {saved ? <p role="status" className="text-sm">{t("allocation.saved")}</p> : dirty && <p className="text-sm">{t("allocation.unsaved")}</p>}
      {!totals ? <p role="alert" className="text-sm">{t("allocation.invalidAmount")}</p> : <>
        <dl className="space-y-2 text-sm">{([
          ["allocated", totals.allocatedPerPerson], ["remaining", totals.unallocatedPerPerson],
          ["over", totals.overallocatedPerPerson], ["groupCap", totals.derivedGroupCap],
        ] as const).map(([label, amount]) => <div key={label} className="flex flex-wrap justify-between gap-2"><dt>{t(`allocation.${label}`)}</dt><dd data-testid={`allocation-${label}`} className="font-semibold">{money(amount)}</dd></div>)}</dl>
        {totals.incomplete && <p className="text-sm">{t("allocation.incomplete")}</p>}
        {totals.overallocatedPerPerson !== null && totals.overallocatedPerPerson > 0 && <p role="status" className="text-sm">{t("allocation.overHelp")}</p>}
      </>}
    </section>
    <Button type="button" variant="ghost" className="mt-3 h-auto min-h-11 whitespace-normal" disabled={pending} onClick={reload}>{t("allocation.reload")}</Button>
  </details>;
}
