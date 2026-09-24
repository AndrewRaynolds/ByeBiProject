/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResetPasswordPage from "./reset-password-page";

const { getSession, exchangeCodeForSession, updateUser, unsubscribe } = vi.hoisted(() => ({
  getSession: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  updateUser: vi.fn(),
  unsubscribe: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession,
      exchangeCodeForSession,
      updateUser,
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe } } })),
    },
  },
}));

vi.mock("wouter", () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/auth/reset-password");
    getSession.mockReset();
    exchangeCodeForSession.mockReset();
    updateUser.mockReset();
    getSession.mockResolvedValue({ data: { session: { user: { id: "user-1" } } } });
    updateUser.mockResolvedValue({ error: null });
    localStorage.setItem("selectedBrand", "byebro");
  });

  it("updates the password when a recovery session is available", async () => {
    render(<ResetPasswordPage />);
    await screen.findByLabelText("auth.newPassword");

    fireEvent.change(screen.getByLabelText("auth.newPassword"), { target: { value: "new-secret" } });
    fireEvent.change(screen.getByLabelText("auth.confirmNewPassword"), { target: { value: "new-secret" } });
    fireEvent.click(screen.getByRole("button", { name: "auth.updatePassword" }));

    await waitFor(() => expect(updateUser).toHaveBeenCalledWith({ password: "new-secret" }));
    expect(screen.getByRole("status")).toHaveTextContent("auth.passwordUpdateSuccess");
  });

  it("rejects a callback carrying an error", async () => {
    window.history.replaceState({}, "", "/auth/reset-password?error=access_denied");
    render(<ResetPasswordPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("auth.invalidResetLink");
    expect(getSession).not.toHaveBeenCalled();
  });
});
