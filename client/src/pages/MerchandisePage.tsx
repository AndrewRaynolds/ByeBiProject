import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "wouter";
import { ShoppingBag, Heart, ShoppingCart, Package, Minus, Plus, X, CreditCard, CheckCircle, Loader2, ShieldCheck, Sparkles, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/LanguageContext";
import { apiRequest } from "@/lib/queryClient";

interface PrintfulVariant {
  id: number;
  name: string;
  retailPrice: string;
  currency: string;
  sku: string;
  imageUrl: string;
  previewUrl: string;
  productName: string;
}

interface PrintfulProduct {
  id: number;
  name: string;
  thumbnailUrl: string;
  variantCount: number;
  variants: PrintfulVariant[];
}

interface CartItem {
  variantId: number;
  variantName: string;
  productName: string;
  productId: number;
  quantity: number;
  price: string;
  currency: string;
  imageUrl: string;
}

export function toCheckoutItems(items: CartItem[]) {
  return items.map(({ productId, variantId, quantity }) => ({
    productId,
    variantId,
    quantity,
  }));
}

type MerchandiseBrand = "byebro" | "byebride";
const SHIPPING_COUNTRIES = ["IT", "DE", "FR", "ES", "NL", "BE", "AT", "PT", "GR", "PL", "CZ", "HU", "HR", "RO", "BG", "SE", "DK", "FI", "IE", "GB"] as const;

export const BRAND_PRODUCT_IDS: Record<MerchandiseBrand, readonly number[]> = {
  byebride: [450568421, 450564312, 450562726],
  byebro: [420156309, 420156126],
};

export function filterProductsForBrand<T extends { id: number }>(
  products: T[] | undefined,
  brand: MerchandiseBrand,
): T[] | undefined {
  const allowedIds = new Set(BRAND_PRODUCT_IDS[brand]);
  return products?.filter((product) => allowedIds.has(product.id));
}

export default function MerchandisePage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<PrintfulProduct | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [showCart, setShowCart] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [fulfillmentStatus, setFulfillmentStatus] = useState<string | null>(null);
  const [shippingCountry, setShippingCountry] = useState<(typeof SHIPPING_COUNTRIES)[number]>("IT");
  const [currentBrand, setCurrentBrand] =
    useState<MerchandiseBrand>("byebro");
  const { toast } = useToast();
  const { t, locale } = useTranslation();
  const countryNames = new Intl.DisplayNames([locale], { type: "region" });

  useEffect(() => {
    const readBrand = (): MerchandiseBrand =>
      localStorage.getItem("selectedBrand") === "byebride"
        ? "byebride"
        : "byebro";
    const onStorage = (event: StorageEvent) => {
      if (event.key === "selectedBrand") setCurrentBrand(readBrand());
    };

    setCurrentBrand(readBrand());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const orderId = params.get("order_id");
    if (params.get("payment") === "success" && sessionId && orderId) {
      const controller = new AbortController();
      const verifyOrder = async () => {
        for (let attempt = 0; attempt < 6; attempt += 1) {
          const response = await apiRequest(
            "GET",
            `/api/merchandise/orders/${orderId}/status?session_id=${encodeURIComponent(sessionId)}`,
            undefined,
            { signal: controller.signal },
          );
          const data = await response.json();
          if (data.paymentStatus === "paid") {
            setFulfillmentStatus(data.fulfillmentStatus);
            setPaymentSuccess(true);
            setCart([]);
            setAcceptTerms(false);
            return;
          }
          await new Promise((resolve) => window.setTimeout(resolve, 1_000));
        }
        toast({
          title: t('merch.paymentPending'),
          description: t('merch.paymentPendingDesc'),
        });
      };
      verifyOrder()
        .catch(error => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          toast({
            title: t('merch.verificationError'),
            description: t('merch.verificationErrorDesc'),
            variant: "destructive",
          });
        });
      window.history.replaceState({}, "", "/merchandise");
      return () => controller.abort();
    } else if (params.get("payment") === "cancelled") {
      toast({
        title: t('merch.paymentCancelled'),
        description: t('merch.paymentCancelledDesc'),
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/merchandise");
    }
  }, []);

  const { data: allProducts, isLoading, error } = useQuery<PrintfulProduct[]>({
    queryKey: ["/api/printful/products"],
    staleTime: 60000,
    refetchOnMount: true,
  });
  const products = filterProductsForBrand(allProducts, currentBrand);

  const handleAddToCart = (product: PrintfulProduct, variant: PrintfulVariant) => {
    setCart(prev => {
      const existing = prev.find(item => item.variantId === variant.id);
      if (existing) {
        return prev.map(item =>
          item.variantId === variant.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        variantId: variant.id,
        variantName: variant.name,
        productName: product.name,
        productId: product.id,
        quantity: 1,
        price: variant.retailPrice,
        currency: variant.currency,
        imageUrl: variant.previewUrl || variant.imageUrl,
      }];
    });

    toast({
      title: t('merch.addedToCartTitle'),
      description: t('merch.itemAdded', { item: variant.name }),
    });
  };

  const updateCartQuantity = (variantId: number, delta: number) => {
    setCart(prev =>
      prev
        .map(item =>
          item.variantId === variantId
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (variantId: number) => {
    setCart(prev => prev.filter(item => item.variantId !== variantId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const getFirstVariantPrice = (product: PrintfulProduct) => {
    if (product.variants.length === 0) return null;
    const prices = product.variants.map(v => parseFloat(v.retailPrice));
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return `€${min.toFixed(2)}`;
    return `€${min.toFixed(2)} - €${max.toFixed(2)}`;
  };

  const isBride = currentBrand === "byebride";
  const brandStyles = isBride
    ? {
        accentText: "text-pink-400",
        glow: "bg-pink-500/25",
        softBadge: "border-pink-400/30 bg-pink-500/10 text-pink-200",
        cartButton:
          "relative bg-gradient-to-r from-pink-600 to-pink-700 hover:from-pink-700 hover:to-pink-800 text-white",
        badge: "bg-pink-600",
        cardHover: "hover:border-pink-500/50",
        price: "text-pink-400",
        button: "bg-pink-600 hover:bg-pink-700",
      }
    : {
        accentText: "text-red-400",
        glow: "bg-red-500/25",
        softBadge: "border-red-400/30 bg-red-500/10 text-red-200",
        cartButton:
          "relative bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white",
        badge: "bg-red-600",
        cardHover: "hover:border-red-500/50",
        price: "text-red-400",
        button: "bg-red-600 hover:bg-red-700",
      };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <Header />

      <main id="main-content" tabIndex={-1} className="flex-grow">
        <section className="relative overflow-hidden border-b border-white/10 bg-black text-white">
          <div className={`pointer-events-none absolute -left-24 -top-28 h-80 w-80 rounded-full ${brandStyles.glow} blur-3xl`} />
          <div className={`pointer-events-none absolute -bottom-40 right-0 h-96 w-96 rounded-full ${brandStyles.glow} blur-3xl`} />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[length:28px_28px] opacity-40" />

          <div className="container relative mx-auto grid gap-10 px-4 py-16 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:py-20">
            <div className="max-w-3xl">
              <div className={`mb-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${brandStyles.softBadge}`}>
                <Sparkles className="h-4 w-4" />
                {t('merch.collectionEyebrow')}
              </div>
              <h1 className="mb-5 text-5xl font-bold tracking-tight md:text-7xl">
                {isBride ? "ByeBride" : "ByeBro"}{" "}
                <span className={brandStyles.accentText}>Shop</span>
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-white/75 md:text-xl">
                {t('merch.subtitle')}
              </p>
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/80">
                <span className="inline-flex items-center gap-2"><ShieldCheck className={`h-4 w-4 ${brandStyles.accentText}`} />{t('merch.secureCheckoutBenefit')}</span>
                <span className="inline-flex items-center gap-2"><Package className={`h-4 w-4 ${brandStyles.accentText}`} />{t('merch.madeToOrderBenefit')}</span>
                <span className="inline-flex items-center gap-2"><Truck className={`h-4 w-4 ${brandStyles.accentText}`} />{t('merch.europeShippingBenefit')}</span>
              </div>
            </div>

            <Button
              size="lg"
              className={`${brandStyles.cartButton} min-w-44 shadow-2xl`}
              onClick={() => setShowCart(true)}
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              <span>{t('merch.cart')}</span>
              {cartItemCount > 0 && (
                <span className={`absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full ${brandStyles.badge} text-xs text-white ring-2 ring-black`}>
                  {cartItemCount}
                </span>
              )}
            </Button>
          </div>
        </section>

        <div className="container mx-auto px-4 py-10">
          <div className="mb-8 flex flex-col gap-3 border-b border-white/10 pb-7 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className={`mb-2 text-sm font-semibold uppercase tracking-[0.2em] ${brandStyles.accentText}`}>
                {isBride ? "ByeBride" : "ByeBro"}
              </p>
              <h2 className="text-3xl font-bold text-white md:text-4xl">
                {t('merch.collectionTitle')}
              </h2>
              <p className="mt-2 max-w-2xl text-white/65">
                {t('merch.collectionSubtitle')}
              </p>
            </div>
            <p className="text-sm text-white/55">
              {t('merch.selectProductHint')}
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <Card key={i} className="overflow-hidden bg-gray-800/60 border-gray-700">
                  <Skeleton className="h-72 w-full bg-gray-700" />
                  <CardContent className="p-4">
                    <Skeleton className="h-6 w-3/4 mb-2 bg-gray-700" />
                    <Skeleton className="h-4 w-full mb-4 bg-gray-700" />
                    <Skeleton className="h-5 w-20 bg-gray-700" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <Package className="h-16 w-16 mx-auto text-gray-500 mb-4" />
              <p className={`${brandStyles.price} text-lg mb-2`}>{t('merch.errorLoading')}</p>
              <p className="text-gray-500 text-sm">{t('merch.checkPrintful')}</p>
            </div>
          ) : products && products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map(product => (
                <Card
                  key={product.id}
                  role="button"
                  tabIndex={0}
                  aria-label={t('merch.openProduct', { product: product.name })}
                  className={`overflow-hidden group bg-gray-800/60 border-gray-700 ${brandStyles.cardHover} transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-4 focus-visible:ring-offset-gray-950`}
                  onClick={() => {
                    setSelectedProduct(product);
                    setSelectedVariantId(product.variants[0]?.id.toString() || "");
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    setSelectedProduct(product);
                    setSelectedVariantId(product.variants[0]?.id.toString() || "");
                  }}
                >
                  <div className="relative h-72 overflow-hidden bg-gray-900">
                    <img
                      src={product.thumbnailUrl}
                      alt={product.name}
                      className="w-full h-full object-contain transition duration-500 group-hover:scale-105 p-2"
                    />
                    <Badge className={`absolute top-3 left-3 ${brandStyles.badge} text-white`}>
                      {t('merch.variants', { count: product.variantCount })}
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-2 text-white">{product.name}</h3>
                    <p className={`${brandStyles.price} font-bold text-lg`}>
                      {getFirstVariantPrice(product)}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-0 pb-4 px-4">
                    <Button
                      className={`w-full ${brandStyles.button} text-white`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProduct(product);
                        setSelectedVariantId(product.variants[0]?.id.toString() || "");
                      }}
                    >
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      {t('merch.viewDetails')}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Package className="h-16 w-16 mx-auto text-gray-500 mb-4" />
              <p className="text-gray-400 text-lg">{t('merch.noProducts')}</p>
              <p className="text-gray-500 text-sm mt-2">{t('merch.noProductsDesc')}</p>
            </div>
          )}
        </div>
      </main>

      {cartItemCount > 0 && (
        <Button
          size="lg"
          aria-label={t('merch.openCartCount', { count: cartItemCount })}
          className={`fixed bottom-5 right-5 z-40 ${brandStyles.cartButton} rounded-full px-5 shadow-2xl ring-1 ring-white/20 md:bottom-8 md:right-8`}
          onClick={() => setShowCart(true)}
        >
          <ShoppingCart className="mr-2 h-5 w-5" />
          {t('merch.cart')}
          <span className="ml-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-xs font-bold text-gray-950">
            {cartItemCount}
          </span>
        </Button>
      )}

      {selectedProduct && (
        <Dialog open={!!selectedProduct} onOpenChange={() => setSelectedProduct(null)}>
          <DialogContent className="max-w-2xl bg-gray-900 border-gray-700 text-white">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">{selectedProduct.name}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
              <div className="bg-gray-800 rounded-lg overflow-hidden">
                <img
                  src={
                    selectedVariantId
                      ? selectedProduct.variants.find(v => v.id.toString() === selectedVariantId)?.previewUrl ||
                        selectedProduct.variants.find(v => v.id.toString() === selectedVariantId)?.imageUrl ||
                        selectedProduct.thumbnailUrl
                      : selectedProduct.thumbnailUrl
                  }
                  alt={selectedProduct.name}
                  className="w-full h-80 object-contain p-4"
                />
              </div>
              <div className="flex flex-col justify-between">
                <div>
                  <p className={`${brandStyles.price} font-bold text-2xl mb-4`}>
                    {selectedVariantId
                      ? `€${selectedProduct.variants.find(v => v.id.toString() === selectedVariantId)?.retailPrice || "0.00"}`
                      : getFirstVariantPrice(selectedProduct)}
                  </p>

                  {selectedProduct.variants.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-white/80 mb-2">
                        {t('merch.selectVariant')}
                      </label>
                      <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                          <SelectValue placeholder={t('common.select')} />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          {selectedProduct.variants.map(variant => (
                            <SelectItem
                              key={variant.id}
                              value={variant.id.toString()}
                              className="text-white hover:bg-gray-700"
                            >
                              {variant.name} - €{variant.retailPrice}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <Button
                  className={`w-full ${brandStyles.button} text-white py-3 text-lg`}
                  disabled={!selectedVariantId}
                  onClick={() => {
                    const variant = selectedProduct.variants.find(
                      v => v.id.toString() === selectedVariantId
                    );
                    if (variant) {
                      handleAddToCart(selectedProduct, variant);
                      setSelectedProduct(null);
                    }
                  }}
                >
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  {t('merch.addToCart')}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showCart} onOpenChange={setShowCart}>
        <DialogContent className="max-w-lg bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              {t('merch.cartItems', { count: cartItemCount })}
            </DialogTitle>
          </DialogHeader>
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 mx-auto text-gray-500 mb-3" />
              <p className="text-gray-400">{t('merch.emptyCart')}</p>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {cart.map(item => (
                <div key={item.variantId} className="flex items-center gap-4 rounded-lg border border-white/10 bg-white/5 p-3">
                  <img
                    src={item.imageUrl}
                    alt={item.variantName}
                    className="w-16 h-16 object-contain rounded bg-gray-700"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-white truncate">{item.productName}</p>
                    <p className="text-xs text-white/65 truncate">{item.variantName}</p>
                    <p className={`${brandStyles.price} font-bold`}>€{item.price}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t('merch.decreaseQuantity', { item: item.productName })}
                      className="h-7 w-7 text-white/65 hover:text-white"
                      onClick={() => updateCartQuantity(item.variantId, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label={t('merch.increaseQuantity', { item: item.productName })}
                      className="h-7 w-7 text-white/65 hover:text-white"
                      onClick={() => updateCartQuantity(item.variantId, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={t('merch.removeItem', { item: item.productName })}
                    className="h-7 w-7 text-white/65 hover:text-red-400"
                    onClick={() => removeFromCart(item.variantId)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="border-t border-gray-700 pt-4 flex justify-between items-center">
                <span className="text-lg font-bold">{t('merch.subtotal')}:</span>
                <span className={`text-2xl font-bold ${brandStyles.price}`}>€{cartTotal.toFixed(2)}</span>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="shipping-country">
                  {t('merch.shippingCountry')}
                </label>
                <Select
                  value={shippingCountry}
                  onValueChange={(value) => setShippingCountry(value as typeof shippingCountry)}
                >
                  <SelectTrigger id="shipping-country" className="border-gray-700 bg-gray-800">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SHIPPING_COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>
                        {countryNames.of(country) || country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-white/65">{t('merch.shippingCalculated')}</p>
              </div>
              <div className="flex items-start gap-3 rounded-md border border-gray-700 bg-gray-800/60 p-3">
                <Checkbox
                  id="accept-merchandise-terms"
                  checked={acceptTerms}
                  onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                  className="mt-0.5"
                />
                <label htmlFor="accept-merchandise-terms" className="text-sm leading-relaxed text-white/80">
                  {t('merch.acceptTermsPrefix')}{" "}
                  <Link href="/terms" className="underline hover:text-white">{t('footer.termsOfService')}</Link>
                  {" "}{t('merch.acceptTermsAnd')}{" "}
                  <Link href="/refund-policy" className="underline hover:text-white">{t('footer.refundPolicy')}</Link>.
                </label>
              </div>
              <Button
                className={`w-full ${brandStyles.button} text-white py-3 text-lg mt-2`}
                disabled={isCheckingOut || !acceptTerms}
                onClick={async () => {
                  setIsCheckingOut(true);
                  try {
                    const response = await apiRequest("POST", "/api/stripe/checkout", {
                      brand: currentBrand,
                      shippingCountry,
                      acceptTerms: true,
                      items: toCheckoutItems(cart),
                    });
                    const data = await response.json();
                    if (data.url) {
                      window.location.href = data.url;
                    } else {
                      throw new Error("No checkout URL returned");
                    }
                  } catch (error: any) {
                    console.error("Checkout error:", error);
                    toast({
                      title: t('merch.checkoutError'),
                      description: t('merch.checkoutErrorDesc'),
                      variant: "destructive",
                    });
                    setIsCheckingOut(false);
                  }
                }}
              >
                {isCheckingOut ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-5 w-5" />
                )}
                {isCheckingOut ? t('merch.redirecting') : t('merch.checkout')}
              </Button>
              <p className="text-xs text-white/55 text-center">
                {t('merch.securePayment')}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={paymentSuccess} onOpenChange={setPaymentSuccess}>
        <DialogContent className="max-w-md bg-gray-900 border-gray-700 text-white text-center">
          <div className="py-6">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">{t('merch.paymentComplete')}</h2>
            <p className="text-gray-400 mb-4">
              {fulfillmentStatus === "submitted"
                ? t('merch.orderReceived')
                : t('merch.orderUnderReview')}
            </p>
            <p className="text-gray-500 text-sm">
              {t('merch.confirmationEmail')}
            </p>
            <Button
              className={`mt-6 ${brandStyles.button}`}
              onClick={() => setPaymentSuccess(false)}
            >
              {t('merch.continueShopping')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
