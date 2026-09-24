import { FormEvent, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";

const RESET_REDIRECT_URL = "https://byebi.it/auth/reset-password";
const CONFIRM_REDIRECT_URL = "https://byebi.it/auth";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const isBride = localStorage.getItem("selectedBrand") === "byebride";
  const accentClass = isBride
    ? "bg-pink-600 hover:bg-pink-700"
    : "bg-red-600 hover:bg-red-700";

  const requestReset = async (event: FormEvent) => {
    event.preventDefault();
    setIsSending(true);
    setMessage(null);
    setIsError(false);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: RESET_REDIRECT_URL,
    });

    setIsSending(false);
    if (error) {
      setIsError(true);
      setMessage(t("auth.resetRequestError"));
      return;
    }

    setMessage(t("auth.resetRequestSuccess"));
  };

  const resendConfirmation = async () => {
    if (!email) {
      setIsError(true);
      setMessage(t("auth.emailRequired"));
      return;
    }

    setIsResending(true);
    setMessage(null);
    setIsError(false);

    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: CONFIRM_REDIRECT_URL },
    });

    setIsResending(false);
    if (error) {
      setIsError(true);
      setMessage(t("auth.confirmationResendError"));
      return;
    }

    setMessage(t("auth.confirmationResendSuccess"));
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black p-8 text-white">
      <section className="w-full max-w-md space-y-6">
        <Button variant="ghost" asChild className="text-gray-400 hover:bg-gray-800 hover:text-white">
          <Link href="/auth">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("auth.backToLogin")}
          </Link>
        </Button>

        <div>
          <h1 className="text-3xl font-bold">{t("auth.resetRequestTitle")}</h1>
          <p className="mt-2 text-sm text-gray-400">{t("auth.resetRequestDescription")}</p>
        </div>

        <form onSubmit={requestReset} className="space-y-4">
          <label className="block space-y-2">
            <span className="text-sm font-medium">{t("auth.email")}</span>
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 border-gray-500 bg-white text-gray-950 caret-gray-950"
            />
          </label>

          {message && (
            <p role={isError ? "alert" : "status"} className={isError ? "text-sm text-red-400" : "text-sm text-green-400"}>
              {message}
            </p>
          )}

          <Button type="submit" className={`w-full text-white ${accentClass}`} disabled={isSending || isResending}>
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t(isSending ? "auth.sendingReset" : "auth.sendReset")}
          </Button>
        </form>

        <div className="border-t border-gray-800 pt-5 text-center">
          <p className="mb-3 text-sm text-gray-400">{t("auth.confirmationMissing")}</p>
          <Button type="button" variant="outline" className="border-gray-600 bg-transparent text-white hover:bg-gray-800" disabled={isSending || isResending} onClick={resendConfirmation}>
            {isResending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t(isResending ? "auth.resendingConfirmation" : "auth.resendConfirmation")}
          </Button>
        </div>
      </section>
    </main>
  );
}
