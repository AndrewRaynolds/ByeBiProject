import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/contexts/LanguageContext";
import { finishGoogleSignIn, googleRetryPath, GoogleAuthError, navigateAfterGoogle } from "@/lib/googleAuth";

export default function AuthCallbackPage() {
  const { t } = useTranslation();
  const [retry] = useState(googleRetryPath);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void finishGoogleSignIn().then(next => { if (active) navigateAfterGoogle(next); })
      .catch(reason => { if (active) setError(reason instanceof GoogleAuthError ? reason.reason : "failed"); });
    return () => { active = false; };
  }, []);
  return <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
    <section className="w-full max-w-md space-y-5">
      <h1 className="text-2xl font-bold">{t("auth.google.callbackTitle")}</h1>
      {error ? <><p role="alert">{t(`auth.google.${error}`)}</p><Button asChild className="h-auto min-h-11 w-full whitespace-normal"><a href={retry}>{t("auth.google.retry")}</a></Button></>
        : <p role="status">{t("auth.google.finishing")}</p>}
    </section>
  </main>;
}
