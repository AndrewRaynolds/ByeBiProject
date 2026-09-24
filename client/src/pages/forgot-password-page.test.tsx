/**
 * @vitest-environment jsdom
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ForgotPasswordPage from "./forgot-password-page";

const { resetPasswordForEmail, resend } = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
  resend: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: { auth: { resetPasswordForEmail, resend } },
}));

vi.mock("wouter", () => ({
  Link: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

vi.mock("@/contexts/LanguageContext", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    resetPasswordForEmail.mockReset();
    resend.mockReset();
    resetPasswordForEmail.mockResolvedValue({ error: null });
    resend.mockResolvedValue({ error: null });
    localStorage.setItem("selectedBrand", "byebro");
  });

  it("requests a password reset using the production callback", async () => {
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText("auth.email"), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "auth.sendReset" }));

    await waitFor(() => expect(resetPasswordForEmail).toHaveBeenCalledWith(
      "person@example.com",
      { redirectTo: "https://byebi.it/auth/reset-password" },
    ));
    expect(screen.getByRole("status")).toHaveTextContent("auth.resetRequestSuccess");
  });

  it("uses a non-enumerating confirmation resend message", async () => {
    render(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText("auth.email"), { target: { value: "person@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "auth.resendConfirmation" }));

    await waitFor(() => expect(resend).toHaveBeenCalledWith({
      type: "signup",
      email: "person@example.com",
      options: { emailRedirectTo: "https://byebi.it/auth" },
    }));
    expect(screen.getByRole("status")).toHaveTextContent("auth.confirmationResendSuccess");
  });
});
