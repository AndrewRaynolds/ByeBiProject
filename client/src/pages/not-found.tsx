import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { AlertCircle, Home } from "lucide-react";
import { useTranslation } from "@/contexts/LanguageContext";
import { Link } from "wouter";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen w-full flex-col bg-gray-50">
      <Header />
      <main
        className="flex flex-1 items-center justify-center px-4 py-16"
        id="main-content"
        tabIndex={-1}
      >
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle
              aria-hidden="true"
              className="mx-auto mb-4 h-10 w-10 text-red-500"
            />
            <h1 className="text-2xl font-bold text-gray-900">
              {t("notFound.title")}
            </h1>

            <p className="mt-4 text-sm text-gray-600">
              {t("notFound.desc")}
            </p>

            <Button asChild className="mt-6">
              <Link href="/">
                <Home aria-hidden="true" className="mr-2 h-4 w-4" />
                {t("notFound.backHome")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
