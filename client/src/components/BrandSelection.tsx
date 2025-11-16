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
            {/* Circular Red Logo with Stylized 'b' */}
            <div className="flex justify-center mb-8">
              <svg width="220" height="220" viewBox="0 0 220 220" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
                {/* Outer Red Circle */}
                <circle cx="110" cy="110" r="105" fill="#FF4444" />
                
                {/* Stylized 'b' with circular organic shapes */}
                {/* Upper circle of 'b' */}
                <circle cx="115" cy="75" r="22" fill="#1a1a1a" />
                
                {/* Lower curved part of 'b' */}
                <path 
                  d="M 65 50 L 65 170 L 80 170 Q 80 120, 115 120 Q 145 120, 145 145 Q 145 170, 115 170 Q 85 170, 80 170" 
                  fill="#1a1a1a" 
                  stroke="#1a1a1a"
                  strokeWidth="2"
                />
                
                {/* Large outer curved stroke */}
                <path 
                  d="M 50 60 Q 50 180, 110 200 Q 170 180, 170 110 Q 170 40, 110 20" 
                  fill="none" 
                  stroke="#1a1a1a" 
                  strokeWidth="18"
                  strokeLinecap="round"
                  opacity="0.9"
                />
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
                  WebkitTextStroke: '3px #1a1a1a'
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
