import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { isSellerConfigComplete, sellerConfig } from "@/lib/sellerConfig";
import { useTranslation, type Locale } from "@/contexts/LanguageContext";

export type LegalDocument = "terms" | "privacy" | "refund";

type Section = { title: string; paragraphs: string[] };
type DocumentContent = { title: string; updated: string; intro: string; sections: Section[] };

const sellerIdentity = (locale: Locale): string => {
  if (!isSellerConfigComplete) {
    return locale === "it"
      ? "I dati identificativi del venditore saranno pubblicati prima dell'attivazione delle vendite reali."
      : locale === "es"
        ? "Los datos identificativos del vendedor se publicarán antes de activar las ventas reales."
        : "The seller's identifying details will be published before live sales are enabled.";
  }

  return [
    sellerConfig.legalName,
    sellerConfig.legalAddress,
    sellerConfig.country,
    sellerConfig.vatId ? `VAT/Tax ID: ${sellerConfig.vatId}` : "",
    sellerConfig.contactEmail,
  ].filter(Boolean).join(" — ");
};

const content: Record<Locale, Record<LegalDocument, DocumentContent>> = {
  it: {
    terms: {
      title: "Termini e condizioni di vendita",
      updated: "Versione 4 agosto 2026",
      intro: "Questi termini disciplinano l'acquisto del merchandise ByeBi. Prima del lancio commerciale saranno verificati con un professionista sulla base della forma giuridica effettiva del venditore.",
      sections: [
        { title: "Venditore e contatti", paragraphs: ["{{seller}}"] },
        { title: "Prodotti, prezzi e disponibilità", paragraphs: ["Le caratteristiche essenziali e il prezzo sono mostrati prima dell'ordine. I costi di spedizione sono calcolati in base al Paese selezionato e mostrati prima del pagamento. Eventuali tasse applicabili sono gestite secondo la normativa vigente."] },
        { title: "Ordine e pagamento", paragraphs: ["Premendo il pulsante con obbligo di pagamento, il cliente invia un ordine e accetta questi termini. Il pagamento è elaborato da Stripe. L'ordine è confermato solo dopo l'esito positivo del pagamento e i controlli tecnici."] },
        { title: "Produzione e consegna", paragraphs: ["Il merchandise è prodotto e spedito tramite Printful. Le stime di consegna non costituiscono una data garantita; eventuali ritardi rilevanti saranno gestiti secondo i diritti inderogabili del consumatore."] },
        { title: "Conformità e reclami", paragraphs: ["Restano integri i diritti previsti dalla garanzia legale per prodotti difettosi o non conformi. Per assistenza o reclami usare il contatto del venditore indicato sopra."] },
      ],
    },
    privacy: {
      title: "Informativa sulla privacy",
      updated: "Versione 4 agosto 2026",
      intro: "Questa informativa descrive in modo trasparente i principali trattamenti del sito. Prima del lancio sarà completata con basi giuridiche, tempi di conservazione e dati del titolare verificati.",
      sections: [
        { title: "Titolare e contatti", paragraphs: ["{{seller}}"] },
        { title: "Dati e finalità", paragraphs: ["Possiamo trattare dati di account e accesso, richieste di viaggio, ordini, indirizzi di consegna, comunicazioni di assistenza e dati tecnici necessari a sicurezza e funzionamento. Li usiamo per fornire il servizio richiesto, gestire account e ordini, prevenire abusi e adempiere agli obblighi di legge."] },
        { title: "Fornitori coinvolti", paragraphs: ["Supabase supporta autenticazione e database; Stripe elabora i pagamenti; Printful produce e spedisce il merchandise; Resend invia le comunicazioni transazionali sugli ordini; OpenAI può elaborare le richieste rivolte all'assistente di viaggio; Amadeus e i partner di affiliazione supportano ricerche e collegamenti esterni. Ogni fornitore tratta i dati secondo il proprio ruolo e le proprie condizioni."] },
        { title: "Conservazione e sicurezza", paragraphs: ["I dati sono conservati per il tempo necessario alle finalità indicate e agli obblighi legali. Prima del lancio commerciale saranno definiti periodi specifici e procedure di cancellazione, accesso e gestione degli incidenti."] },
        { title: "Diritti", paragraphs: ["Nei casi previsti è possibile chiedere accesso, rettifica, cancellazione, limitazione, portabilità o opposizione e presentare reclamo all'autorità competente. Le richieste vanno inviate al contatto del titolare."] },
      ],
    },
    refund: {
      title: "Resi, recesso e rimborsi",
      updated: "Versione 4 agosto 2026",
      intro: "Questa pagina riassume la procedura prevista per il merchandise. I diritti inderogabili del consumatore restano sempre applicabili.",
      sections: [
        { title: "Diritto di recesso", paragraphs: ["Per i prodotti standard acquistati a distanza, il consumatore dispone generalmente di 14 giorni dalla consegna per comunicare il recesso. Le modalità, l'indirizzo di restituzione e gli eventuali costi saranno comunicati dal venditore."] },
        { title: "Prodotti personalizzati", paragraphs: ["L'eccezione al recesso si applica solo ai beni realmente confezionati su misura o chiaramente personalizzati. La semplice produzione su richiesta non viene automaticamente considerata personalizzazione."] },
        { title: "Difetti o non conformità", paragraphs: ["Prodotti errati, danneggiati, difettosi o non conformi seguono la garanzia legale e non sono esclusi dalle regole sui prodotti personalizzati. Conservare foto e dettagli dell'ordine per facilitare la verifica."] },
        { title: "Come richiedere assistenza", paragraphs: ["Contattare il venditore indicando numero d'ordine, motivo e, se utile, fotografie. Non spedire il prodotto senza istruzioni: Printful può richiedere un indirizzo di reso specifico. Il rimborso approvato viene effettuato sul metodo di pagamento originario."] },
      ],
    },
  },
  en: {
    terms: {
      title: "Terms and conditions of sale",
      updated: "Version dated 4 August 2026",
      intro: "These terms govern purchases of ByeBi merchandise. Before commercial launch they will be reviewed by a professional based on the seller's actual legal form.",
      sections: [
        { title: "Seller and contact details", paragraphs: ["{{seller}}"] },
        { title: "Products, prices and availability", paragraphs: ["Essential product features and prices are shown before ordering. Shipping is calculated for the selected country and displayed before payment. Applicable taxes are handled under current law."] },
        { title: "Order and payment", paragraphs: ["By pressing the button carrying an obligation to pay, the customer places an order and accepts these terms. Stripe processes the payment. An order is confirmed only after successful payment and technical checks."] },
        { title: "Production and delivery", paragraphs: ["Printful produces and ships the merchandise. Delivery estimates are not guaranteed dates; material delays will be handled in accordance with mandatory consumer rights."] },
        { title: "Conformity and complaints", paragraphs: ["Statutory rights for defective or non-conforming products remain unaffected. Use the seller contact above for support or complaints."] },
      ],
    },
    privacy: {
      title: "Privacy notice",
      updated: "Version dated 4 August 2026",
      intro: "This notice transparently describes the site's main processing activities. Before launch it will be completed with verified legal bases, retention periods and controller details.",
      sections: [
        { title: "Controller and contact details", paragraphs: ["{{seller}}"] },
        { title: "Data and purposes", paragraphs: ["We may process account and login data, travel requests, orders, delivery addresses, support communications and technical data needed for security and operation. We use it to provide requested services, manage accounts and orders, prevent abuse and meet legal obligations."] },
        { title: "Service providers", paragraphs: ["Supabase supports authentication and the database; Stripe processes payments; Printful produces and ships merchandise; Resend sends transactional order communications; OpenAI may process requests sent to the travel assistant; Amadeus and affiliate partners support searches and external links. Each provider processes data according to its role and terms."] },
        { title: "Retention and security", paragraphs: ["Data is kept for as long as necessary for the stated purposes and legal obligations. Specific periods and procedures for deletion, access and incident handling will be defined before commercial launch."] },
        { title: "Your rights", paragraphs: ["Where applicable, you may request access, correction, deletion, restriction, portability or objection and complain to the competent authority. Send requests to the controller contact."] },
      ],
    },
    refund: {
      title: "Returns, withdrawal and refunds",
      updated: "Version dated 4 August 2026",
      intro: "This page summarises the merchandise process. Mandatory consumer rights always remain applicable.",
      sections: [
        { title: "Right of withdrawal", paragraphs: ["For standard goods bought at a distance, consumers generally have 14 days after delivery to notify withdrawal. The seller will provide the process, return address and any applicable return cost."] },
        { title: "Personalised products", paragraphs: ["The withdrawal exception applies only to genuinely tailor-made or clearly personalised goods. Simple production on demand is not automatically treated as personalisation."] },
        { title: "Defects or non-conformity", paragraphs: ["Incorrect, damaged, defective or non-conforming products remain covered by statutory rights and are not excluded by personalised-product rules. Keep photos and order details to support review."] },
        { title: "How to request help", paragraphs: ["Contact the seller with the order number, reason and useful photos. Do not return goods without instructions: Printful may require a specific return address. Approved refunds are issued to the original payment method."] },
      ],
    },
  },
  es: {
    terms: {
      title: "Términos y condiciones de venta",
      updated: "Versión de 4 de agosto de 2026",
      intro: "Estos términos regulan la compra de productos ByeBi. Antes del lanzamiento comercial serán revisados por un profesional según la forma jurídica real del vendedor.",
      sections: [
        { title: "Vendedor y contacto", paragraphs: ["{{seller}}"] },
        { title: "Productos, precios y disponibilidad", paragraphs: ["Las características esenciales y el precio se muestran antes del pedido. El envío se calcula para el país seleccionado y se muestra antes del pago. Los impuestos aplicables se gestionan conforme a la ley vigente."] },
        { title: "Pedido y pago", paragraphs: ["Al pulsar el botón con obligación de pago, el cliente realiza un pedido y acepta estos términos. Stripe procesa el pago. El pedido se confirma solo después del pago correcto y los controles técnicos."] },
        { title: "Producción y entrega", paragraphs: ["Printful produce y envía los productos. Las estimaciones de entrega no son fechas garantizadas; los retrasos relevantes se gestionarán respetando los derechos obligatorios del consumidor."] },
        { title: "Conformidad y reclamaciones", paragraphs: ["Los derechos legales por productos defectuosos o no conformes permanecen intactos. Para asistencia o reclamaciones, utiliza el contacto del vendedor."] },
      ],
    },
    privacy: {
      title: "Política de privacidad",
      updated: "Versión de 4 de agosto de 2026",
      intro: "Este aviso describe de forma transparente los principales tratamientos del sitio. Antes del lanzamiento se completará con bases jurídicas, plazos de conservación y datos verificados del responsable.",
      sections: [
        { title: "Responsable y contacto", paragraphs: ["{{seller}}"] },
        { title: "Datos y finalidades", paragraphs: ["Podemos tratar datos de cuenta y acceso, solicitudes de viaje, pedidos, direcciones de entrega, comunicaciones de soporte y datos técnicos necesarios para seguridad y funcionamiento. Se usan para prestar servicios, gestionar cuentas y pedidos, prevenir abusos y cumplir obligaciones legales."] },
        { title: "Proveedores", paragraphs: ["Supabase presta autenticación y base de datos; Stripe procesa pagos; Printful produce y envía productos; Resend envía comunicaciones transaccionales de los pedidos; OpenAI puede procesar solicitudes al asistente de viajes; Amadeus y socios afiliados apoyan búsquedas y enlaces externos. Cada proveedor trata los datos según su función y condiciones."] },
        { title: "Conservación y seguridad", paragraphs: ["Los datos se conservan durante el tiempo necesario para las finalidades indicadas y las obligaciones legales. Antes del lanzamiento comercial se definirán plazos y procedimientos específicos de eliminación, acceso e incidentes."] },
        { title: "Derechos", paragraphs: ["Cuando corresponda, puedes solicitar acceso, rectificación, supresión, limitación, portabilidad u oposición y reclamar ante la autoridad competente. Envía las solicitudes al contacto del responsable."] },
      ],
    },
    refund: {
      title: "Devoluciones, desistimiento y reembolsos",
      updated: "Versión de 4 de agosto de 2026",
      intro: "Esta página resume el proceso para productos. Los derechos obligatorios del consumidor siempre permanecen aplicables.",
      sections: [
        { title: "Derecho de desistimiento", paragraphs: ["Para bienes estándar comprados a distancia, el consumidor dispone generalmente de 14 días desde la entrega para comunicar el desistimiento. El vendedor facilitará el proceso, la dirección y los posibles costes de devolución."] },
        { title: "Productos personalizados", paragraphs: ["La excepción al desistimiento solo se aplica a bienes realmente hechos a medida o claramente personalizados. La simple producción bajo demanda no se considera automáticamente personalización."] },
        { title: "Defectos o falta de conformidad", paragraphs: ["Los productos incorrectos, dañados, defectuosos o no conformes mantienen la protección legal y no quedan excluidos por las reglas de personalización. Conserva fotos y detalles del pedido."] },
        { title: "Cómo solicitar ayuda", paragraphs: ["Contacta al vendedor con número de pedido, motivo y fotos útiles. No devuelvas el producto sin instrucciones: Printful puede exigir una dirección específica. Los reembolsos aprobados se emiten al método de pago original."] },
      ],
    },
  },
};

export default function LegalDocumentPage({ document }: { document: LegalDocument }) {
  const { locale } = useTranslation();
  const page = content[locale][document];
  const identity = sellerIdentity(locale);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <main id="main-content" tabIndex={-1} className="py-16">
        <article className="container mx-auto max-w-3xl px-4">
          {!isSellerConfigComplete && (
            <div className="mb-8 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900" role="status">
              {locale === "it"
                ? "Bozza pre-lancio: le vendite reali restano disattivate finché i dati del venditore e la revisione legale non sono completi."
                : locale === "es"
                  ? "Borrador previo al lanzamiento: las ventas reales permanecen desactivadas hasta completar los datos del vendedor y la revisión legal."
                  : "Pre-launch draft: live sales remain disabled until seller details and legal review are complete."}
            </div>
          )}
          <h1 className="mb-3 text-4xl font-bold">{page.title}</h1>
          <p className="mb-6 text-sm text-gray-500">{page.updated}</p>
          <p className="mb-10 text-lg leading-relaxed text-gray-700">{page.intro}</p>
          <div className="space-y-8">
            {page.sections.map((section) => (
              <section key={section.title}>
                <h2 className="mb-3 text-2xl font-semibold">{section.title}</h2>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mb-3 leading-relaxed text-gray-700">
                    {paragraph.replace("{{seller}}", identity)}
                  </p>
                ))}
              </section>
            ))}
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
}
