import { Link } from "wouter";
import { Mail } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";

export default function Footer() {
  const { t } = useTranslation();
  const isBride = localStorage.getItem("selectedBrand") === "byebride";
  const accentClass = isBride ? "text-pink-500" : "text-primary";
  const supportEmail = isBride ? "support@byebride.com" : "support@byebro.com";

  return (
    <footer className="bg-dark text-gray-300 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div>
            <Link href="/" className="text-white font-poppins font-bold text-2xl mb-4 block">
              <span className="text-white">Bye</span><span className={accentClass}>{isBride ? "Bride" : "Bro"}</span>
            </Link>
            <p className="text-gray-400 mb-4">{t(isBride ? 'footer.taglineBride' : 'footer.taglineBro')}</p>
          </div>
          
          <div>
            <h4 className="text-white font-bold text-lg mb-4">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-400 hover:text-white transition">
                  {t('header.howItWorks')}
                </Link>
              </li>
              <li>
                <Link href="/destinations" className="text-gray-400 hover:text-white transition">
                  {t('header.destinations')}
                </Link>
              </li>
              <li>
                <Link href="/experiences" className="text-gray-400 hover:text-white transition">
                  {t('header.experiences')}
                </Link>
              </li>
              <li>
                <Link href="/secret-blog" className="text-gray-400 hover:text-white transition">
                  {t('header.secretBlog')}
                </Link>
              </li>
              <li>
                <Link href="/merchandise" className="text-gray-400 hover:text-white transition">
                  {t('footer.customMerch')}
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-bold text-lg mb-4">{t('footer.contact')}</h4>
            <ul className="space-y-2">
              <li className="flex items-start">
                <Mail className={`${accentClass} mt-1 mr-3 h-4 w-4`} />
                <a
                  href={`mailto:${supportEmail}`}
                  className="text-gray-400 transition hover:text-white"
                >
                  {supportEmail}
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-12 pt-8 text-center">
          <p className="text-gray-500">{t(isBride ? 'footer.copyrightBride' : 'footer.copyrightBro', { year: new Date().getFullYear().toString() })}</p>
        </div>
      </div>
    </footer>
  );
}
