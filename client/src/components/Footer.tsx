import { Link } from "wouter";
import { FaFacebookF, FaTwitter, FaInstagram, FaTiktok } from "react-icons/fa";
import { Mail, Phone, MapPin } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";

export default function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="bg-dark text-gray-300 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link href="/" className="text-white font-poppins font-bold text-2xl mb-4 block">
              <span className="text-white">Bye</span><span className="text-primary">Bro</span>
            </Link>
            <p className="text-gray-400 mb-4">{t('footer.tagline')}</p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition">
                <FaFacebookF />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition">
                <FaTwitter />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition">
                <FaInstagram />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition">
                <FaTiktok />
              </a>
            </div>
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
            <h4 className="text-white font-bold text-lg mb-4">{t('footer.support')}</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/faq" className="text-gray-400 hover:text-white transition">
                  {t('footer.faqs')}
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-white transition">
                  {t('footer.contactUs')}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-400 hover:text-white transition">
                  {t('footer.privacyPolicy')}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-400 hover:text-white transition">
                  {t('footer.termsOfService')}
                </Link>
              </li>
              <li>
                <Link href="/refunds" className="text-gray-400 hover:text-white transition">
                  {t('footer.refundPolicy')}
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-white font-bold text-lg mb-4">{t('footer.contact')}</h4>
            <ul className="space-y-2">
              <li className="flex items-start">
                <Mail className="text-primary mt-1 mr-3 h-4 w-4" />
                <span>support@byebro.com</span>
              </li>
              <li className="flex items-start">
                <Phone className="text-primary mt-1 mr-3 h-4 w-4" />
                <span>+1 (888) 123-4567</span>
              </li>
              <li className="flex items-start">
                <MapPin className="text-primary mt-1 mr-3 h-4 w-4" />
                <span>123 Party Street, Amsterdam, Netherlands</span>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-12 pt-8 text-center">
          <p className="text-gray-500">{t('footer.copyright', { year: new Date().getFullYear().toString() })}</p>
        </div>
      </div>
    </footer>
  );
}
