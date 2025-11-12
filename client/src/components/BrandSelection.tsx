import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Users, Heart } from "lucide-react";

interface BrandSelectionProps {
  onSelectBrand: (brand: 'byebro' | 'byebride') => void;
}

export default function BrandSelection({ onSelectBrand }: BrandSelectionProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-4xl w-full">
        {/* ByeBi Logo - Elegant and Eye-catching */}
        <div className="text-center mb-16">
          <div className="inline-block">
            <div className="flex items-center justify-center gap-4">
              {/* Infinity Symbol - Esattamente come nell'immagine */}
              <div className="relative w-16 h-16 md:w-20 md:h-20">
                <svg viewBox="0 0 100 60" className="w-full h-full">
                  <path
                    d="M 20,30 C 20,18 28,10 38,10 C 48,10 50,18 50,30 C 50,42 48,50 38,50 C 28,50 20,42 20,30 M 50,30 C 50,18 52,10 62,10 C 72,10 80,18 80,30 C 80,42 72,50 62,50 C 52,50 50,42 50,30"
                    fill="none"
                    stroke="url(#infinityGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="infinityGradient">
                      <stop offset="0%" stopColor="#1a1a1a">
                        <animate attributeName="stop-color" values="#1a1a1a; #ef4444; #ffffff; #ec4899; #1a1a1a" dur="4s" repeatCount="indefinite" />
                      </stop>
                      <stop offset="50%" stopColor="#ef4444">
                        <animate attributeName="stop-color" values="#ef4444; #ffffff; #ec4899; #1a1a1a; #ef4444" dur="4s" repeatCount="indefinite" />
                      </stop>
                      <stop offset="100%" stopColor="#ec4899">
                        <animate attributeName="stop-color" values="#ec4899; #1a1a1a; #ef4444; #ffffff; #ec4899" dur="4s" repeatCount="indefinite" />
                      </stop>
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              
              {/* ByeBi Text - Esattamente come nell'immagine */}
              <div className="relative">
                <h1 className="text-7xl md:text-8xl font-bold relative italic leading-none" style={{ fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive" }}>
                  <span className="text-white">Bye</span>
                  <span className="text-red-500">Bi</span>
                </h1>
                {/* Doppia linea rossa sotto */}
                <div className="mt-2 space-y-0.5">
                  <div className="h-0.5 bg-gradient-to-r from-black via-red-500 via-white to-pink-500 rounded-full animate-gradient"></div>
                  <div className="h-1 bg-gradient-to-r from-black via-red-500 via-white to-pink-500 rounded-full animate-gradient"></div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-gray-400 text-lg mt-6 font-light tracking-wide">
            Your Ultimate Party Planning Experience
          </p>
        </div>

        {/* Brand Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* ByeBro Card */}
          <Card 
            className="group cursor-pointer overflow-hidden border-2 border-red-500/20 bg-gradient-to-br from-black to-red-950 hover:border-red-500 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-red-500/50"
            onClick={() => onSelectBrand('byebro')}
            data-testid="button-select-byebro"
          >
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <Users className="w-12 h-12 text-red-500" />
                <ArrowRight className="w-6 h-6 text-red-500 group-hover:translate-x-2 transition-transform" />
              </div>
              
              <h2 className="text-4xl font-bold text-white mb-3">
                Bye<span className="text-red-500">Bro</span>
              </h2>
              
              <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                Plan the ultimate bachelor party experience with AI-powered recommendations for nightlife, activities, and unforgettable adventures.
              </p>
              
              <div className="flex items-center gap-2 text-red-400 text-sm font-semibold">
                <span>For Bachelor Parties</span>
                <div className="h-px flex-1 bg-gradient-to-r from-red-500 to-transparent"></div>
              </div>
            </CardContent>
          </Card>

          {/* ByeBride Card */}
          <Card 
            className="group cursor-pointer overflow-hidden border-2 border-pink-500/20 bg-gradient-to-br from-black to-pink-950 hover:border-pink-500 transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-pink-500/50"
            onClick={() => onSelectBrand('byebride')}
            data-testid="button-select-byebride"
          >
            <CardContent className="p-8">
              <div className="flex items-center justify-between mb-6">
                <Heart className="w-12 h-12 text-pink-500" />
                <ArrowRight className="w-6 h-6 text-pink-500 group-hover:translate-x-2 transition-transform" />
              </div>
              
              <h2 className="text-4xl font-bold text-white mb-3">
                Bye<span className="text-pink-500">Bride</span>
              </h2>
              
              <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                Create magical bachelorette party moments with personalized itineraries, spa experiences, beach clubs, and celebration ideas.
              </p>
              
              <div className="flex items-center gap-2 text-pink-400 text-sm font-semibold">
                <span>For Bachelorette Parties</span>
                <div className="h-px flex-1 bg-gradient-to-r from-pink-500 to-transparent"></div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-gray-500 text-sm">
            AI-Powered • Personalized • Unforgettable
          </p>
        </div>
      </div>

      <style>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
