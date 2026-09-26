import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import type { ExpenseGroup, Trip } from "@shared/schema";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/contexts/LanguageContext";
import { createSavedTripContext } from "@/lib/tripContext";
import { trackProductEvent } from "@/lib/track";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  type BookingKind,
  loadTripBookingStatus,
  saveTripBookingStatus,
} from "@/lib/tripBookingStatus";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Circle,
  Hotel,
  ListChecks,
  Copy,
  Link2Off,
  MapPin,
  Plane,
  ReceiptText,
  Users,
  Share2,
} from "lucide-react";

type TripInviteStatus = { active: boolean };

const bookingSections: Array<{ kind: BookingKind; icon: typeof Plane }> = [
  { kind: "flight", icon: Plane },
  { kind: "hotel", icon: Hotel },
  { kind: "activities", icon: ListChecks },
];

export default function TripHub() {
  const { id } = useParams<{ id: string }>();
  const tripId = Number(id);
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const [inviteUrl, setInviteUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [bookingStatus, setBookingStatus] = useState(() =>
    Number.isInteger(tripId) && tripId > 0 ? loadTripBookingStatus(tripId) : null,
  );

  const { data: trip, isLoading, error } = useQuery<Trip>({
    queryKey: [`/api/trips/${id}`],
    enabled: Number.isInteger(tripId) && tripId > 0,
  });
  const {
    data: expenseGroups,
    isLoading: isLoadingExpenseGroups,
    error: expenseGroupsError,
  } = useQuery<ExpenseGroup[]>({
    queryKey: [`/api/trips/${id}/expense-groups`],
    enabled: Boolean(trip),
  });
  const inviteQueryKey = `/api/trips/${id}/invite`;
  const { data: inviteStatus } = useQuery<TripInviteStatus>({
    queryKey: [inviteQueryKey],
    enabled: Boolean(trip),
  });
  const generateInvite = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", inviteQueryKey);
      return response.json() as Promise<{ token: string }>;
    },
    onSuccess: ({ token }) => {
      setInviteUrl(`${window.location.origin}/trips/shared/${token}`);
      setCopied(false);
      setCopyError(false);
      queryClient.setQueryData([inviteQueryKey], { active: true });
    },
  });
  const revokeInvite = useMutation({
    mutationFn: () => apiRequest("DELETE", inviteQueryKey),
    onSuccess: () => {
      setInviteUrl("");
      setCopied(false);
      setCopyError(false);
      queryClient.setQueryData([inviteQueryKey], { active: false });
    },
  });

  useEffect(() => {
    if (trip) trackProductEvent("trip_hub_viewed");
  }, [trip]);

  const openCheckout = () => {
    if (!trip) return;
    const context = createSavedTripContext(trip);
    if (!context) return;
    localStorage.setItem("currentItinerary", JSON.stringify(context));
    navigate("/checkout");
  };

  const toggleBookingStatus = (kind: BookingKind) => {
    if (!bookingStatus) return;
    const next = {
      ...bookingStatus,
      [kind]: bookingStatus[kind] === "done" ? "pending" : "done",
    };
    setBookingStatus(next);
    saveTripBookingStatus(tripId, next);
  };

  const openExpenses = () => {
    if (!trip) return;
    const existingGroup = expenseGroups?.[0];
    const brand = localStorage.getItem("selectedBrand");
    const path = brand === "byebride" ? "/splitta-bride" : "/splitta-bro";
    const params = existingGroup
      ? new URLSearchParams({ groupId: String(existingGroup.id) })
      : new URLSearchParams({ tripId: String(trip.id), tripName: trip.name });
    navigate(`${path}?${params}`);
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopied(false);
      setCopyError(true);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-light">
        <Header />
        <main className="container mx-auto max-w-5xl flex-1 px-4 py-10">
          <Skeleton className="mb-5 h-6 w-32" />
          <Skeleton className="mb-8 h-36 w-full rounded-xl" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((item) => <Skeleton key={item} className="h-52 rounded-xl" />)}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !trip || !bookingStatus) {
    return (
      <div className="min-h-screen flex flex-col bg-light">
        <Header />
        <main className="container mx-auto max-w-xl flex-1 px-4 py-20 text-center">
          <h1 className="mb-3 text-2xl font-bold">{t("tripHub.notFoundTitle")}</h1>
          <p className="mb-7 text-gray-600">{t("tripHub.notFoundDesc")}</p>
          <Button onClick={() => navigate("/dashboard")}>{t("tripHub.backToDashboard")}</Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-light">
      <Header />
      <main id="main-content" tabIndex={-1} className="container mx-auto max-w-5xl flex-1 px-4 py-10">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="mb-6 inline-flex items-center text-sm font-semibold text-gray-600 hover:text-primary"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t("tripHub.backToDashboard")}
        </button>

        <Card className="mb-8 overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-primary text-white">
            <p className="text-sm font-semibold uppercase tracking-wide text-white/80">{t("tripHub.eyebrow")}</p>
            <CardTitle className="text-3xl">{trip.name}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 pt-6 text-sm sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex gap-2"><MapPin className="h-5 w-5 text-primary" /><span><strong>{t("tripHub.destination")}:</strong> {(trip.destinations ?? []).join(", ") || "—"}</span></div>
            <div className="flex gap-2"><Plane className="h-5 w-5 text-primary" /><span><strong>{t("tripHub.departure")}:</strong> {trip.departureCity}</span></div>
            <div className="flex gap-2"><CalendarDays className="h-5 w-5 text-primary" /><span><strong>{t("tripHub.dates")}:</strong> {trip.startDate} – {trip.endDate}</span></div>
            <div className="flex gap-2"><Users className="h-5 w-5 text-primary" /><span><strong>{t("tripHub.participants")}:</strong> {trip.participants}</span></div>
            <div className="flex gap-2"><ListChecks className="h-5 w-5 text-primary" /><span><strong>{t("tripHub.experience")}:</strong> {t(`dashboard.experienceType.${trip.experienceType}`)}</span></div>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-1"><ListChecks className="h-5 w-5 text-primary" /><span><strong>{t("tripHub.savedActivities")}:</strong> {(trip.activities ?? []).join(", ") || t("tripHub.noActivities")}</span></div>
          </CardContent>
        </Card>

        <Card className="mb-8 shadow-sm">
          <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex gap-3">
              <Share2 className="h-7 w-7 shrink-0 text-primary" />
              <div>
                <h2 className="font-bold">{t("tripHub.shareTitle")}</h2>
                <p className="text-sm text-gray-600">
                  {inviteStatus?.active ? t("tripHub.shareActive") : t("tripHub.shareDesc")}
                </p>
                {inviteUrl && (
                  <p className="mt-2 break-all rounded bg-gray-50 p-2 text-xs" aria-label={t("tripHub.shareLinkLabel")}>
                    {inviteUrl}
                  </p>
                )}
                {(generateInvite.isError || revokeInvite.isError || copyError) && (
                  <p className="mt-2 text-sm text-red-700">{t("tripHub.shareError")}</p>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              {inviteUrl && (
                <Button variant="outline" onClick={copyInvite}>
                  <Copy className="mr-2 h-4 w-4" />
                  {copied ? t("tripHub.copied") : t("tripHub.copyLink")}
                </Button>
              )}
              <Button
                onClick={() => generateInvite.mutate()}
                disabled={generateInvite.isPending || revokeInvite.isPending}
              >
                <Share2 className="mr-2 h-4 w-4" />
                {inviteStatus?.active ? t("tripHub.rotateLink") : t("tripHub.generateLink")}
              </Button>
              {inviteStatus?.active && (
                <Button
                  variant="destructive"
                  onClick={() => revokeInvite.mutate()}
                  disabled={generateInvite.isPending || revokeInvite.isPending}
                >
                  <Link2Off className="mr-2 h-4 w-4" />
                  {t("tripHub.revokeLink")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <section aria-labelledby="trip-organization-title" className="mb-8 space-y-4">
          <div>
            <h2 id="trip-organization-title" className="text-2xl font-bold">{t("tripHub.organizationTitle")}</h2>
            <p className="mt-1 text-sm text-gray-600">{t("tripHub.organizationDesc")}</p>
            <p className="mt-2 text-xs text-gray-500">{t("tripHub.organizationLocalNote")}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
          {bookingSections.map(({ kind, icon: Icon }) => {
            const done = bookingStatus[kind] === "done";
            return (
              <Card key={kind} className="flex flex-col shadow-sm">
                <CardHeader>
                  <div className="mb-2 flex items-center justify-between">
                    <Icon className="h-7 w-7 text-primary" />
                    <button
                      type="button"
                      onClick={() => toggleBookingStatus(kind)}
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${done ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}
                      aria-label={t("tripHub.toggleStatus", { section: t(`tripHub.${kind}`) })}
                    >
                      {done ? <CheckCircle2 className="mr-1 h-4 w-4" /> : <Circle className="mr-1 h-4 w-4" />}
                      {t(done ? "tripHub.done" : "tripHub.toBook")}
                    </button>
                  </div>
                  <CardTitle>{t(`tripHub.${kind}`)}</CardTitle>
                </CardHeader>
                <CardContent className="mt-auto">
                  <p className="text-sm text-gray-600">{t(`tripHub.${kind}Desc`)}</p>
                </CardContent>
              </Card>
            );
          })}
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-[1fr_auto]">
          <Card className="shadow-sm">
            <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3">
                <ReceiptText className="h-7 w-7 shrink-0 text-primary" />
                <div>
                  <h2 className="font-bold">{t("tripHub.expensesTitle")}</h2>
                  <p className="text-sm text-gray-600">{t("tripHub.expensesDesc")}</p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={openExpenses}
                disabled={isLoadingExpenseGroups || Boolean(expenseGroupsError)}
              >
                {expenseGroupsError
                  ? t("tripHub.expensesUnavailable")
                  : expenseGroups?.length
                    ? t("tripHub.openExpenses")
                    : t("tripHub.startExpenses")}
              </Button>
            </CardContent>
          </Card>
          <Button className="h-full min-h-20 px-8" onClick={openCheckout}>{t("tripHub.continueCheckout")}</Button>
        </div>
      </main>
      <Footer />
    </div>
  );
}
