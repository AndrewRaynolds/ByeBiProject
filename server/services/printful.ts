const PRINTFUL_API_BASE = "https://api.printful.com";

interface PrintfulSyncProduct {
  id: number;
  external_id: string;
  name: string;
  variants: number;
  synced: number;
  thumbnail_url: string;
  is_ignored: boolean;
}

interface PrintfulSyncVariant {
  id: number;
  external_id: string;
  sync_product_id: number;
  name: string;
  synced: boolean;
  variant_id: number;
  retail_price: string;
  currency: string;
  is_ignored: boolean;
  sku: string;
  product: {
    variant_id: number;
    product_id: number;
    image: string;
    name: string;
  };
  files: Array<{
    id: number;
    type: string;
    hash: string;
    url: string | null;
    filename: string;
    mime_type: string;
    size: number;
    width: number;
    height: number;
    dpi: number | null;
    status: string;
    created: number;
    thumbnail_url: string;
    preview_url: string;
    visible: boolean;
    is_temporary: boolean;
  }>;
}

interface PrintfulSyncProductDetail {
  sync_product: PrintfulSyncProduct;
  sync_variants: PrintfulSyncVariant[];
}

export interface PrintfulProduct {
  id: number;
  name: string;
  thumbnailUrl: string;
  variantCount: number;
  variants: PrintfulProductVariant[];
}

export interface PrintfulProductVariant {
  id: number;
  name: string;
  retailPrice: string;
  currency: string;
  sku: string;
  imageUrl: string;
  previewUrl: string;
  productName: string;
}

interface PrintfulShippingRate {
  id: string;
  name: string;
  rate: string;
  currency: string;
  minDeliveryDays: number;
  maxDeliveryDays: number;
}

interface PrintfulOrderItem {
  sync_variant_id: number;
  quantity: number;
}

interface PrintfulRecipient {
  name: string;
  address1: string;
  city: string;
  state_code?: string;
  country_code: string;
  zip: string;
  email?: string;
  phone?: string;
}

async function printfulFetch(endpoint: string, options: RequestInit = {}) {
  const apiKey = process.env.PRINTFUL_API_KEY;
  if (!apiKey) {
    throw new Error("PRINTFUL_API_KEY is not configured");
  }

  const response = await fetch(`${PRINTFUL_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Printful API error [${response.status}]: ${errorText}`);
    throw new Error(`Printful API error: ${response.status} - ${errorText}`);
  }

  return response.json();
}

export async function getStoreProducts(): Promise<PrintfulProduct[]> {
  try {
    const data = await printfulFetch("/store/products");
    const products: PrintfulSyncProduct[] = data.result || [];

    const detailedProducts = await Promise.all(
      products.map(async (product) => {
        try {
          const detail = await getProductDetail(product.id);
          return detail;
        } catch (err) {
          console.error(`Failed to fetch details for product ${product.id}:`, err);
          return {
            id: product.id,
            name: product.name,
            thumbnailUrl: product.thumbnail_url,
            variantCount: product.variants,
            variants: [],
          };
        }
      })
    );

    return detailedProducts;
  } catch (error) {
    console.error("Error fetching Printful store products:", error);
    throw error;
  }
}

export async function getProductDetail(productId: number): Promise<PrintfulProduct> {
  const data = await printfulFetch(`/store/products/${productId}`);
  const detail: PrintfulSyncProductDetail = data.result;

  return {
    id: detail.sync_product.id,
    name: detail.sync_product.name,
    thumbnailUrl: detail.sync_product.thumbnail_url,
    variantCount: detail.sync_variants.length,
    variants: detail.sync_variants.map((v) => {
      const previewFile = v.files?.find((f) => f.type === "preview") || v.files?.[0];
      return {
        id: v.id,
        name: v.name,
        retailPrice: v.retail_price,
        currency: v.currency,
        sku: v.sku || "",
        imageUrl: v.product?.image || detail.sync_product.thumbnail_url,
        previewUrl: previewFile?.preview_url || previewFile?.thumbnail_url || detail.sync_product.thumbnail_url,
        productName: v.product?.name || v.name,
      };
    }),
  };
}

export async function getShippingRates(
  recipientCountry: string,
  items: PrintfulOrderItem[]
): Promise<PrintfulShippingRate[]> {
  const data = await printfulFetch("/shipping/rates", {
    method: "POST",
    body: JSON.stringify({
      recipient: {
        country_code: recipientCountry,
        city: "Anytown",
        address1: "123 Street",
        zip: "00000",
      },
      items: items.map((item) => ({
        sync_variant_id: item.sync_variant_id,
        quantity: item.quantity,
      })),
    }),
  });

  const rates = data.result || [];
  return rates.map((r: any) => ({
    id: r.id,
    name: r.name,
    rate: r.rate,
    currency: r.currency,
    minDeliveryDays: r.minDeliveryDays,
    maxDeliveryDays: r.maxDeliveryDays,
  }));
}

export async function createOrder(
  recipient: PrintfulRecipient,
  items: PrintfulOrderItem[],
  isDraft: boolean = true
) {
  const data = await printfulFetch("/orders", {
    method: "POST",
    body: JSON.stringify({
      recipient,
      items: items.map((item) => ({
        sync_variant_id: item.sync_variant_id,
        quantity: item.quantity,
      })),
      ...(isDraft ? {} : { confirm: true }),
    }),
  });

  return data.result;
}

export async function getOrder(orderId: number) {
  const data = await printfulFetch(`/orders/${orderId}`);
  return data.result;
}
