import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onGetStarted: () => void;
}

export default function HeroSection({ onGetStarted }: HeroSectionProps) {
  return (
    <section className="relative py-12 md:py-24 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=1350&h=600&q=80')" }}>
      <div className="absolute inset-0 bg-gradient-to-r from-black to-red-900 bg-opacity-75 mix-blend-multiply"></div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-xl">
          <div className="flex flex-col items-start mb-4">
            <img src="/logo.svg" alt="ByeBro Logo" className="h-20 mb-4" />
            <h1 className="text-white font-bold text-4xl md:text-5xl font-poppins leading-tight">
              One more Night, no more rights!
            </h1>
          </div>
          <p className="text-white text-lg mb-6 md:mb-8">
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
