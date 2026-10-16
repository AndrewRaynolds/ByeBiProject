/** @vitest-environment jsdom */
import {StrictMode} from "react";
import {act,render,screen,waitFor} from "@testing-library/react";
import {beforeEach,describe,expect,it,vi} from "vitest";
const {finishGoogleSignIn,navigateAfterGoogle}=vi.hoisted(()=>({finishGoogleSignIn:vi.fn(),navigateAfterGoogle:vi.fn()}));
vi.mock("@/lib/googleAuth",()=>({finishGoogleSignIn,navigateAfterGoogle,googleRetryPath:()=>"/auth?next=%2Fcheckout",GoogleAuthError:class extends Error {reason="failed";}}));
vi.mock("@/contexts/LanguageContext",()=>({useTranslation:()=>({t:(key:string)=>key})}));
import AuthCallbackPage from "./auth-callback-page";
beforeEach(()=>{finishGoogleSignIn.mockReset();navigateAfterGoogle.mockReset();});
describe("Google callback page",()=>{
 it("waits for exchange success even if an old session could exist",async()=>{
  let resolve!:(value:string)=>void;const pending=new Promise<string>(r=>resolve=r);finishGoogleSignIn.mockReturnValue(pending);render(<StrictMode><AuthCallbackPage/></StrictMode>);
  expect(screen.getByRole("status")).toHaveTextContent("auth.google.finishing");expect(navigateAfterGoogle).not.toHaveBeenCalled();await act(async()=>resolve("/checkout"));expect(navigateAfterGoogle).toHaveBeenCalledTimes(1);expect(navigateAfterGoogle).toHaveBeenCalledWith("/checkout");
 });
 it("never renders provider details and provides a safe retry",async()=>{finishGoogleSignIn.mockRejectedValue(Error("<script>sensitive code</script>"));render(<AuthCallbackPage/>);expect(await screen.findByRole("alert")).toHaveTextContent("auth.google.failed");expect(screen.getByRole("link")).toHaveAttribute("href","/auth?next=%2Fcheckout");expect(navigateAfterGoogle).not.toHaveBeenCalled();});
 it("ignores completion after unmount",async()=>{let resolve!:(value:string)=>void;finishGoogleSignIn.mockReturnValue(new Promise(r=>resolve=r));const view=render(<AuthCallbackPage/>);await waitFor(()=>expect(finishGoogleSignIn).toHaveBeenCalled());view.unmount();await act(async()=>resolve("/checkout"));expect(navigateAfterGoogle).not.toHaveBeenCalled();});
});
