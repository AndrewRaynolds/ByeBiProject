import { useState } from "react";
import ChatDialogCompactBride from "./ChatDialogCompactBride";
import HomeHero from "./HomeHero";

export default function HeroSectionBride() {
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
        brand="bride"
        chatInput={chatInput}
        inputTestId="input-hero-chat-bride"
        buttonTestId="button-chat-submit-bride"
        onChatInputChange={setChatInput}
        onChatSubmit={handleChatSubmit}
      />

      <ChatDialogCompactBride 
        open={chatDialogOpen} 
        onOpenChange={setChatDialogOpen}
        initialMessage={initialChatMessage}
      />
    </>
  );
}
