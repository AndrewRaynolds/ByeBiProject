import { describe, expect, it } from "vitest";
import { createPlannerDraft } from "./plannerSchemas";
import { budgetAllocationSchema, budgetAllocationsSchema, budgetAllocationNeedsReview, createBudgetAllocation, emptyBudgetAllocations, summarizeBudgetAllocations } from "./budgetAllocationSchemas";
const planner = () => createPlannerDraft({ brand: "byebro", origin: "Rome", destination: "Lisbon", startDate: "2099-10-10", endDate: "2099-10-13", participants: 6, budgetPerPerson: 600 });
const amounts = { main_transport: 180, accommodation: 210, local_transport: 30, food: 100, activities: 50, buffer: 30 };
describe("user budget allocations", () => {
  it("sums per person for the whole trip and derives the group cap without mutating intent", () => {
    const p = planner(); const before = structuredClone(p);
    expect(summarizeBudgetAllocations(amounts, 600, 6)).toEqual({ allocatedPerPerson: 600, incomplete: false, unallocatedPerPerson: 0, overallocatedPerPerson: 0, derivedGroupCap: 3600 });
    expect(createBudgetAllocation(p, amounts).scope).toBe("per_person_whole_trip"); expect(p).toEqual(before);
  });
  it("distinguishes missing from explicit zero and never invents a cap", () => {
    expect(summarizeBudgetAllocations(emptyBudgetAllocations(), null, 6)).toEqual({ allocatedPerPerson: 0, incomplete: true, unallocatedPerPerson: null, overallocatedPerPerson: null, derivedGroupCap: null });
    expect(summarizeBudgetAllocations(Object.fromEntries(Object.keys(amounts).map(k=>[k,0])),600,6)).toMatchObject({ incomplete:false, unallocatedPerPerson:600 });
    expect(summarizeBudgetAllocations({...amounts,buffer:null},600,6)).toMatchObject({ allocatedPerPerson:570,incomplete:true,unallocatedPerPerson:30 });
  });
  it("preserves over-allocation instead of clipping or adjusting", () => {
    expect(summarizeBudgetAllocations({...amounts,activities:80},600,6)).toMatchObject({allocatedPerPerson:630,overallocatedPerPerson:30,unallocatedPerPerson:0});
    expect(createBudgetAllocation(planner(),{...amounts,activities:80}).allocations.activities).toBe(80);
  });
  it.each([-1,1.5,NaN,Infinity,100001,"10"])("rejects invalid amount %s", value=>expect(budgetAllocationsSchema.safeParse({...amounts,food:value}).success).toBe(false));
  it("rejects missing, extra and misleading units", () => {
    expect(budgetAllocationsSchema.safeParse({...amounts,price:12}).success).toBe(false);
    const {food,...missing}=amounts; expect(budgetAllocationsSchema.safeParse(missing).success).toBe(false);
    const a=createBudgetAllocation(planner(),amounts);
    for(const change of [{currency:"USD"},{scope:"group"},{source:"live_price"},{basis:{...a.basis,startDate:"2099-02-30"}}]) expect(budgetAllocationSchema.safeParse({...a,...change}).success).toBe(false);
  });
  it("requires review after context changes and confirms only via explicit creation", () => {
    const p=planner(), a=createBudgetAllocation(p,amounts);
    expect(budgetAllocationNeedsReview(a,p)).toBe(false);
    for(const change of [{budgetPerPerson:500},{participants:8},{startDate:"2099-10-11"},{destination:{...p.destination!,canonical:"Paris"}}]) {
      const next={...p,...change}; expect(budgetAllocationNeedsReview(a,next)).toBe(true);
      const confirmed=createBudgetAllocation(next,amounts,a); expect(confirmed.revision).toBe(2); expect(confirmed.allocations).toEqual(amounts); expect(budgetAllocationNeedsReview(confirmed,next)).toBe(false);
    }
    expect(()=>createBudgetAllocation({...p,brand:"byebride"},amounts,a)).toThrow();
    expect(()=>createBudgetAllocation(p,amounts,{...a,revision:Number.MAX_SAFE_INTEGER})).toThrow();
  });
});
