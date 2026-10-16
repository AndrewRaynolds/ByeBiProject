import type { PlannerBrand } from "@shared/plannerSchemas";
export const programStorageKey = (brand: PlannerBrand) => `byebi:programDraft:v1:${brand}`;
export const budgetAllocationStorageKey = (brand: PlannerBrand) => `byebi:budgetAllocation:v1:${brand}`;
