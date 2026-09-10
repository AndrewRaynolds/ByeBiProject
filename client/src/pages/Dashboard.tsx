import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Trip, type MerchandiseOrderItem } from "@shared/schema";
import type { AffiliateClickSummary } from "@shared/analyticsSchemas";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { AlertTriangle, BarChart3, Calendar, Map, GlassWater, ListChecks, MousePointerClick, RotateCcw, Shirt, Truck, User } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "@/contexts/LanguageContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type MerchandiseOrderSummary = {
  id: string;
  brand: "byebro" | "byebride";
  paymentStatus: string;
  fulfillmentStatus: string;
  amountTotal: number;
  currency: string;
  shippingCountry: string;
  shippingMethod: string;
  shippingAmount: number;
  items: MerchandiseOrderItem[];
  createdAt: string;
  updatedAt?: string;
  userId?: string | null;
  printfulOrderId?: string | null;
  printfulStatus?: string | null;
  failureCode?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippingCarrier?: string | null;
  shippedAt?: string | null;
};

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  // Fetch user trips
  const { data: trips, isLoading, error } = useQuery<Trip[]>({
    queryKey: [`/api/trips/user/${user?.id}`],
    enabled: !!user?.id,
  });

  const { data: merchandiseOrders, isLoading: isLoadingMerchandise } =
    useQuery<MerchandiseOrderSummary[]>({
      queryKey: ["/api/merchandise/orders"],
      enabled: !!user?.id,
    });

  const { data: affiliateSummary, isLoading: isLoadingAffiliateSummary } =
    useQuery<AffiliateClickSummary>({
      queryKey: ["/api/admin/affiliate-summary?days=30"],
      enabled: Boolean(user?.isAdmin),
    });

  const { data: adminMerchandiseOrders, isLoading: isLoadingAdminMerchandise } =
    useQuery<MerchandiseOrderSummary[]>({
      queryKey: ["/api/admin/merchandise/orders"],
      enabled: Boolean(user?.isAdmin),
    });

  const retryMerchandiseOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest(
        "POST",
        `/api/admin/merchandise/orders/${orderId}/retry`,
      );
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/merchandise/orders"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/merchandise/orders"] }),
      ]);
      toast({
        title: t('dashboard.retrySuccess'),
        description: t('dashboard.retrySuccessDesc'),
      });
    },
    onError: () => {
      toast({
        title: t('dashboard.retryError'),
        description: t('dashboard.retryErrorDesc'),
        variant: "destructive",
      });
    },
  });

  const refundMerchandiseOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await apiRequest(
        "POST",
        `/api/admin/merchandise/orders/${orderId}/refund`,
      );
      return response.json();
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["/api/admin/merchandise/orders"] }),
        queryClient.invalidateQueries({ queryKey: ["/api/merchandise/orders"] }),
      ]);
      toast({
        title: t('dashboard.refundSuccess'),
        description: t('dashboard.refundSuccessDesc'),
      });
    },
    onError: () => {
      toast({
        title: t('dashboard.refundError'),
        description: t('dashboard.refundErrorDesc'),
        variant: "destructive",
      });
    },
  });

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex flex-col bg-light">
      <Header />
      
      <main id="main-content" tabIndex={-1} className="flex-grow py-10">
        <div className="container mx-auto px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold font-poppins mb-2">
              {t('dashboard.welcome', { name: user?.firstName || user?.username || '' })}
            </h1>
            <p className="text-gray-600">{t('dashboard.subtitle')}</p>
          </div>
          
          <div className="flex items-center mb-8">
            <div className="bg-primary text-white p-2 rounded-full mr-4">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-lg">{t('dashboard.account')}</h2>
              <p className="text-sm text-gray-600">{t('dashboard.accountDesc')}</p>
            </div>
          </div>
          
          <Tabs defaultValue="trips" className="w-full">
            <TabsList className="mb-6 h-auto flex-wrap">
              <TabsTrigger value="trips"><ListChecks className="mr-2 h-4 w-4" /> {t('dashboard.myTrips')}</TabsTrigger>
              <TabsTrigger value="merchandise"><Shirt className="mr-2 h-4 w-4" /> {t('dashboard.myMerchandise')}</TabsTrigger>
              {user?.isAdmin && (
                <>
                  <TabsTrigger value="orderManagement">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    {t('dashboard.orderManagement')}
                  </TabsTrigger>
                  <TabsTrigger value="affiliateAnalytics">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    {t('dashboard.affiliateAnalytics')}
                  </TabsTrigger>
                </>
              )}
            </TabsList>
            
            <TabsContent value="trips">
              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[1, 2].map((i) => (
                    <Card key={i} className="shadow-md">
                      <CardHeader>
                        <Skeleton className="h-6 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-3/4" />
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Skeleton className="h-10 w-full" />
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : error ? (
                <div className="text-center p-10">
                  <p className="text-red-500">{t('dashboard.errorTrips')}</p>
                </div>
              ) : trips && trips.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {trips.map((trip) => (
                    <Card key={trip.id} className="shadow-md">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <CardTitle>{trip.name}</CardTitle>
                          <div className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            {trip.experienceType}
                          </div>
                        </div>
                        <CardDescription>
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Calendar className="mr-1 h-3 w-3" /> 
                            {trip.startDate} - {trip.endDate}
                          </div>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center text-sm">
                            <Map className="mr-2 h-4 w-4 text-primary" />
                            <span>{t('dashboard.destinations')}: {(trip.destinations ?? []).join(", ")}</span>
                          </div>
                          <div className="flex items-center text-sm">
                            <GlassWater className="mr-2 h-4 w-4 text-primary" />
                            <span>{t('dashboard.activities')}: {(trip.activities ?? []).slice(0, 2).join(", ")}
                              {(trip.activities ?? []).length > 2 ? ` and ${(trip.activities ?? []).length - 2} more` : ""}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="font-semibold">{t('dashboard.budget')}:</span> €{trip.budget} {t('dashboard.perPerson')}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button
                          className="w-full bg-primary hover:bg-accent"
                          onClick={() => {
                            const destination = trip.destinations?.[0] || "";
                            localStorage.setItem("currentItinerary", JSON.stringify({
                              destination,
                              origin: "Italia",
                              startDate: trip.startDate,
                              endDate: trip.endDate,
                              people: trip.participants,
                              aviasalesCheckoutUrl: "",
                              flightLabel: `Italia → ${destination}`,
                            }));
                            setLocation("/checkout");
                          }}
                        >
                          {t('dashboard.openCheckout')}
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center p-10 border-2 border-dashed border-gray-300 rounded-xl">
                  <h3 className="text-xl font-bold mb-2">{t('dashboard.noTrips')}</h3>
                  <p className="text-gray-600 mb-4">{t('dashboard.noTripsDesc')}</p>
                  <Button
                    className="bg-primary hover:bg-accent"
                    onClick={() => setLocation("/#trip-planning")}
                  >
                    Plan Your First Trip
                  </Button>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="merchandise">
              {isLoadingMerchandise ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Skeleton className="h-44 w-full" />
                  <Skeleton className="h-44 w-full" />
                </div>
              ) : merchandiseOrders?.length ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {merchandiseOrders.map((order) => (
                    <Card key={order.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <CardTitle>{t('dashboard.merchOrder')}</CardTitle>
                            <CardDescription>
                              {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm")} · {order.brand === "byebride" ? "ByeBride" : "ByeBro"}
                            </CardDescription>
                          </div>
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">
                            {t(`dashboard.orderStatus.${order.fulfillmentStatus}`)}
                          </span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {order.items.map((item) => (
                          <div key={`${order.id}-${item.variantId}`} className="flex justify-between text-sm">
                            <span>{item.productName} · {item.variantName} × {item.quantity}</span>
                            <span>{(item.unitAmount * item.quantity / 100).toFixed(2)} {order.currency}</span>
                          </div>
                        ))}
                        <div className="flex justify-between text-sm">
                          <span>{t('dashboard.shipping')} · {order.shippingCountry}</span>
                          <span>{(order.shippingAmount / 100).toFixed(2)} {order.currency}</span>
                        </div>
                        <div className="border-t pt-2 text-right font-bold">
                          {(order.amountTotal / 100).toFixed(2)} {order.currency}
                        </div>
                        {order.trackingUrl && (
                          <a
                            href={order.trackingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 flex items-center gap-2 rounded-md bg-blue-50 p-3 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                          >
                            <Truck className="h-4 w-4" />
                            {t('dashboard.trackShipment')}
                            {order.shippingCarrier ? ` · ${order.shippingCarrier}` : ""}
                            {order.trackingNumber ? ` · ${order.trackingNumber}` : ""}
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center p-10 border-2 border-dashed border-gray-300 rounded-xl">
                  <h3 className="text-xl font-bold mb-2">{t('dashboard.noMerch')}</h3>
                  <p className="text-gray-600 mb-4">{t('dashboard.noMerchDesc')}</p>
                  <Button
                    className="bg-primary hover:bg-accent"
                    onClick={() => setLocation("/merchandise")}
                  >
                    {t('dashboard.shopMerchandise')}
                  </Button>
                </div>
              )}
            </TabsContent>

            {user?.isAdmin && (
              <TabsContent value="orderManagement">
                {isLoadingAdminMerchandise ? (
                  <div className="space-y-4">
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-40 w-full" />
                  </div>
                ) : adminMerchandiseOrders?.length ? (
                  <div className="space-y-4">
                    {adminMerchandiseOrders.map((order) => (
                      <Card key={`admin-${order.id}`}>
                        <CardHeader>
                          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                            <div>
                              <CardTitle className="text-base">#{order.id.slice(0, 8)}</CardTitle>
                              <CardDescription>
                                {format(new Date(order.createdAt), "dd/MM/yyyy HH:mm")} · {order.userId || t('dashboard.guestOrder')}
                              </CardDescription>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold">
                                {t(`dashboard.orderStatus.${order.fulfillmentStatus}`)}
                              </span>
                              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                                {(order.amountTotal / 100).toFixed(2)} {order.currency}
                              </span>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <p className="text-sm text-gray-600">
                            {order.items.reduce((total, item) => total + item.quantity, 0)} {t('dashboard.items')} · {order.brand === "byebride" ? "ByeBride" : "ByeBro"}
                          </p>
                          {order.failureCode && (
                            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                              {t(`dashboard.failureCode.${order.failureCode}`)}
                            </div>
                          )}
                          {order.printfulOrderId && (
                            <p className="text-xs text-gray-500">
                              Printful #{order.printfulOrderId} · {order.printfulStatus || "—"}
                            </p>
                          )}
                          {order.fulfillmentStatus === "fulfillment_failed" && (
                            <Button
                              onClick={() => retryMerchandiseOrder.mutate(order.id)}
                              disabled={retryMerchandiseOrder.isPending}
                            >
                              <RotateCcw className="mr-2 h-4 w-4" />
                              {t('dashboard.retryPrintful')}
                            </Button>
                          )}
                          {order.paymentStatus === "paid" &&
                            order.fulfillmentStatus === "submitted" &&
                            order.printfulStatus &&
                            ["draft", "failed", "pending"].includes(order.printfulStatus) && (
                            <Button
                              variant="destructive"
                              onClick={() => {
                                if (window.confirm(t('dashboard.refundConfirm'))) {
                                  refundMerchandiseOrder.mutate(order.id);
                                }
                              }}
                              disabled={refundMerchandiseOrder.isPending}
                            >
                              {t('dashboard.cancelAndRefund')}
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-dashed border-gray-300 p-10 text-center">
                    <p className="text-gray-600">{t('dashboard.noOrdersToManage')}</p>
                  </div>
                )}
              </TabsContent>
            )}

            {user?.isAdmin && (
              <TabsContent value="affiliateAnalytics">
                {isLoadingAffiliateSummary ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                ) : affiliateSummary ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <MousePointerClick className="h-5 w-5" />
                            {t('dashboard.affiliateClicks')}
                          </CardTitle>
                          <CardDescription>{t('dashboard.last30Days')}</CardDescription>
                        </CardHeader>
                        <CardContent className="text-3xl font-bold">
                          {affiliateSummary.totalClicks}
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader>
                          <CardTitle>{t('dashboard.monetizedClicks')}</CardTitle>
                          <CardDescription>{t('dashboard.last30Days')}</CardDescription>
                        </CardHeader>
                        <CardContent className="text-3xl font-bold text-green-700">
                          {affiliateSummary.monetizedClicks}
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>{t('dashboard.clicksByProvider')}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {affiliateSummary.providers.length > 0 ? (
                          affiliateSummary.providers.map((provider) => (
                            <div key={provider.key} className="flex items-center justify-between border-b pb-3 last:border-0">
                              <span className="font-medium capitalize">{provider.key}</span>
                              <span className="text-sm text-gray-600">
                                {provider.total} {t('dashboard.clicks')} · {provider.monetized} {t('dashboard.monetized')}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-600">{t('dashboard.noAffiliateClicks')}</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <p className="text-red-600">{t('dashboard.affiliateAnalyticsError')}</p>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
