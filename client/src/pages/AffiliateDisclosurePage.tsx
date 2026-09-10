import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useTranslation } from "@/contexts/LanguageContext";

export default function AffiliateDisclosurePage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main id="main-content" tabIndex={-1} className="flex-grow py-16">
        <article className="container mx-auto max-w-3xl px-4">
          <h1 className="text-4xl font-bold mb-6">{t('affiliateDisclosure.title')}</h1>
          <p className="text-lg text-gray-700 mb-10">{t('affiliateDisclosure.intro')}</p>

          <div className="space-y-8 text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t('affiliateDisclosure.howTitle')}</h2>
              <p>{t('affiliateDisclosure.howText')}</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t('affiliateDisclosure.providersTitle')}</h2>
              <p>{t('affiliateDisclosure.providersText')}</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t('affiliateDisclosure.costTitle')}</h2>
              <p>{t('affiliateDisclosure.costText')}</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t('affiliateDisclosure.trackingTitle')}</h2>
              <p>{t('affiliateDisclosure.trackingText')}</p>
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-3">{t('affiliateDisclosure.independenceTitle')}</h2>
              <p>{t('affiliateDisclosure.independenceText')}</p>
            </section>
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
