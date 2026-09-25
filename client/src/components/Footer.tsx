import { Link } from "wouter";
import { Mail } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";
import { sellerConfig } from "@/lib/sellerConfig";
import { useBrand } from "@/contexts/BrandContext";

export default function Footer() {
  const { t } = useTranslation();
  const { brand } = useBrand();
  const isBride = brand === "byebride";
  const linkClass = "text-white/70 transition-colors hover:text-white";

  return (
    <footer className="bg-surface-inverse py-12 text-white/80">
      <div className="page-container">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div>
            <Link href="/" className="mb-4 block font-display text-2xl font-bold text-white">
              Bye<span className="text-primary">{isBride ? "Bride" : "Bro"}</span>
            </Link>
            <p className="text-white/75 mb-4 leading-relaxed">{t(isBride ? 'footer.taglineBride' : 'footer.taglineBro')}</p>
          </div>
          
          <div>
            <h4 className="mb-4 font-display text-lg font-semibold text-white">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className={linkClass}>
                  {t('header.planTrip')}
                </Link>
              </li>
              <li>
                <Link href="/destinations" className={linkClass}>
                  {t('header.destinations')}
                </Link>
              </li>
              <li>
                <Link href="/experiences" className={linkClass}>
                  {t('header.experiences')}
                </Link>
              </li>
              <li>
                <Link href="/secret-blog" className={linkClass}>
                  {t('header.secretBlog')}
                </Link>
              </li>
              <li>
                <Link href="/merchandise" className={linkClass}>
                  {t('footer.customMerch')}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className={linkClass}>
                  {t('footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className={linkClass}>
                  {t('footer.termsOfService')}
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className={linkClass}>
                  {t('footer.refundPolicy')}
                </Link>
              </li>
              <li>
                <Link href="/affiliate-disclosure" className={linkClass}>
                  {t('footer.commercialTransparency')}
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="mb-4 font-display text-lg font-semibold text-white">{t('footer.contact')}</h4>
            <ul className="space-y-2">
              {sellerConfig.contactEmail ? (
                <li className="flex items-start">
                  <Mail className="mr-3 mt-1 h-4 w-4 text-primary" />
                  <a
                    href={`mailto:${sellerConfig.contactEmail}`}
                    className={linkClass}
                  >
                    {sellerConfig.contactEmail}
                  </a>
                </li>
              ) : (
                <li className="text-sm text-white/75">{t('footer.salesNotActive')}</li>
              )}
            </ul>
          </div>
        </div>
        
        <div className="border-t border-white/15 mt-12 pt-8 text-center">
          <p className="text-white/65">{t(isBride ? 'footer.copyrightBride' : 'footer.copyrightBro', { year: new Date().getFullYear().toString() })}</p>
        </div>
      </div>
    </footer>
  );
}
