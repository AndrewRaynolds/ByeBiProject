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
import { ShoppingBag, Heart, ShoppingCart, Package, Minus, Plus, X, CreditCard, CheckCircle, Loader2 } from "lucide-react";
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

export default function MerchandisePage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<PrintfulProduct | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [showCart, setShowCart] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    if (params.get("payment") === "success" && sessionId) {
      fetch(`/api/stripe/session/${sessionId}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === "paid") {
            setPaymentSuccess(true);
            setCart([]);
          } else {
            toast({
              title: "Pagamento in attesa",
              description: "Il pagamento non è ancora stato confermato.",
            });
          }
        })
        .catch(() => {
          toast({
            title: "Errore verifica",
            description: "Impossibile verificare il pagamento. Contattaci se hai completato il pagamento.",
            variant: "destructive",
          });
        });
      window.history.replaceState({}, "", "/merchandise");
    } else if (params.get("payment") === "cancelled") {
      toast({
        title: "Pagamento annullato",
        description: "Il pagamento è stato annullato. I tuoi articoli sono ancora nel carrello.",
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/merchandise");
    }
  }, []);

  const { data: products, isLoading, error } = useQuery<PrintfulProduct[]>({
    queryKey: ["/api/printful/products"],
    staleTime: 60000,
    refetchOnMount: true,
  });

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
      description: `${variant.name} aggiunto al carrello`,
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

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      <Header />

      <main className="flex-grow">
        <div className="bg-gradient-to-r from-red-700 via-red-600 to-red-800 text-white py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-5xl font-bold font-poppins mb-4">
              {t('merch.title')}
            </h1>
            <p className="max-w-2xl mx-auto text-red-100 text-lg">
              {t('merch.subtitle')}
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-10">
          <div className="flex justify-end mb-6">
            <Button
              variant="outline"
              className="relative border-red-500/50 text-white hover:bg-red-600/20"
              onClick={() => setShowCart(true)}
            >
              <ShoppingCart className="h-5 w-5 mr-2" />
              <span>Carrello</span>
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Button>
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
              <p className="text-red-400 text-lg mb-2">{t('merch.errorLoading')}</p>
              <p className="text-gray-500 text-sm">Controlla la configurazione dell'API Printful</p>
            </div>
          ) : products && products.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {products.map(product => (
                <Card
                  key={product.id}
                  className="overflow-hidden group bg-gray-800/60 border-gray-700 hover:border-red-500/50 transition-all duration-300 cursor-pointer"
                  onClick={() => {
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
                    <Badge className="absolute top-3 left-3 bg-red-600 text-white">
                      {product.variantCount} varianti
                    </Badge>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-bold text-lg mb-2 text-white">{product.name}</h3>
                    <p className="text-red-400 font-bold text-lg">
                      {getFirstVariantPrice(product)}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-0 pb-4 px-4">
                    <Button
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProduct(product);
                        setSelectedVariantId(product.variants[0]?.id.toString() || "");
                      }}
                    >
                      <ShoppingBag className="mr-2 h-4 w-4" />
                      Vedi Dettagli
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Package className="h-16 w-16 mx-auto text-gray-500 mb-4" />
              <p className="text-gray-400 text-lg">Nessun prodotto trovato nel tuo store Printful.</p>
              <p className="text-gray-500 text-sm mt-2">Aggiungi prodotti al tuo store Printful per vederli qui.</p>
            </div>
          )}
        </div>
      </main>

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
                  <p className="text-red-400 font-bold text-2xl mb-4">
                    {selectedVariantId
                      ? `€${selectedProduct.variants.find(v => v.id.toString() === selectedVariantId)?.retailPrice || "0.00"}`
                      : getFirstVariantPrice(selectedProduct)}
                  </p>

                  {selectedProduct.variants.length > 0 && (
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Seleziona variante (taglia/colore)
                      </label>
                      <Select value={selectedVariantId} onValueChange={setSelectedVariantId}>
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                          <SelectValue placeholder="Seleziona..." />
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
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 text-lg"
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
              Carrello ({cartItemCount} articoli)
            </DialogTitle>
          </DialogHeader>
          {cart.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingCart className="h-12 w-12 mx-auto text-gray-500 mb-3" />
              <p className="text-gray-400">Il carrello è vuoto</p>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {cart.map(item => (
                <div key={item.variantId} className="flex items-center gap-4 bg-gray-800 rounded-lg p-3">
                  <img
                    src={item.imageUrl}
                    alt={item.variantName}
                    className="w-16 h-16 object-contain rounded bg-gray-700"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-white truncate">{item.productName}</p>
                    <p className="text-xs text-gray-400 truncate">{item.variantName}</p>
                    <p className="text-red-400 font-bold">€{item.price}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-gray-400 hover:text-white"
                      onClick={() => updateCartQuantity(item.variantId, -1)}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-6 text-center text-sm">{item.quantity}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-gray-400 hover:text-white"
                      onClick={() => updateCartQuantity(item.variantId, 1)}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-gray-400 hover:text-red-400"
                    onClick={() => removeFromCart(item.variantId)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="border-t border-gray-700 pt-4 flex justify-between items-center">
                <span className="text-lg font-bold">Totale:</span>
                <span className="text-2xl font-bold text-red-400">€{cartTotal.toFixed(2)}</span>
              </div>
              <Button
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 text-lg mt-2"
                disabled={isCheckingOut}
                onClick={async () => {
                  setIsCheckingOut(true);
                  try {
                    const response = await apiRequest("POST", "/api/stripe/checkout", {
                      items: cart,
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
                      title: "Errore checkout",
                      description: "Si è verificato un errore. Riprova.",
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
                {isCheckingOut ? "Reindirizzamento..." : "Procedi al Pagamento"}
              </Button>
              <p className="text-xs text-gray-500 text-center">
                Pagamento sicuro tramite Stripe. Le spese di spedizione verranno calcolate al checkout.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={paymentSuccess} onOpenChange={setPaymentSuccess}>
        <DialogContent className="max-w-md bg-gray-900 border-gray-700 text-white text-center">
          <div className="py-6">
            <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Pagamento completato!</h2>
            <p className="text-gray-400 mb-4">
              Il tuo ordine è stato ricevuto. I prodotti saranno stampati e spediti al tuo indirizzo.
            </p>
            <p className="text-gray-500 text-sm">
              Riceverai una email di conferma con i dettagli della spedizione.
            </p>
            <Button
              className="mt-6 bg-red-600 hover:bg-red-700"
              onClick={() => setPaymentSuccess(false)}
            >
              Continua a fare shopping
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
