import { useTranslation } from "@/contexts/LanguageContext";

export function AffiliateNotice({
  variant = "dark",
  className = "",
  showText = true,
}: {
  variant?: "dark" | "light";
  className?: string;
  showText?: boolean;
}) {
  const { t } = useTranslation();
  if (!showText) return null;
  const textClass = variant === "dark" ? "text-primary-foreground/70" : "text-muted-foreground";

  return (
    <div
      role="note"
      className={`flex items-start gap-2 text-xs ${textClass} ${className}`}
      data-testid="affiliate-notice"
    >
      <span>{t('affiliateNotice.text')}</span>
    </div>
  );
}
