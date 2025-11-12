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
            {/* Elegant BB Logo */}
            <div className="mb-6 flex justify-center">
              <svg width="160" height="120" viewBox="0 0 160 120" className="drop-shadow-2xl" style={{ overflow: 'visible' }}>
                {/* First B (Red gradient) */}
                <text 
                  x="15" 
                  y="85" 
                  fontSize="75" 
                  fontWeight="bold" 
                  fontFamily="serif"
                  className="bb-logo-first"
                  style={{ 
                    fill: 'url(#redGradient)',
                    filter: 'drop-shadow(0 4px 12px rgba(239, 68, 68, 0.4))'
                  }}
                >
                  B
                </text>
                {/* Second B (Pink gradient) */}
                <text 
                  x="65" 
                  y="85" 
                  fontSize="75" 
                  fontWeight="bold" 
                  fontFamily="serif"
                  className="bb-logo-second"
                  style={{ 
                    fill: 'url(#pinkGradient)',
                    filter: 'drop-shadow(0 4px 12px rgba(236, 72, 153, 0.4))'
                  }}
                >
                  B
                </text>
                <defs>
                  <linearGradient id="redGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#ef4444', stopOpacity: 1 }}>
                      <animate attributeName="stop-color" values="#ef4444;#dc2626;#ef4444" dur="3s" repeatCount="indefinite"/>
                    </stop>
                    <stop offset="100%" style={{ stopColor: '#dc2626', stopOpacity: 1 }}>
                      <animate attributeName="stop-color" values="#dc2626;#991b1b;#dc2626" dur="3s" repeatCount="indefinite"/>
                    </stop>
                  </linearGradient>
                  <linearGradient id="pinkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#ec4899', stopOpacity: 1 }}>
                      <animate attributeName="stop-color" values="#ec4899;#db2777;#ec4899" dur="3s" repeatCount="indefinite"/>
                    </stop>
                    <stop offset="100%" style={{ stopColor: '#db2777', stopOpacity: 1 }}>
                      <animate attributeName="stop-color" values="#db2777;#be185d;#db2777" dur="3s" repeatCount="indefinite"/>
                    </stop>
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* ByeBi Text with Custom Fonts */}
            <h1 className="text-7xl md:text-8xl mb-4 relative leading-tight">
              <span className="byebi-bye animate-gradient-flow">
                Bye
              </span>
              <span className="byebi-bi animate-gradient-flow-delayed">
                Bi
              </span>
            </h1>
            <div className="h-1 bg-gradient-to-r from-black via-red-500 via-white via-pink-500 to-black rounded-full animate-gradient-line bg-[length:300%_100%]"></div>
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
        /* Font Styles */
        .byebi-bye {
          font-family: 'Great Vibes', 'Brush Script MT', cursive, serif;
          background: linear-gradient(90deg, #000000, #ef4444, #ffffff, #ec4899, #000000);
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          display: inline-block;
        }

        .byebi-bi {
          font-family: 'Lobster Two', 'Arial Black', 'Impact', sans-serif;
          font-weight: 700;
          background: linear-gradient(90deg, #000000, #ec4899, #ffffff, #ef4444, #000000);
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          display: inline-block;
        }

        /* Gradient Flow Animations */
        @keyframes gradientFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        @keyframes gradientFlowDelayed {
          0% { background-position: 100% 50%; }
          50% { background-position: 0% 50%; }
          100% { background-position: 100% 50%; }
        }

        @keyframes gradientLine {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .animate-gradient-flow {
          animation: gradientFlow 6s ease-in-out infinite;
        }

        .animate-gradient-flow-delayed {
          animation: gradientFlowDelayed 6s ease-in-out infinite;
        }

        .animate-gradient-line {
          animation: gradientLine 4s linear infinite;
        }

        /* BB Logo Animations */
        .bb-logo-first {
          animation: pulse 2s ease-in-out infinite;
        }

        .bb-logo-second {
          animation: pulse 2s ease-in-out infinite 0.5s;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
      `}</style>
    </div>
  );
}
