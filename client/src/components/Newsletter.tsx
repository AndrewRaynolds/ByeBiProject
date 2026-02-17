import { useState } from "react";
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
  const { t } = useTranslation();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
      
      setIsSubmitting(true);
      
      // Simulate API call
      setTimeout(() => {
        toast({
          title: t('newsletter.successTitle'),
          description: t('newsletter.successDesc'),
        });
        
        setEmail("");
        setIsSubmitting(false);
      }, 1000);
      
    } catch (error) {
      toast({
        title: t('newsletter.errorTitle'),
        description: t('newsletter.errorDesc'),
        variant: "destructive",
      });
    }
  };

  return (
    <section className="py-16 bg-black text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-4">{t('newsletter.title')}</h2>
          <p className="text-gray-300 mb-8">{t('newsletter.subtitle')}</p>
          
          <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3">
            <Input
              type="email"
              placeholder={t('newsletter.placeholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-4 py-3 rounded-lg flex-grow focus:outline-none focus:ring-2 focus:ring-red-600 bg-gray-900 text-white border border-gray-700"
            />
            <Button 
              type="submit" 
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition duration-300"
              disabled={isSubmitting}
            >
              {isSubmitting ? t('newsletter.subscribing') : t('newsletter.subscribe')}
            </Button>
          </form>
          
          <p className="text-gray-400 text-sm mt-4">{t('newsletter.privacy')}</p>
        </div>
      </div>
    </section>
  );
}
