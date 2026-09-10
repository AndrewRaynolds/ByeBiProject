const readPublicValue = (value: string | undefined): string => value?.trim() || "";

export const sellerConfig = {
  legalName: readPublicValue(import.meta.env.VITE_SELLER_LEGAL_NAME),
  contactEmail: readPublicValue(import.meta.env.VITE_SELLER_CONTACT_EMAIL),
  legalAddress: readPublicValue(import.meta.env.VITE_SELLER_LEGAL_ADDRESS),
  country: readPublicValue(import.meta.env.VITE_SELLER_COUNTRY),
  vatId: readPublicValue(import.meta.env.VITE_SELLER_VAT_ID),
};

export const isSellerConfigComplete = Boolean(
  sellerConfig.legalName &&
  sellerConfig.contactEmail &&
  sellerConfig.legalAddress &&
  sellerConfig.country,
);
