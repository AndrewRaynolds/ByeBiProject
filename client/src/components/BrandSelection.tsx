import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Users, Heart } from "lucide-react";

interface BrandSelectionProps {
  onSelectBrand: (brand: 'byebro' | 'byebride') => void;
}

export default function BrandSelection({ onSelectBrand }: BrandSelectionProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-4xl w-full">
        {/* ByeBi Logo - Elegant and Brandable */}
        <div className="text-center mb-16">
          <div className="inline-block">
            {/* Abstract BB Logo */}
            <div className="flex justify-center mb-6">
              <svg width="120" height="80" viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
                <defs>
                  <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="33%" stopColor="#1a1a1a" />
                    <stop offset="66%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#ffffff" />
                  </linearGradient>
                </defs>
                {/* First Abstract B */}
                <path 
                  d="M15 10 Q15 10, 25 10 Q35 10, 35 20 Q35 30, 30 32 Q35 34, 35 44 Q35 54, 25 54 Q15 54, 15 54 Z M20 16 L20 28 L25 28 Q28 28, 28 22 Q28 16, 25 16 Z M20 34 L20 48 L25 48 Q29 48, 29 41 Q29 34, 25 34 Z" 
                  fill="url(#logoGradient)" 
                  opacity="0.9"
                />
                {/* Second Abstract B - Mirrored and Offset */}
                <path 
                  d="M85 26 Q85 26, 95 26 Q105 26, 105 36 Q105 46, 100 48 Q105 50, 105 60 Q105 70, 95 70 Q85 70, 85 70 Z M90 32 L90 44 L95 44 Q98 44, 98 38 Q98 32, 95 32 Z M90 50 L90 64 L95 64 Q99 64, 99 57 Q99 50, 95 50 Z" 
                  fill="url(#logoGradient)" 
                  opacity="0.9"
                />
                {/* Connecting Element - Abstract Curves */}
                <path 
                  d="M35 32 Q50 20, 65 28 Q75 32, 85 40" 
                  stroke="url(#logoGradient)" 
                  strokeWidth="2" 
                  fill="none" 
                  opacity="0.6"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            
            {/* ByeBi Text with New Gradient */}
            <h1 className="text-7xl md:text-8xl font-bold mb-4 relative tracking-tight">
              <span className="bg-gradient-to-r from-red-500 via-black via-pink-500 to-white bg-clip-text text-transparent animate-gradient" style={{backgroundSize: '300% 300%'}}>
                ByeBi
              </span>
            </h1>
            <div className="h-1 bg-gradient-to-r from-red-500 via-black via-pink-500 to-white rounded-full"></div>
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
