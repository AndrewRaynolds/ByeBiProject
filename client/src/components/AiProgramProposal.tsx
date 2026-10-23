import { useEffect, useRef, useState } from "react";
import { aiProgramProposalSchema, appendAiProgramProposal, type AiProgramProposal as Proposal } from "@shared/aiProgramSchemas";
import type { TripPlanningSnapshot } from "@shared/tripPlanningSchemas";
import type { Trip } from "@shared/schema";
import { useTranslation } from "@/contexts/LanguageContext";
import { apiRequest, ApiError } from "@/lib/queryClient";
import { Button } from "./ui/button";

export default function AiProgramProposal({ trip, snapshot, disabled, onAccept, onConflict }: {
  trip: Trip; snapshot: TripPlanningSnapshot; disabled: boolean;
  onAccept: (plan: TripPlanningSnapshot["plan"]) => void; onConflict: () => void;
}) {
  const { t, locale } = useTranslation();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [pending, setPending] = useState(false); const [error, setError] = useState<"error" | "noSlots" | "rateLimit" | null>(null);
  const active = useRef<AbortController | null>(null); const review = useRef<HTMLHeadingElement>(null);
  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => { if (proposal) review.current?.focus(); }, [proposal]);
  const generate = async () => {
    if (active.current || disabled) return;
    const controller = new AbortController(); active.current = controller;
    setPending(true); setError(null); setProposal(null);
    try {
      const response = await apiRequest("POST", `/api/trips/${trip.id}/planning/proposal`, {
        locale, expectedRevision: snapshot.revision, expectedContextRevision: snapshot.contextRevision, plan: snapshot.plan,
      }, { signal: controller.signal, timeoutMs: 30_000 });
      const parsed = aiProgramProposalSchema.parse(await response.json());
      appendAiProgramProposal(snapshot.plan, parsed, trip, id => t(`program.idea.${id}`), () => crypto.randomUUID());
      if (!controller.signal.aborted) setProposal(parsed);
    } catch (failure) {
      if (!controller.signal.aborted) {
        if (failure instanceof ApiError && failure.status === 422 && failure.message === "NO_FREE_SLOTS") setError("noSlots");
        else if (failure instanceof ApiError && failure.status === 429) setError("rateLimit");
        else setError("error");
        if (failure instanceof ApiError && failure.status === 409) onConflict();
      }
    } finally { if (!controller.signal.aborted) { active.current = null; setPending(false); } }
  };
  return <div className="min-w-0 space-y-3 rounded-md border p-3" aria-busy={pending}>
    <p className="text-sm">{t("aiProgram.help")}</p>
    <p className="text-sm text-muted-foreground">{t("aiProgram.dataUse")}</p>
    <Button variant="outline" className="h-auto min-h-11 whitespace-normal" disabled={disabled || pending} onClick={() => void generate()}>{t(pending ? "aiProgram.generating" : "aiProgram.generate")}</Button>
    {pending && <p role="status">{t("aiProgram.generating")}</p>}
    {error && <p role="alert">{t(`aiProgram.${error}`)}</p>}
    {proposal && <section aria-labelledby="ai-program-review" className="space-y-3">
      <h4 ref={review} id="ai-program-review" tabIndex={-1} className="font-semibold">{t("aiProgram.review")}</h4>
      <p className="text-sm">{t("aiProgram.reviewHelp")}</p>
      <ul className="space-y-2">{proposal.items.map((item, index) => <li className="break-words" key={index}>
        {new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${item.date}T00:00:00Z`))} · {t(`program.slot.${item.slot}`)} · {t(`program.idea.${item.catalogId}`)}
      </li>)}</ul>
      <div className="flex flex-wrap gap-2">
        <Button className="h-auto min-h-11 whitespace-normal" disabled={disabled || pending} onClick={() => {
          try { const next = appendAiProgramProposal(snapshot.plan, proposal, trip, id => t(`program.idea.${id}`), () => crypto.randomUUID());
            setProposal(null); onAccept(next);
          } catch { setError("error"); setProposal(null); }
        }}>{t("aiProgram.accept")}</Button>
        <Button variant="outline" className="h-auto min-h-11 whitespace-normal" onClick={() => { setProposal(null); setError(null); }}>{t("aiProgram.discard")}</Button>
      </div>
    </section>}
  </div>;
}
