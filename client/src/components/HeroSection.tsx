import { useState } from "react";
import ChatDialogCompact from "./ChatDialogCompact";
import HomeHero from "./HomeHero";

export default function HeroSection() {
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
