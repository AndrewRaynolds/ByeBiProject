/** @vitest-environment jsdom */
import {act,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import BudgetAllocationEditor from "./BudgetAllocationEditor";
import {LanguageProvider} from "@/contexts/LanguageContext";
import {createPlannerDraft} from "@shared/plannerSchemas";
import {createBudgetAllocation,emptyBudgetAllocations} from "@shared/budgetAllocationSchemas";
import {savePlannerDraft} from "@/lib/plannerStorage";
import {budgetAllocationStorageKey} from "@/lib/planningDraftKeys";
import {readBudgetAllocation} from "@/lib/budgetAllocationStorage";
import itCopy from "@/locales/it.json";
import enCopy from "@/locales/en.json";
import esCopy from "@/locales/es.json";
const context=(brand:"byebro"|"byebride"="byebro")=>createPlannerDraft({brand,origin:"Rome",destination:"Lisbon",startDate:"2099-10-10",endDate:"2099-10-13",participants:6,budgetPerPerson:600});
function mount(p=context()) {savePlannerDraft(localStorage,p);const refresh=vi.fn();return {p,refresh,...render(<LanguageProvider><BudgetAllocationEditor planner={p} onReloadPlanner={refresh}/></LanguageProvider>)};}
const fill=(key:string,value:string)=>fireEvent.change(screen.getByLabelText((itCopy as Record<string,string>)[`allocation.category.${key}`]),{target:{value}});
const save=()=>fireEvent.click(screen.getByRole("button",{name:itCopy["allocation.save"]}));
describe("optional budget allocation editor",()=>{
 beforeEach(()=>{localStorage.clear();vi.stubGlobal("navigator",{locks:{request:async(_name:string,_options:unknown,work:()=>unknown)=>work()}});});
 afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});
 it("previews without writing, saves explicitly and resumes",async()=>{
  const view=mount();expect(readBudgetAllocation(localStorage,view.p).kind).toBe("empty");fill("food","100");
  expect(screen.getByTestId("allocation-allocated").textContent).toContain("100");expect(readBudgetAllocation(localStorage,view.p).kind).toBe("empty");save();await screen.findByText(itCopy["allocation.saved"]);
  expect(readBudgetAllocation(localStorage,view.p).allocation?.allocations).toEqual({...emptyBudgetAllocations(),food:100});expect(screen.getByRole("heading",{name:itCopy["allocation.summary"]})).toHaveFocus();
  view.unmount();mount(view.p);expect(screen.getByLabelText(itCopy["allocation.category.food"])).toHaveValue(100);
 });
 it("allows over-allocation, distinguishes zero and clears only after save",async()=>{
  const view=mount();fill("food","630");fill("buffer","0");expect(screen.getByTestId("allocation-over").textContent).toContain("30");save();await screen.findByText(itCopy["allocation.saved"]);
  expect(readBudgetAllocation(localStorage,view.p).allocation?.allocations.buffer).toBe(0);
  fireEvent.click(screen.getByRole("button",{name:itCopy["allocation.clear"]}));expect(readBudgetAllocation(localStorage,view.p).allocation?.allocations.food).toBe(630);save();await screen.findByText(itCopy["allocation.saved"]);expect(readBudgetAllocation(localStorage,view.p).allocation?.allocations).toEqual(emptyBudgetAllocations());
 });
 it("does not invent a cap and rejects invalid amounts",()=>{
  mount({...context(),budgetPerPerson:null});fill("food","100");expect(screen.getByTestId("allocation-remaining")).toHaveTextContent(itCopy["allocation.unknown"]);expect(screen.getByTestId("allocation-groupCap")).toHaveTextContent(itCopy["allocation.unknown"]);
  for(const value of ["-1","0.5","100001"]){fill("food",value);expect(screen.getByRole("button",{name:itCopy["allocation.save"]})).toBeDisabled();expect(screen.getByText(itCopy["allocation.invalidAmount"])).toBeInTheDocument();}
 });
 it("requires explicit review after cap and group changes without redistributing",async()=>{
  const p=context();localStorage.setItem(budgetAllocationStorageKey(p.brand),JSON.stringify(createBudgetAllocation(p,{...emptyBudgetAllocations(),food:100})));
  const view=mount({...p,budgetPerPerson:500,participants:8});expect(screen.getByText(itCopy["allocation.review"])).toBeInTheDocument();expect(readBudgetAllocation(localStorage,view.p).allocation?.basis.budgetPerPerson).toBe(600);
  expect(screen.getByLabelText(itCopy["allocation.category.food"])).toHaveValue(100);fireEvent.click(screen.getByRole("button",{name:itCopy["allocation.confirm"]}));await screen.findByText(itCopy["allocation.saved"]);
  expect(readBudgetAllocation(localStorage,view.p).allocation).toMatchObject({basis:{budgetPerPerson:500,participants:8},allocations:{food:100}});
 });
 it("preserves unsaved fields on cross-tab conflict and requires reload",async()=>{
  const view=mount();fill("food","55");const raw=JSON.stringify(createBudgetAllocation(view.p,{...emptyBudgetAllocations(),food:80}));localStorage.setItem(budgetAllocationStorageKey(view.p.brand),raw);
  act(()=>window.dispatchEvent(new StorageEvent("storage",{key:budgetAllocationStorageKey(view.p.brand),newValue:raw})));
  expect(screen.getByText(itCopy["allocation.conflict"])).toBeInTheDocument();expect(screen.getByLabelText(itCopy["allocation.category.food"])).toHaveValue(55);expect(screen.getByRole("button",{name:itCopy["allocation.save"]})).toBeDisabled();
  fireEvent.click(screen.getByRole("button",{name:itCopy["allocation.reload"]}));expect(screen.getByLabelText(itCopy["allocation.category.food"])).toHaveValue(80);
 });
 it("reports quota failure without false success and preserves fields for retry",async()=>{
  mount();fill("food","55");vi.spyOn(Storage.prototype,"setItem").mockImplementation(()=>{throw Error("quota");});save();await screen.findByText(itCopy["allocation.storageError"]);expect(screen.queryByText(itCopy["allocation.saved"])).not.toBeInTheDocument();expect(screen.getByLabelText(itCopy["allocation.category.food"])).toHaveValue(55);
 });
 it("fails safely without Web Locks and preserves unreadable data until explicit replacement",async()=>{
  vi.stubGlobal("navigator",{});const p=context();localStorage.setItem(budgetAllocationStorageKey(p.brand),"broken");mount(p);expect(localStorage.getItem(budgetAllocationStorageKey(p.brand))).toBe("broken");
  fireEvent.click(screen.getByRole("button",{name:itCopy["allocation.replace"]}));await screen.findByText(itCopy["allocation.unsupported"]);expect(localStorage.getItem(budgetAllocationStorageKey(p.brand))).toBe("broken");
 });
 for(const brand of ["byebro","byebride"] as const) for(const [lang,copy] of [["it",itCopy],["en",enCopy],["es",esCopy]] as const) it(`shares behavior for ${brand}/${lang}`,async()=>{
  localStorage.setItem("byebi_locale",lang);const view=mount(context(brand));
  await screen.findByText(copy["allocation.open"]);
  fireEvent.click(screen.getByRole("button",{name:copy["allocation.save"]}));await waitFor(()=>expect(readBudgetAllocation(localStorage,view.p).kind).toBe("ready"));
 });
});
