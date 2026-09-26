import { z } from "zod";
import { normalizeTripDate } from "./dateUtils";
import { getCanonicalCityName } from "./cityMapping";

export const PLANNER_CONTRACT_VERSION = 1 as const;
export const PLANNER_STORAGE_KEY = "byebi:plannerDraft:v1" as const;

export const plannerBrandSchema = z.enum(["byebro", "byebride"]);
export const plannerPartyTypeSchema = z.enum(["bachelor", "bachelorette"]);

export function partyTypeForPlannerBrand(brand: PlannerBrand): "bachelor" | "bachelorette" {
  return brand === "byebride" ? "bachelorette" : "bachelor";
}

export function getLocalDateOnly(now = new Date()): string {
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

export function isValidPlannerStartDate(startDate: string, now = new Date()): boolean {
  return normalizeTripDate(startDate) === startDate && startDate >= getLocalDateOnly(now);
}

export function isValidPlannerDateRange(
  startDate: string,
  endDate: string,
  now = new Date(),
): boolean {
  return isValidPlannerStartDate(startDate, now) &&
    normalizeTripDate(endDate) === endDate &&
    endDate >= startDate;
}

const dateOnlySchema = z.string().refine(
  (value) => normalizeTripDate(value) === value,
  "Invalid date-only value",
);

const locationSchema = z.object({
  canonical: z.string().trim().min(1).max(100),
  displayLabel: z.string().trim().min(1).max(100).optional(),
}).strict();

const preferencesSchema = z.object({
  archetype: z.string().trim().min(1).max(100).nullable(),
  interests: z.array(z.string().trim().min(1).max(100)).max(20),
}).strict().refine((value) => Boolean(value.archetype || value.interests.length), {
  message: "At least one explicit preference is required",
});

export const plannerDraftSchema = z.object({
  version: z.literal(PLANNER_CONTRACT_VERSION),
  brand: plannerBrandSchema,
  partyType: plannerPartyTypeSchema,
  origin: locationSchema.nullable(),
  destination: locationSchema.nullable(),
  startDate: dateOnlySchema.nullable(),
  endDate: dateOnlySchema.nullable(),
  participants: z.number().int().min(1).max(50).nullable(),
  budgetPerPerson: z.number().int().min(1).max(100_000).nullable(),
  preferences: preferencesSchema.nullable(),
  status: z.enum(["draft", "review-ready"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict().superRefine((planner, context) => {
  const complete = Boolean(
    planner.origin && planner.destination && planner.startDate && planner.endDate &&
    planner.participants && planner.budgetPerPerson && planner.preferences,
  );
  if (planner.partyType !== partyTypeForPlannerBrand(planner.brand)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["partyType"],
      message: "Party type must match planner brand",
    });
  }
  if (planner.startDate && !isValidPlannerStartDate(planner.startDate)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["startDate"],
      message: "Start date cannot be in the past",
    });
  }
  if (planner.startDate && planner.endDate && planner.endDate < planner.startDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "End date cannot be before start date",
    });
  }
  if (planner.status === "review-ready" && !complete) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["status"],
      message: "Review-ready planners require every essential field",
    });
  }
  if (planner.status === "draft" && complete) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["status"],
      message: "Complete planners must transition to review-ready",
    });
  }
});

export const plannerReviewSchema = plannerDraftSchema.refine(
  (planner) => planner.status === "review-ready",
  { path: ["status"], message: "Planner is not review-ready" },
);

export const plannerUpdateArgumentsSchema = z.object({
  origin: z.string().trim().min(1).max(100).nullable(),
  destination: z.string().trim().min(1).max(100).nullable(),
  startDate: z.string().trim().max(10).nullable(),
  endDate: z.string().trim().max(10).nullable(),
  participants: z.number().int().min(1).max(50).nullable(),
  budgetPerPerson: z.number().int().min(1).max(100_000).nullable(),
  preferenceArchetype: z.string().trim().min(1).max(100).nullable(),
  interests: z.array(z.string().trim().min(1).max(100)).max(20).nullable(),
}).strict();

export type PlannerDraft = z.infer<typeof plannerDraftSchema>;
export type PlannerUpdateArguments = z.infer<typeof plannerUpdateArgumentsSchema>;
export type PlannerBrand = z.infer<typeof plannerBrandSchema>;

export const PLANNER_REQUIRED_FIELDS = [
  "origin", "destination", "startDate", "endDate", "participants",
  "budgetPerPerson", "preferences",
] as const;

export function normalizePlannerCity(value: string): string | null {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return getCanonicalCityName(trimmed) ?? trimmed
    .toLocaleLowerCase("en")
    .replace(/(^|[\s'-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("en"));
}

export function getMissingPlannerFields(planner: PlannerDraft): string[] {
  return PLANNER_REQUIRED_FIELDS.filter((field) => planner[field] == null);
}

export function createPlannerDraft(input: {
  brand: PlannerBrand;
  partyType?: "bachelor" | "bachelorette";
  origin?: string | null;
  originDisplayLabel?: string | null;
  destination?: string | null;
  destinationDisplayLabel?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  participants?: number | null;
  budgetPerPerson?: number | null;
  preferenceArchetype?: string | null;
  interests?: string[] | null;
  createdAt?: string;
  updatedAt?: string;
}): PlannerDraft {
  const now = new Date().toISOString();
  const origin = input.origin ? normalizePlannerCity(input.origin) : null;
  const destination = input.destination ? normalizePlannerCity(input.destination) : null;
  const startDate = input.startDate ? normalizeTripDate(input.startDate) : null;
  const endDate = input.endDate ? normalizeTripDate(input.endDate) : null;
  const interests = input.interests?.map((value) => value.trim()).filter(Boolean) ?? [];
  const archetype = input.preferenceArchetype?.trim() ?? "";
  const complete = Boolean(
    origin && destination && startDate && endDate && input.participants &&
    input.budgetPerPerson && (archetype || interests.length),
  );

  return plannerDraftSchema.parse({
    version: PLANNER_CONTRACT_VERSION,
    brand: input.brand,
    partyType: partyTypeForPlannerBrand(input.brand),
    origin: origin ? {
      canonical: origin,
      ...(input.originDisplayLabel?.trim() ? { displayLabel: input.originDisplayLabel.trim() } : {}),
    } : null,
    destination: destination ? {
      canonical: destination,
      ...(input.destinationDisplayLabel?.trim() ? { displayLabel: input.destinationDisplayLabel.trim() } : {}),
    } : null,
    startDate,
    endDate,
    participants: input.participants ?? null,
    budgetPerPerson: input.budgetPerPerson ?? null,
    preferences: archetype || interests.length ? { archetype: archetype || null, interests } : null,
    status: complete ? "review-ready" : "draft",
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
  });
}

export function applyPlannerUpdate(
  current: PlannerDraft,
  update: PlannerUpdateArguments,
): PlannerDraft {
  return createPlannerDraft({
    brand: current.brand,
    partyType: current.partyType,
    origin: update.origin ?? current.origin?.canonical,
    originDisplayLabel: current.origin?.displayLabel,
    destination: update.destination ?? current.destination?.canonical,
    destinationDisplayLabel: current.destination?.displayLabel,
    startDate: update.startDate ?? current.startDate,
    endDate: update.endDate ?? current.endDate,
    participants: update.participants ?? current.participants,
    budgetPerPerson: update.budgetPerPerson ?? current.budgetPerPerson,
    preferenceArchetype: update.preferenceArchetype ?? current.preferences?.archetype,
    interests: update.interests ?? current.preferences?.interests,
    createdAt: current.createdAt,
  });
}
