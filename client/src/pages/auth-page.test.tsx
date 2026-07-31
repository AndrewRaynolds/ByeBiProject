/**
 * @vitest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AuthPage from "./auth-page";

const navigate = vi.fn();

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
    user: null,
    loginMutation: { mutate: vi.fn(), isPending: false },
    registerMutation: { mutate: vi.fn(), isPending: false },
  }),
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useTranslation: () => ({
    t: (key: string) =>
      ({
        "auth.login": "Accedi",
        "auth.signup": "Registrati",
        "auth.email": "Email",
        "auth.password": "Password",
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
});
