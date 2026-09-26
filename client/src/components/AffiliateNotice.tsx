import { Badge } from "@/components/ui/badge";
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
  const textClass = variant === "dark" ? "text-primary-foreground/70" : "text-muted-foreground";

  return (
    <div
      role="note"
      className={`flex items-start gap-2 text-xs ${textClass} ${className}`}
      data-testid="affiliate-notice"
    >
      <Badge variant="outline" className="border-primary/30 bg-brand-soft text-primary">
        {t('affiliateNotice.badge')}
      </Badge>
      {showText && <span>{t('affiliateNotice.text')}</span>}
    </div>
  );
}
