import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import type { PublicSharedTrip } from "@shared/schema";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "@/contexts/LanguageContext";
import { CalendarDays, ListChecks, MapPin, Plane, Users } from "lucide-react";

export default function SharedTrip() {
  const { token } = useParams<{ token: string }>();
  const { t } = useTranslation();
  const { data: trip, isLoading, error } = useQuery<PublicSharedTrip>({
    queryKey: [`/api/shared-trips/${token}`],
    retry: false,
    staleTime: 0,
    refetchOnMount: "always",
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-light">
        <Header />
        <main className="container mx-auto max-w-4xl px-4 py-10"><Skeleton className="h-72 rounded-xl" /></main>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="min-h-screen flex flex-col bg-light">
        <Header />
        <main className="container mx-auto max-w-xl flex-1 px-4 py-20 text-center">
          <h1 className="mb-3 text-2xl font-bold">{t("sharedTrip.notFoundTitle")}</h1>
          <p className="text-gray-600">{t("sharedTrip.notFoundDesc")}</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-light">
      <Header />
      <main id="main-content" tabIndex={-1} className="container mx-auto max-w-4xl flex-1 px-4 py-10">
        <p className="mb-4 text-center text-sm font-semibold uppercase tracking-wide text-primary">
          {t("sharedTrip.readOnly")}
        </p>
        <Card className="overflow-hidden border-0 shadow-md">
          <CardHeader className="bg-primary text-white">
            <p className="text-sm font-semibold uppercase tracking-wide text-white/80">{t("sharedTrip.eyebrow")}</p>
            <CardTitle className="text-3xl">{(trip.destinations ?? []).join(", ") || "—"}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 pt-6 text-sm sm:grid-cols-2">
            <div className="flex gap-2"><MapPin className="h-5 w-5 text-primary" /><span><strong>{t("tripHub.destination")}:</strong> {(trip.destinations ?? []).join(", ") || "—"}</span></div>
            <div className="flex gap-2"><Plane className="h-5 w-5 text-primary" /><span><strong>{t("tripHub.departure")}:</strong> {trip.departureCity}</span></div>
            <div className="flex gap-2"><CalendarDays className="h-5 w-5 text-primary" /><span><strong>{t("tripHub.dates")}:</strong> {trip.startDate} – {trip.endDate}</span></div>
            <div className="flex gap-2"><Users className="h-5 w-5 text-primary" /><span><strong>{t("tripHub.participants")}:</strong> {trip.participants}</span></div>
            <div className="flex gap-2"><ListChecks className="h-5 w-5 text-primary" /><span><strong>{t("tripHub.experience")}:</strong> {t(`dashboard.experienceType.${trip.experienceType}`)}</span></div>
            <div className="flex gap-2"><ListChecks className="h-5 w-5 text-primary" /><span><strong>{t("tripHub.savedActivities")}:</strong> {(trip.activities ?? []).join(", ") || t("tripHub.noActivities")}</span></div>
          </CardContent>
        </Card>
        <p className="mt-5 text-center text-sm text-gray-600">{t("sharedTrip.bookingStatusUnavailable")}</p>
      </main>
      <Footer />
    </div>
  );
}
