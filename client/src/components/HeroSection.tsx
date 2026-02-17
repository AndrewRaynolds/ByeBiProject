import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Send, MessageCircle } from "lucide-react";
import ChatDialogCompact from "./ChatDialogCompact";
import { useTranslation } from "@/contexts/LanguageContext";

export default function HeroSection() {
  const { t } = useTranslation();
  const [chatInput, setChatInput] = useState("");
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [initialChatMessage, setInitialChatMessage] = useState<string | undefined>(undefined);

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      setInitialChatMessage(chatInput.trim());
      setChatInput('');
      setChatDialogOpen(true);
    }
  };

  return (
    <>
      <section className="relative py-16 md:py-24 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('https://images.pexels.com/photos/7270934/pexels-photo-7270934.jpeg?auto=compress&cs=tinysrgb&h=650&w=940')" }}>
        <div className="absolute inset-0 bg-gradient-to-r from-black to-red-900 bg-opacity-75 mix-blend-multiply"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-white font-bold text-4xl md:text-5xl mb-3 leading-tight text-center">
              {t('hero.bro.title')}
            </h1>
            <p className="text-white text-lg mb-10 text-center max-w-3xl mx-auto">
              {t('hero.bro.subtitle')}
            </p>

            <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageCircle className="w-6 h-6 text-red-400" />
                <h3 className="text-white font-bold text-xl">{t('hero.bro.chatTitle')}</h3>
              </div>
              
              <p className="text-white/80 text-sm mb-4">
                {t('hero.bro.chatSubtitle')}
              </p>
              
              <form onSubmit={handleChatSubmit} className="space-y-3">
                <Input
                  type="text"
                  placeholder={t('hero.bro.placeholder')}
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="bg-white/95 border-white/30 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-red-500"
                  data-testid="input-hero-chat"
                />
                <Button 
                  type="submit"
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold transition-all duration-200 flex items-center justify-center gap-2"
                  data-testid="button-chat-submit"
                >
                  <Send className="w-4 h-4" />
                  {t('hero.bro.startChat')}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      <ChatDialogCompact 
        open={chatDialogOpen} 
        onOpenChange={setChatDialogOpen}
        initialMessage={initialChatMessage}
      />
    </>
  );
}
