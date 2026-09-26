/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthPage from "./auth-page";

const { authState, navigate, trackProductEvent } = vi.hoisted(() => ({
  authState: { registerSuccess: false, user: null as null | { id: string } },
  navigate: vi.fn(),
  trackProductEvent: vi.fn(),
}));

vi.mock("wouter", () => ({
  useLocation: () => [window.location.pathname, navigate],
  Link: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    user: authState.user,
    loginMutation: { mutate: vi.fn(), isPending: false },
    registerMutation: {
      mutate: vi.fn(),
      isPending: false,
      isSuccess: authState.registerSuccess,
    },
  }),
}));

vi.mock("@/lib/track", () => ({ trackProductEvent }));

vi.mock("@/contexts/LanguageContext", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "auth.login": "Accedi",
        "auth.signup": "Registrati",
        "auth.email": "Email",
        "auth.password": "Password",
        "auth.forgotPassword": "Password dimenticata?",
        "auth.usernameOptional": "Username (opzionale)",
        "auth.fullNameOptional": "Nome completo (opzionale)",
        "auth.createAccount": "Crea Account",
        "auth.sideTitle": "Unisciti a ByeBro oggi",
        "auth.sideDesc": "Descrizione ByeBro",
        "auth.sideTitleBride": "Unisciti a ByeBride oggi",
        "auth.sideDescBride": "Descrizione ByeBride",
      })[key] ?? key,
  }),
}));

describe("AuthPage", () => {
  beforeEach(() => {
    navigate.mockClear();
    trackProductEvent.mockClear();
    authState.registerSuccess = false;
    authState.user = null;
    localStorage.clear();
    localStorage.setItem("selectedBrand", "byebro");
  });

  it("opens the registration tab when requested in the URL", () => {
    window.history.replaceState({}, "", "/auth?tab=register");

    render(<AuthPage />);

    expect(
      screen.getByRole("tab", { name: "Registrati", selected: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tabpanel", { name: "Registrati" }),
    ).toBeInTheDocument();
  });

  it("defaults to the login tab", () => {
    window.history.replaceState({}, "", "/auth");

    render(<AuthPage />);

    expect(
      screen.getByRole("tab", { name: "Accedi", selected: true }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveClass("bg-white", "text-gray-950");
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Email")).not.toHaveAttribute("placeholder");
    expect(screen.getByLabelText("Password")).not.toHaveAttribute("placeholder");
    expect(screen.getByRole("link", { name: "Password dimenticata?" })).toHaveAttribute(
      "href",
      "/auth/forgot-password",
    );
  });

  it("uses ByeBride content when that brand is selected", () => {
    localStorage.setItem("selectedBrand", "byebride");
    window.history.replaceState({}, "", "/auth");

    render(<AuthPage />);

    expect(
      screen.getByRole("heading", { name: "Unisciti a ByeBride oggi" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Descrizione ByeBride")).toBeInTheDocument();
  });

  it("returns to checkout after authentication without clearing the pending trip context", () => {
    const pendingTrip = JSON.stringify({ destination: "Ibiza", people: 6 });
    localStorage.setItem("currentItinerary", pendingTrip);
    window.history.replaceState({}, "", "/auth?next=%2Fcheckout");
    authState.user = { id: "user-a" };

    render(<AuthPage />);

    expect(navigate).toHaveBeenCalledWith("/checkout");
    expect(localStorage.getItem("currentItinerary")).toBe(pendingTrip);
  });

  it("tracks a submitted signup after signUp succeeds", () => {
    authState.registerSuccess = true;

    render(<AuthPage />);

    expect(trackProductEvent).toHaveBeenCalledWith("signup_submitted");
    expect(trackProductEvent).not.toHaveBeenCalledWith("signup_completed");
  });
});
