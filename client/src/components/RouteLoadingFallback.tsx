import { useTranslation } from "@/contexts/LanguageContext";

export default function RouteLoadingFallback() {
  const { t } = useTranslation();

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-background"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 text-lg font-semibold text-foreground">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        {t("common.loading")}
      </div>
    </div>
  );
}
