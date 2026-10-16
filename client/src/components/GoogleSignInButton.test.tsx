/** @vitest-environment jsdom */
import {act,fireEvent,render,screen,waitFor} from "@testing-library/react";
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import GoogleSignInButton from "./GoogleSignInButton";
import {LanguageProvider} from "@/contexts/LanguageContext";
import itCopy from "@/locales/it.json";import enCopy from "@/locales/en.json";import esCopy from "@/locales/es.json";
const {startGoogleSignIn,navigateToGoogle}=vi.hoisted(()=>({startGoogleSignIn:vi.fn(),navigateToGoogle:vi.fn()}));
vi.mock("@/lib/googleAuth",()=>({startGoogleSignIn,navigateToGoogle}));
beforeEach(()=>{localStorage.clear();vi.stubEnv("VITE_GOOGLE_AUTH_ENABLED","true");startGoogleSignIn.mockReset();navigateToGoogle.mockReset();window.history.replaceState({},"","/auth?next=%2Fcheckout");});
afterEach(()=>vi.unstubAllEnvs());
const mount=(disabled=false,onPendingChange=vi.fn())=>render(<LanguageProvider><GoogleSignInButton disabled={disabled} onPendingChange={onPendingChange}/></LanguageProvider>);
describe("Google sign-in entry",()=>{
 it("is hidden by default and while disabled by configuration",()=>{vi.stubEnv("VITE_GOOGLE_AUTH_ENABLED","false");mount();expect(screen.queryByRole("button")).not.toBeInTheDocument();expect(startGoogleSignIn).not.toHaveBeenCalled();});
 it("blocks duplicate clicks, preserves next and navigates only after a valid start",async()=>{
  let resolve!:(url:string)=>void;startGoogleSignIn.mockReturnValue(new Promise(r=>resolve=r));const pending=vi.fn();mount(false,pending);const button=screen.getByRole("button");fireEvent.click(button);fireEvent.click(button);
  await waitFor(()=>expect(startGoogleSignIn).toHaveBeenCalledTimes(1));expect(button).toBeDisabled();expect(startGoogleSignIn).toHaveBeenCalledWith("?next=%2Fcheckout");expect(pending).toHaveBeenCalledWith(true);
  await act(async()=>resolve("https://example.supabase.co/auth/v1/authorize?provider=google"));expect(navigateToGoogle).toHaveBeenCalledTimes(1);
 });
 it("shows a sanitized error and allows retry",async()=>{startGoogleSignIn.mockRejectedValue(Error("secret provider response"));mount();fireEvent.click(screen.getByRole("button"));expect(await screen.findByRole("alert")).toHaveTextContent(itCopy["auth.google.failed"]);expect(screen.queryByText("secret provider response")).not.toBeInTheDocument();expect(screen.getByRole("button")).toBeEnabled();});
 it("does not redirect after unmount or start while password login is pending",async()=>{
  const view=mount(true);fireEvent.click(screen.getByRole("button"));expect(startGoogleSignIn).not.toHaveBeenCalled();view.unmount();
  let resolve!:(url:string)=>void;startGoogleSignIn.mockReturnValue(new Promise(r=>resolve=r));const next=mount();fireEvent.click(screen.getByRole("button"));await waitFor(()=>expect(startGoogleSignIn).toHaveBeenCalled());next.unmount();await act(async()=>resolve("https://example.supabase.co/auth/v1/authorize?provider=google"));expect(navigateToGoogle).not.toHaveBeenCalled();
 });
 for(const brand of ["byebro","byebride"])for(const[lang,copy]of[["it",itCopy],["en",enCopy],["es",esCopy]]as const)it(`labels ${brand}/${lang}`,async()=>{
  localStorage.setItem("selectedBrand",brand);localStorage.setItem("byebi_locale",lang);mount();expect(await screen.findByRole("button",{name:copy["auth.google.continue"]})).toBeVisible();expect(screen.getByText(copy["auth.google.help"])).toBeVisible();
 });
});
