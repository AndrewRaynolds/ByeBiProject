import { useEffect, useRef, useState } from "react";
import ChatDialogCompact from "./ChatDialogCompact";
import HomeHero from "./HomeHero";
import { useTranslation } from "@/contexts/LanguageContext";

export default function HeroSection() {
  const { t } = useTranslation();
  const [chatInput, setChatInput] = useState("");
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [initialChatMessage, setInitialChatMessage] = useState<string | undefined>(undefined);
  const hasConsumedPrefill = useRef(false);

  useEffect(() => {
    if (hasConsumedPrefill.current) return;

    const destination = new URLSearchParams(window.location.search)
      .get("planDestination")
      ?.trim();
    if (!destination) return;

    hasConsumedPrefill.current = true;
    setChatInput(t("hero.planDestinationPrefill", { destination }));

    const url = new URL(window.location.href);
    url.searchParams.delete("planDestination");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, [t]);

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
      <HomeHero
        brand="bro"
        chatInput={chatInput}
        inputTestId="input-hero-chat"
        buttonTestId="button-chat-submit"
        onChatInputChange={setChatInput}
        onChatSubmit={handleChatSubmit}
      />

      <ChatDialogCompact 
        open={chatDialogOpen} 
        onOpenChange={setChatDialogOpen}
        initialMessage={initialChatMessage}
      />
    </>
  );
}
