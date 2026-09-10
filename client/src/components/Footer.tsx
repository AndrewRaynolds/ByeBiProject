import { Link } from "wouter";
import { Mail } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";
import { sellerConfig } from "@/lib/sellerConfig";

export default function Footer() {
  const { t } = useTranslation();
  const isBride = localStorage.getItem("selectedBrand") === "byebride";
  const accentClass = isBride ? "text-pink-500" : "text-primary";
  const linkClass = isBride
    ? "text-white/85 transition duration-200 hover:text-pink-300 hover:drop-shadow-[0_0_8px_rgba(244,114,182,0.8)]"
    : "text-white/85 transition duration-200 hover:text-red-300 hover:drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]";

  return (
    <footer className="bg-dark text-white/85 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <Link href="/" className="text-white font-poppins font-bold text-2xl mb-4 block">
              <span className="text-white">Bye</span><span className={accentClass}>{isBride ? "Bride" : "Bro"}</span>
            </Link>
            <p className="text-white/75 mb-4 leading-relaxed">{t(isBride ? 'footer.taglineBride' : 'footer.taglineBro')}</p>
          </div>
          
          <div>
            <h4 className="text-white font-bold text-lg mb-4">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className={linkClass}>
                  {t('header.howItWorks')}
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
                <Link href="/affiliate-disclosure" className={linkClass}>
                  {t('footer.affiliateDisclosure')}
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
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-bold text-lg mb-4">{t('footer.contact')}</h4>
            <ul className="space-y-2">
              {sellerConfig.contactEmail ? (
                <li className="flex items-start">
                  <Mail className={`${accentClass} mt-1 mr-3 h-4 w-4`} />
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
