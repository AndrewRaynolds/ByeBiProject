import { FormEvent, useEffect, useState } from "react";
import { Link } from "wouter";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";

type RecoveryState = "checking" | "ready" | "invalid" | "success";

function callbackError(): boolean {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return Boolean(search.get("error") || hash.get("error"));
}

export default function ResetPasswordPage() {
  const { t } = useTranslation();
  const [recoveryState, setRecoveryState] = useState<RecoveryState>("checking");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isBride = localStorage.getItem("selectedBrand") === "byebride";

  useEffect(() => {
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (active && event === "PASSWORD_RECOVERY" && session) {
        setRecoveryState("ready");
      }
    });

    const initializeRecovery = async () => {
      if (callbackError()) {
        if (active) setRecoveryState("invalid");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        if (active) setRecoveryState("ready");
        return;
      }

      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (active) setRecoveryState(!error && data.session ? "ready" : "invalid");
        return;
      }

      if (active) setRecoveryState("invalid");
    };

    void initializeRecovery();
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const updatePassword = async (event: FormEvent) => {
    event.preventDefault();
    setMessage(null);

    if (password.length < 6) {
      setMessage(t("auth.passwordTooShort"));
      return;
    }
    if (password !== confirmation) {
      setMessage(t("auth.passwordsDoNotMatch"));
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsSaving(false);

    if (error) {
      setMessage(t("auth.passwordUpdateError"));
      return;
    }

    setRecoveryState("success");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-black p-8 text-white">
      <section className="w-full max-w-md space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{t("auth.resetPasswordTitle")}</h1>
          <p className="mt-2 text-sm text-gray-400">{t("auth.resetPasswordDescription")}</p>
        </div>

        {recoveryState === "checking" && (
          <div role="status" className="flex items-center text-gray-300">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t("auth.checkingResetLink")}
          </div>
        )}

        {recoveryState === "invalid" && (
          <div className="space-y-4">
            <p role="alert" className="text-sm text-red-400">{t("auth.invalidResetLink")}</p>
            <Button asChild className="w-full">
              <Link href="/auth/forgot-password">{t("auth.requestNewResetLink")}</Link>
            </Button>
          </div>
        )}

        {recoveryState === "ready" && (
          <form onSubmit={updatePassword} className="space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium">{t("auth.newPassword")}</span>
              <Input type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 border-gray-500 bg-white text-gray-950 caret-gray-950" />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-medium">{t("auth.confirmNewPassword")}</span>
              <Input type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="h-12 border-gray-500 bg-white text-gray-950 caret-gray-950" />
            </label>
            {message && <p role="alert" className="text-sm text-red-400">{message}</p>}
            <Button type="submit" className={`w-full text-white ${isBride ? "bg-pink-600 hover:bg-pink-700" : "bg-red-600 hover:bg-red-700"}`} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t(isSaving ? "auth.updatingPassword" : "auth.updatePassword")}
            </Button>
          </form>
        )}

        {recoveryState === "success" && (
          <div className="space-y-4">
            <p role="status" className="text-sm text-green-400">{t("auth.passwordUpdateSuccess")}</p>
            <Button asChild className="w-full">
              <Link href="/">{t("auth.continue")}</Link>
            </Button>
          </div>
        )}
      </section>
    </main>
  );
}
