import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/contexts/LanguageContext";

export function AffiliateNotice({
  variant = "dark",
  className = "",
}: {
  variant?: "dark" | "light";
  className?: string;
}) {
  const { t } = useTranslation();
  const textClass = variant === "dark" ? "text-white/60" : "text-gray-600";

  return (
    <div
      role="note"
      className={`flex items-start gap-2 text-xs ${textClass} ${className}`}
      data-testid="affiliate-notice"
    >
      <Badge className="bg-orange-500/90 text-white hover:bg-orange-500">
        {t('affiliateNotice.badge')}
      </Badge>
      <span>{t('affiliateNotice.text')}</span>
    </div>
  );
}
