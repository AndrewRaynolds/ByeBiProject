import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Send } from "lucide-react";

interface HeroSectionProps {
  onGetStarted: () => void;
}

export default function HeroSection({ onGetStarted }: HeroSectionProps) {
  const [chatInput, setChatInput] = useState("");
  const [, setLocation] = useLocation();

  const handleChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      localStorage.setItem('byebro-initial-message', chatInput.trim());
      setLocation('/one-click-package');
    }
  };

  return (
    <section className="relative py-12 md:py-24 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('https://images.pexels.com/photos/7270934/pexels-photo-7270934.jpeg?auto=compress&cs=tinysrgb&h=650&w=940')" }}>
      <div className="absolute inset-0 bg-gradient-to-r from-black to-red-900 bg-opacity-75 mix-blend-multiply"></div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-xl">
          <h1 className="text-white font-bold text-4xl md:text-5xl mb-4 font-poppins leading-tight">
            One more Night, no more rights!
          </h1>
          <p className="text-white text-lg mb-6 md:mb-8">
            Create unforgettable memories with personalized trips, activities, and gear for the groom's last adventure.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300 shadow-lg transform hover:-translate-y-1"
              onClick={onGetStarted}
            >
              Plan Your Trip
            </Button>
            
            <Link href="/one-click-package">
              <Button 
                className="bg-black hover:bg-gray-800 text-white border border-red-600 font-bold py-3 px-8 rounded-lg transition duration-300 shadow-lg transform hover:-translate-y-1"
                variant="outline"
              >
                One Click Assistant
              </Button>
            </Link>
          </div>

          {/* Quick Chat CTA */}
          <div className="mt-8 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-4">
            <p className="text-white text-sm font-medium mb-3">
              💬 Start planning your bachelor party now
            </p>
            <form onSubmit={handleChatSubmit} className="flex gap-2">
              <Input
                type="text"
                placeholder="Where do you want to go? (e.g., Ibiza, Barcelona...)"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                className="flex-1 bg-white/90 border-white/30 text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-red-500"
                data-testid="input-hero-chat"
              />
              <Button 
                type="submit"
                className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 transition-all duration-200"
                data-testid="button-chat-submit"
              >
                <Send className="w-4 h-4 mr-2" />
                Chat Now
              </Button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
