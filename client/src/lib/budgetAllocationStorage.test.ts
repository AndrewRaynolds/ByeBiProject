/** @vitest-environment jsdom */
import {beforeEach,describe,expect,it} from "vitest";
import {createPlannerDraft} from "@shared/plannerSchemas";
import {emptyBudgetAllocations,createBudgetAllocation} from "@shared/budgetAllocationSchemas";
import {savePlannerDraft} from "./plannerStorage";
import {readBudgetAllocation,writeBudgetAllocation} from "./budgetAllocationStorage";
import {budgetAllocationStorageKey,programStorageKey} from "./planningDraftKeys";
import {resetPlannerAndProgram,type ProgramLock} from "./programStorage";
const context=(brand:"byebro"|"byebride"="byebro")=>createPlannerDraft({brand,origin:"Rome",destination:"Lisbon",startDate:"2099-10-10",endDate:"2099-10-13",participants:6,budgetPerPerson:600});
const serial=():ProgramLock=>{let tail:Promise<unknown>=Promise.resolve();return(_name,work)=>{const next=tail.then(work);tail=next.catch(()=>{});return next;};};
describe("local budget persistence",()=>{
 beforeEach(()=>localStorage.clear());
 it("only writes explicitly and isolates brand and trip identity",async()=>{
  const p=context();savePlannerDraft(localStorage,p); expect(readBudgetAllocation(localStorage,p).kind).toBe("empty");
  const a=await writeBudgetAllocation(localStorage,p,null,emptyBudgetAllocations(),serial());expect(readBudgetAllocation(localStorage,p)).toEqual(a);
  expect(readBudgetAllocation(localStorage,context("byebride")).kind).toBe("empty");expect(readBudgetAllocation(localStorage,{...p,createdAt:"2026-10-17T10:00:00.000Z"}).kind).toBe("foreign");
 });
 it.each(['{bad','{"version":99}'])("preserves unreadable data until explicit replacement %s",async raw=>{
  const p=context();savePlannerDraft(localStorage,p);localStorage.setItem(budgetAllocationStorageKey(p.brand),raw);
  expect(readBudgetAllocation(localStorage,p).kind).toBe("invalid");expect(localStorage.getItem(budgetAllocationStorageKey(p.brand))).toBe(raw);
  await writeBudgetAllocation(localStorage,p,raw,emptyBudgetAllocations(),serial());expect(readBudgetAllocation(localStorage,p).kind).toBe("ready");
 });
 it("serializes competing saves and rejects stale bytes",async()=>{
  const p=context();savePlannerDraft(localStorage,p);const lock=serial();const results=await Promise.allSettled([writeBudgetAllocation(localStorage,p,null,{...emptyBudgetAllocations(),food:30},lock),writeBudgetAllocation(localStorage,p,null,{...emptyBudgetAllocations(),food:40},lock)]);
  expect(results[0].status).toBe("fulfilled");expect(results[1]).toMatchObject({status:"rejected",reason:{code:"conflict"}});expect(readBudgetAllocation(localStorage,p).allocation?.allocations.food).toBe(30);
 });
 it("rejects a changed brief and never confirms failed storage",async()=>{
  const p=context();savePlannerDraft(localStorage,{...p,participants:8});await expect(writeBudgetAllocation(localStorage,p,null,emptyBudgetAllocations(),serial())).rejects.toMatchObject({code:"planner_changed"});
  savePlannerDraft(localStorage,p);const broken={getItem:(k:string)=>localStorage.getItem(k),setItem:()=>{throw Error("quota");}} as unknown as Storage;
  await expect(writeBudgetAllocation(broken,p,null,emptyBudgetAllocations(),serial())).rejects.toThrow("quota");expect(readBudgetAllocation(localStorage,p).kind).toBe("empty");
 });
 it("shares the reset lock, clears only this brand and prevents resurrection",async()=>{
  const p=context(),other=context("byebride");savePlannerDraft(localStorage,p);savePlannerDraft(localStorage,other);const lock=serial();
  const otherRaw=JSON.stringify(createBudgetAllocation(other,emptyBudgetAllocations()));localStorage.setItem(budgetAllocationStorageKey(other.brand),otherRaw);localStorage.setItem(programStorageKey(p.brand),"program untouched by budget save");
  await writeBudgetAllocation(localStorage,p,null,emptyBudgetAllocations(),lock);expect(localStorage.getItem(programStorageKey(p.brand))).toBe("program untouched by budget save");
  const raw=readBudgetAllocation(localStorage,p).raw;
  await Promise.all([writeBudgetAllocation(localStorage,p,raw,emptyBudgetAllocations(),lock),resetPlannerAndProgram(localStorage,p.brand,lock)]);
  expect(localStorage.getItem(budgetAllocationStorageKey(p.brand))).toBeNull();expect(localStorage.getItem(programStorageKey(p.brand))).toBeNull();expect(localStorage.getItem(budgetAllocationStorageKey(other.brand))).toBe(otherRaw);
  await expect(writeBudgetAllocation(localStorage,p,null,emptyBudgetAllocations(),lock)).rejects.toMatchObject({code:"planner_changed"});
 });
});
