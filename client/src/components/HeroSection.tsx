import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onGetStarted: () => void;
}

export default function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="relative py-12 md:py-24 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/images/piano-bar-red-black.svg')" }}>
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black to-red-900 opacity-60 mix-blend-multiply"></div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-xl backdrop-blur-sm bg-black/20 p-6 rounded-lg">
          <h1 className="text-white font-bold text-4xl md:text-5xl mb-4 font-poppins leading-tight drop-shadow-lg">
            One more Night, no more rights!
          </h1>
          <p className="text-white text-lg mb-6 md:mb-8 drop-shadow">
            Create unforgettable memories with personalized trips, activities, and gear for the groom's last adventure.
          </p>
          <Button 
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition duration-300 shadow-lg transform hover:-translate-y-1"
            onClick={onGetStarted}
          >
            Plan Your Trip
          </Button>
        </div>
      </div>
    </section>
  );
}
