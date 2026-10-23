import BudgetAllocationEditor from "./BudgetAllocationEditor";
import EditorialProgram from "./EditorialProgram";
import { resetPlannerAndProgram } from "@/lib/programStorage";
import PlannerPreferencesEditor from "./PlannerPreferencesEditor";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation } from "wouter";
import { Bot, Heart, Loader2, Send, Beer, Pencil, Plus, X } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTranslation } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/queryClient";
import { consumeJsonSse } from "@/lib/sse";
import { trackProductEvent } from "@/lib/track";
import { loadPlannerDraft, persistCheckoutBridge, savePlannerDraft } from "@/lib/plannerStorage";
import { createPlannerDraft, getLocalDateOnly, plannerDraftSchema, type PlannerBrand, type PlannerDraft } from "@shared/plannerSchemas";
import { matchingDestinationInterests, plannerSuggestionsSchema, suggestionsMatchPlanner, type DestinationIdeaId, type PlannerAction, type PlannerSuggestions } from "@shared/plannerSuggestions";

const messageSchema = z.object({ message: z.string().trim().min(1).max(2_000) });
type MessageForm = z.infer<typeof messageSchema>;
type PlannerDialogProps = { brand: PlannerBrand; open: boolean; onOpenChange: (open: boolean) => void; initialMessage?: string };
type ChatMessage = { id: string; content: string; sender: "user" | "assistant" };
type ReviewFieldName = "origin" | "destination" | "startDate" | "endDate" | "participants" | "budgetPerPerson" | "preferences";
type ReviewErrors = Partial<Record<ReviewFieldName, string>>;

export default function PlannerDialog({ brand, open, onOpenChange, initialMessage }: PlannerDialogProps) {
  const { t, locale } = useTranslation();
  const [, setLocation] = useLocation();
  const [planner, setPlanner] = useState<PlannerDraft>(() => loadPlannerDraft(localStorage, brand));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<PlannerSuggestions | null>(null);
  const seenIdeasRef = useRef<DestinationIdeaId[]>([]);
  const activeBrandRef = useRef(brand);
  const previousBrandRef = useRef(brand);
  activeBrandRef.current = brand;
  const returnFocusRef = useRef(false);
  const reviewHeadingRef = useRef<HTMLHeadingElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const resetBusy = useRef(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [reviewErrors, setReviewErrors] = useState<ReviewErrors>({});
  const messagesRef = useRef(messages);
  const abortRef = useRef<AbortController | null>(null);
  const requestGenerationRef = useRef(0);
  const wasOpenRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const form = useForm<MessageForm>({ resolver: zodResolver(messageSchema), defaultValues: { message: "" } });

  const replacePlanner = useCallback((next: PlannerDraft) => {
    savePlannerDraft(localStorage, next);
    setPlanner(next);
  }, []);

  const acceptServerPlanner = useCallback((next: PlannerDraft) => {
    savePlannerDraft(localStorage, next);
    setPlanner((current) => {
      if (current.status !== "review-ready" && next.status === "review-ready") {
        trackProductEvent("trip_plan_completed");
      }
      return next;
    });
  }, []);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { scrollRef.current?.scrollTo?.({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, isLoading]);
  useEffect(() => () => {
    requestGenerationRef.current += 1;
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (previousBrandRef.current === brand) return;
    previousBrandRef.current = brand;
    requestGenerationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
    setSuggestions(null);
    seenIdeasRef.current = [];
    setPlanner(loadPlannerDraft(localStorage, brand));
    setMessages([]);
    messagesRef.current = [];
    setIsEditing(false);
    setReviewError(null);
    setReviewErrors({});
    form.reset();
  }, [brand, form.reset]);

  useEffect(() => {
    if (!isLoading && returnFocusRef.current) {
      returnFocusRef.current = false;
      if (planner.status === "review-ready") reviewHeadingRef.current?.focus();
      else form.setFocus("message");
    }
  }, [form, isLoading, planner.status]);

  const sendChatRequest = useCallback(async (rawMessage: string, plannerAction?: PlannerAction) => {
    const message = rawMessage.trim();
    if (!message || isLoading || abortRef.current || planner.brand !== brand) return;
    setSuggestions(null);
    setMessages((current) => [...current, { id: crypto.randomUUID(), content: message, sender: "user" }]);
    setIsLoading(true);
    const controller = new AbortController();
    const requestGeneration = ++requestGenerationRef.current;
    abortRef.current = controller;
    const assistantId = crypto.randomUUID();
    let assistantContent = "";
    let responsePlanner = planner;
    try {
      const response = await apiRequest("POST", "/api/chat/openai-stream", {
        message,
        planner,
        locale,
        ...(plannerAction ? { plannerAction } : {}),
        conversationHistory: messagesRef.current.slice(-12).map((item) => ({ role: item.sender, content: item.content.slice(0, 8_000) })),
      }, { signal: controller.signal, timeoutMs: 30_000 });
      if (requestGenerationRef.current !== requestGeneration || activeBrandRef.current !== brand) return;
      setMessages((current) => [...current, { id: assistantId, content: "", sender: "assistant" }]);
      await consumeJsonSse(response, { onEvent: (event: any) => {
        if (requestGenerationRef.current !== requestGeneration || activeBrandRef.current !== brand) return;
        if (event.tool_result?.name === "update_planner") {
          const parsed = plannerDraftSchema.safeParse(event.tool_result.result?.planner);
          if (parsed.success && parsed.data.brand === brand) {
            responsePlanner = parsed.data;
            acceptServerPlanner(parsed.data);
          }
        }
        if (event.suggestions) {
          const parsed = plannerSuggestionsSchema.safeParse(event.suggestions);
          if (parsed.success && suggestionsMatchPlanner(parsed.data, responsePlanner)) {
            setSuggestions(parsed.data);
            const ids = parsed.data.destinationIds;
            seenIdeasRef.current = ids.some((id) => seenIdeasRef.current.includes(id))
              ? [...ids] : [...new Set([...seenIdeasRef.current, ...ids])];
          }
        }
        if (typeof event.content === "string") {
          assistantContent += event.content;
          setMessages((current) => current.map((item) => item.id === assistantId ? { ...item, content: assistantContent } : item));
        }
      } });
    } catch {
      if (requestGenerationRef.current === requestGeneration && activeBrandRef.current === brand) {
        setMessages((current) => current.filter((item) => item.id !== assistantId));
        if (!controller.signal.aborted) setMessages((current) => [...current, { id: crypto.randomUUID(), content: t("chat.genericError"), sender: "assistant" }]);
      }
    } finally {
      if (requestGenerationRef.current === requestGeneration && activeBrandRef.current === brand) {
        if (abortRef.current === controller) abortRef.current = null;
        setIsLoading(false);
      }
    }
  }, [acceptServerPlanner, brand, isLoading, locale, planner, t]);

  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!open) {
      requestGenerationRef.current += 1;
      abortRef.current?.abort();
      abortRef.current = null;
      setIsLoading(false);
      setSuggestions(null);
      seenIdeasRef.current = [];
      return;
    }
    if (justOpened && initialMessage) {
      trackProductEvent("chat_started");
      void sendChatRequest(initialMessage);
    }
  }, [initialMessage, open, sendChatRequest]);

  const onSubmit = form.handleSubmit(({ message }) => {
    trackProductEvent("chat_started");
    form.reset();
    void sendChatRequest(message);
  });

  const requestIdeas = () => {
    returnFocusRef.current = true;
    trackProductEvent("chat_started");
    void sendChatRequest(t(suggestions ? "planner.moreIdeas" : "planner.inspireMe"), {
      type: "suggest_destinations", seenIds: seenIdeasRef.current,
    });
  };

  const chooseIdea = (id: DestinationIdeaId) => {
    if (!suggestions || !suggestionsMatchPlanner(suggestions, planner) || !suggestions.destinationIds.includes(id)) return;
    returnFocusRef.current = true;
    trackProductEvent("chat_started");
    void sendChatRequest(t("planner.chooseDestination", { destination: t(`destinations.city.${id}.name`) }), {
      type: "choose_destination", destinationId: id,
    });
  };

  const saveReviewEdits = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const origin = String(data.get("origin") ?? "").trim();
    const destination = String(data.get("destination") ?? "").trim();
    const startDate = String(data.get("startDate") ?? "");
    const endDate = String(data.get("endDate") ?? "");
    const participants = Number(data.get("participants"));
    const budgetValue = String(data.get("budgetPerPerson") ?? "").trim();
    const budgetPerPerson = budgetValue ? Number(budgetValue) : null;
    const preferenceArchetype = String(data.get("archetype") ?? "").trim();
    const interests = String(data.get("interests") ?? "").split(",").map((value) => value.trim()).filter(Boolean);
    const errors: ReviewErrors = {};
    if (!origin) errors.origin = t("planner.errorOriginRequired");
    if (!destination) errors.destination = t("planner.errorDestinationRequired");
    if (!startDate || startDate < getLocalDateOnly()) errors.startDate = t("planner.errorStartDate");
    if (!endDate || (startDate && endDate < startDate)) errors.endDate = t("planner.errorEndDate");
    if (!Number.isInteger(participants) || participants < 1 || participants > 50) errors.participants = t("planner.errorParticipants");
    if (budgetPerPerson !== null && (!Number.isInteger(budgetPerPerson) || budgetPerPerson < 1 || budgetPerPerson > 100_000)) errors.budgetPerPerson = t("planner.errorBudget");
    if (Object.keys(errors).length > 0) {
      setReviewErrors(errors);
      setReviewError(t("planner.reviewValidationError"));
      const firstInvalid = Object.keys(errors)[0];
      event.currentTarget.querySelector<HTMLInputElement>(`[name="${firstInvalid === "preferences" ? "interests" : firstInvalid}"]`)?.focus();
      return;
    }
    try {
      const next = createPlannerDraft({
        brand, partyType: planner.partyType,
        origin, destination, startDate, endDate, participants, budgetPerPerson,
        preferenceArchetype, interests, createdAt: planner.createdAt,
      });
      if (next.status !== "review-ready") throw new Error("Incomplete planner review");
      replacePlanner(next);
      setReviewError(null);
      setReviewErrors({});
      setIsEditing(false);
    } catch {
      setReviewError(t("planner.reviewValidationError"));
    }
  };

  const cancelReviewEdits = () => {
    setReviewError(null);
    setReviewErrors({});
    setIsEditing(false);
  };

  const startNewTrip = async () => {
    if (resetBusy.current) return;
    resetBusy.current = true;
    const resetBrand = brand; setResetting(true); setResetError(false);
    requestGenerationRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
    setMessages([]);
    setSuggestions(null);
    seenIdeasRef.current = [];
    returnFocusRef.current = false;
    messagesRef.current = [];
    form.reset();
    setReviewError(null);
    setReviewErrors({});
    setIsEditing(false);
    try {
      const next = await resetPlannerAndProgram(localStorage, resetBrand);
      if (activeBrandRef.current === resetBrand) setPlanner(next);
    } catch { if (activeBrandRef.current === resetBrand) setResetError(true); }
    finally { resetBusy.current = false; setResetting(false); }
  };

  const continueToOptions = () => {
    if (!persistCheckoutBridge(localStorage, planner)) return;
    onOpenChange(false);
    setLocation("/checkout");
  };
  const title = brand === "byebride" ? t("planner.brideTitle") : t("planner.broTitle");
  const welcome = brand === "byebride" ? t("planner.brideWelcome") : t("planner.broWelcome");
  const BrandIcon = brand === "byebride" ? Heart : Beer;
  const visibleIdeas = planner.brand === brand && suggestions && suggestionsMatchPlanner(suggestions, planner) ? suggestions.destinationIds : [];

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1rem)] max-w-2xl flex-col overflow-hidden p-0 sm:w-full">
      <DialogHeader className="border-b px-4 py-4 sm:px-6"><div className="flex items-center justify-between gap-3 pr-8"><DialogTitle className="flex min-w-0 items-center gap-2"><Bot className="shrink-0" aria-hidden="true" /><span className="truncate">{title}</span></DialogTitle><Button type="button" variant="outline" size="sm" className="h-auto min-h-10 shrink-0 whitespace-normal" disabled={resetting} onClick={() => void startNewTrip()}><Plus className="h-4 w-4" aria-hidden="true" />{t("planner.newTrip")}</Button></div><DialogDescription className="sr-only">{t("planner.dialogDescription")}</DialogDescription></DialogHeader>
      {resetError && <p role="alert" className="px-4 text-sm">{t("program.storageError")}</p>}
      {planner.status === "review-ready" ? <section className="overflow-y-auto px-4 py-5 sm:px-6" aria-labelledby="planner-review-heading">
        <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("planner.briefLabel")}</p><h2 ref={reviewHeadingRef} tabIndex={-1} id="planner-review-heading" className="text-2xl font-bold">{t("planner.reviewTitle")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("planner.reviewDisclaimer")}</p></div>
        <form onSubmit={saveReviewEdits} className="grid grid-cols-1 gap-4 sm:grid-cols-2" data-testid="planner-review">
          <ReviewField label={t("planner.origin")} name="origin" value={planner.origin?.displayLabel ?? planner.origin?.canonical ?? ""} editing={isEditing} error={reviewErrors.origin} />
          <ReviewField label={t("planner.destination")} name="destination" value={planner.destination?.displayLabel ?? planner.destination?.canonical ?? ""} editing={isEditing} error={reviewErrors.destination} />
          <ReviewField label={t("planner.startDate")} name="startDate" value={planner.startDate ?? ""} editing={isEditing} type="date" min={getLocalDateOnly()} error={reviewErrors.startDate} />
          <ReviewField label={t("planner.endDate")} name="endDate" value={planner.endDate ?? ""} editing={isEditing} type="date" min={planner.startDate ?? getLocalDateOnly()} error={reviewErrors.endDate} />
          <ReviewField label={t("planner.participants")} name="participants" value={String(planner.participants ?? "")} editing={isEditing} type="number" max={50} error={reviewErrors.participants} />
          <ReviewField label={t("planner.budgetPerPerson")} name="budgetPerPerson" value={String(planner.budgetPerPerson ?? "")} editing={isEditing} required={false} type="number" max={100000} suffix="€" error={reviewErrors.budgetPerPerson} />
          <p className="col-span-full text-sm text-muted-foreground">{t("planner.budgetHelp")}</p>
          {isEditing ? <PlannerPreferencesEditor key={brand} brand={brand} preferences={planner.preferences} error={reviewErrors.preferences} /> : <>
            <ReviewField label={t("planner.experienceType")} name="archetype" value={planner.preferences?.archetype ?? ""} editing={false} required={false} />
            <ReviewField label={t("planner.interests")} name="interests" value={planner.preferences?.interests.join(", ") ?? ""} editing={false} required={false} />
          </>}
          <p className="col-span-full text-sm text-muted-foreground">{t("planner.preferencesHelp")}</p>
          {reviewError && <p className="col-span-full text-sm text-destructive" role="alert">{reviewError}</p>}
          <div className="col-span-full flex flex-col gap-2 pt-2 sm:flex-row">{isEditing ? <><Button type="submit" className="min-h-11 flex-1">{t("planner.saveChanges")}</Button><Button type="button" variant="outline" className="min-h-11 flex-1" onClick={cancelReviewEdits}><X className="mr-2 h-4 w-4" aria-hidden="true" />{t("planner.cancelEdit")}</Button></> : <Button type="button" variant="outline" className="min-h-11 flex-1" onClick={() => { setReviewError(null); setReviewErrors({}); setIsEditing(true); }}><Pencil className="mr-2 h-4 w-4" aria-hidden="true" />{t("planner.edit")}</Button>}<Button type="button" className="min-h-11 flex-1" onClick={continueToOptions} disabled={resetting || isEditing || planner.status !== "review-ready"}>{t("planner.continueOptions")}</Button></div>
        </form>
        {!isEditing && !resetting && <EditorialProgram key={`${brand}:${planner.createdAt}`} planner={planner} onReloadPlanner={setPlanner} />}
        {!isEditing && !resetting && <BudgetAllocationEditor key={`budget:${brand}:${planner.createdAt}`} planner={planner} onReloadPlanner={setPlanner} />}
      </section> : <>
        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6" aria-live="polite">
          <div className="mb-4 flex gap-3"><Avatar><AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback></Avatar><p className="max-w-[85%] rounded-lg bg-muted px-4 py-2 text-sm">{welcome}</p></div>
          {messages.filter((message) => message.content.trim()).map((message) => <div key={message.id} className={`mb-4 flex gap-3 ${message.sender === "user" ? "flex-row-reverse" : ""}`}><Avatar><AvatarFallback>{message.sender === "user" ? <BrandIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}</AvatarFallback></Avatar><p className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-muted px-4 py-2 text-sm">{message.content}</p></div>)}
          {isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><Loader2 className="h-4 w-4 animate-spin" />{t("planner.thinking")}</div>}
          {!planner.destination && !isLoading && <section className="mt-4 space-y-3 rounded-lg border border-border bg-background p-3" aria-labelledby="planner-ideas-title">
            <h2 id="planner-ideas-title" className="text-sm font-semibold">{t("planner.ideasTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("planner.ideasDisclaimer")}</p>
            {visibleIdeas.map((id) => <Button key={id} type="button" variant="outline" className="h-auto min-h-11 w-full min-w-0 flex-col items-start whitespace-normal p-3 text-left" onClick={() => chooseIdea(id)}>
              <span className="font-semibold">{t("planner.chooseDestination", { destination: t(`destinations.city.${id}.name`) })}</span>
              <span className="text-sm font-normal leading-6 text-muted-foreground">{t(`planner.ideaReason.${id}`)}{matchingDestinationInterests(id, planner).map(topic => <span className="block" key={topic}>{t(`planner.interestReason.${topic}`)}</span>)}</span>
            </Button>)}
            <Button type="button" variant="outline" className="min-h-11 whitespace-normal" onClick={requestIdeas}>{t(visibleIdeas.length ? "planner.moreIdeas" : "planner.inspireMe")}</Button>
          </section>}
        </div>
        <form onSubmit={onSubmit} className="flex gap-2 border-t px-4 py-4 sm:px-6"><Input {...form.register("message")} aria-label={t("chat.messagePlaceholder")} placeholder={t("chat.messagePlaceholder")} disabled={isLoading || resetting} /><Button type="submit" size="icon" disabled={isLoading || resetting} aria-label={t("planner.send")}><Send className="h-4 w-4" /></Button></form>
      </>}
    </DialogContent>
  </Dialog>;
}

function ReviewField({ label, name, value, editing, type = "text", suffix, required = true, min, max, error }: { label: string; name: string; value: string; editing: boolean; type?: string; suffix?: string; required?: boolean; min?: string | number; max?: string | number; error?: string }) {
  const errorId = `${name}-error`;
  return <label className="block min-w-0 text-sm font-medium"><span className="mb-1 block">{label}</span>{editing ? <><Input name={name} type={type} defaultValue={value} min={min ?? (type === "number" ? 1 : undefined)} max={max} required={required} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} />{error && <span id={errorId} className="mt-1 block text-xs text-destructive">{error}</span>}</> : <span className="block min-h-11 break-words rounded-md border bg-muted/30 px-3 py-2 text-base font-normal">{value || "—"}{value && suffix ? ` ${suffix}` : ""}</span>}</label>;
}
