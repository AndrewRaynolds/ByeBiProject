import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/contexts/LanguageContext";
import { z } from "zod";

const emailSchema = z.string().email("Please enter a valid email address");

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { t, locale } = useTranslation();

  useEffect(() => {
    const status = new URLSearchParams(window.location.search).get("newsletter");
    if (!status) return;
    toast({
      title: t(`newsletter.${status}Title`),
      description: t(`newsletter.${status}Desc`),
      ...(status === "invalid" ? { variant: "destructive" as const } : {}),
    });
    const url = new URL(window.location.href);
    url.searchParams.delete("newsletter");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [t, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
      
      setIsSubmitting(true);
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          locale,
          brand: localStorage.getItem("selectedBrand") === "byebride" ? "byebride" : "byebro",
        }),
      });
      if (!response.ok) throw new Error("Newsletter subscription failed");
      toast({
        title: t('newsletter.successTitle'),
        description: t('newsletter.successDesc'),
      });
      setEmail("");
    } catch (error) {
      toast({
        title: t(emailSchema.safeParse(email).success ? 'newsletter.serviceErrorTitle' : 'newsletter.errorTitle'),
        description: t(emailSchema.safeParse(email).success ? 'newsletter.serviceErrorDesc' : 'newsletter.errorDesc'),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="bg-surface-muted py-16 text-foreground">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-4">{t('newsletter.title')}</h2>
          <p className="mb-8 text-muted-foreground">{t('newsletter.subtitle')}</p>
          
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3">
            <Input
              type="email"
              placeholder={t('newsletter.placeholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-grow rounded-lg border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <Button 
              type="submit" 
              className="font-bold py-3 px-6 rounded-lg transition duration-300"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('newsletter.subscribing') : t('newsletter.subscribe')}
            </Button>
          </form>
          
          <p className="mt-4 text-sm text-muted-foreground">{t('newsletter.privacy')}</p>
        </div>
      </div>
    </section>
  );
}
