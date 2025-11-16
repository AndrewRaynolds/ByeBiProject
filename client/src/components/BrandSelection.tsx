import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Users, Heart } from "lucide-react";

interface BrandSelectionProps {
  onSelectBrand: (brand: 'byebro' | 'byebride') => void;
}

export default function BrandSelection({ onSelectBrand }: BrandSelectionProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center px-4">
      <div className="max-w-4xl w-full">
        {/* ByeBi Logo - Circular Red Logo with BYEBI Text */}
        <div className="text-center mb-16">
          <div className="inline-block">
            {/* Circular Red Logo with 'b' */}
            <div className="flex justify-center mb-8">
              <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
                {/* Outer Red Circle */}
                <circle cx="100" cy="100" r="95" fill="#FF3333" />
                
                {/* Stylized 'b' in center */}
                <path 
                  d="M 75 60 L 75 140 L 90 140 L 90 105 Q 90 105, 105 105 Q 125 105, 125 85 Q 125 65, 105 65 Q 90 65, 90 65 L 90 60 Z M 90 75 L 105 75 Q 115 75, 115 85 Q 115 95, 105 95 L 90 95 Z" 
                  fill="#1a1a1a" 
                />
                
                {/* Inner decorative curves for the 'b' */}
                <circle cx="100" cy="100" r="80" fill="none" stroke="#1a1a1a" strokeWidth="12" opacity="0.3" />
              </svg>
            </div>
            
            {/* BYEBI Text - White with Outline */}
            <div className="relative">
              <h1 className="text-7xl md:text-8xl font-black tracking-wider relative" style={{ 
                color: '#ffffff',
                textShadow: '-2px -2px 0 #1a1a1a, 2px -2px 0 #1a1a1a, -2px 2px 0 #1a1a1a, 2px 2px 0 #1a1a1a, 0 0 20px rgba(255, 255, 255, 0.5)',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                letterSpacing: '0.1em'
              }}>
                BYE<span style={{
                  WebkitTextStroke: '3px #1a1a1a',
                  textStroke: '3px #1a1a1a'
                }}>BI</span>
              </h1>
              <div className="h-1 bg-white rounded-full mt-4 w-full shadow-lg"></div>
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
