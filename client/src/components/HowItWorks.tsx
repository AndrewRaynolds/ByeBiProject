import { Building, Map, GlassWater } from "lucide-react";

type Brand = 'bro' | 'bride';

interface HowItWorksProps {
  brand?: Brand;
}

const COPY = {
  bro: {
    title: "How ByeBro Works",
    subtitle: "Planning a bachelor party has never been easier. Follow these simple steps to create the ultimate experience.",
    bookText: "Book your trip through our trusted partners, order custom merch, and get ready for an unforgettable bachelor party."
  },
  bride: {
    title: "How ByeBride Works",
    subtitle: "Planning a bachelorette party has never been easier. Follow these simple steps to create the ultimate experience.",
    bookText: "Book your trip through our trusted partners, order custom merch, and get ready for an unforgettable bachelorette party."
  }
};

export default function HowItWorks({ brand = 'bro' }: HowItWorksProps) {
  const copy = COPY[brand];
  const accentColor = brand === 'bride' ? 'border-pink-600 text-pink-600' : 'border-red-600 text-red-600';
  
  return (
    <section className="py-16 bg-black">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-3 text-white">{copy.title}</h2>
          <p className="text-gray-300 max-w-3xl mx-auto">{copy.subtitle}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          <div className="bg-gray-900 rounded-lg p-6 shadow-md flex flex-col items-center text-center">
            <div className={`w-16 h-16 bg-black border-2 ${accentColor.split(' ')[0]} rounded-full flex items-center justify-center mb-4`}>
              <Building className={`${accentColor.split(' ')[1]} text-2xl`} />
            </div>
            <h3 className="text-xl font-bold mb-3 font-poppins text-white">Sign Up & Share Details</h3>
            <p className="text-gray-300">Create an account and tell us about the party - who's coming, what you're into, and where you want to go.</p>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-6 shadow-md flex flex-col items-center text-center">
            <div className={`w-16 h-16 bg-black border-2 ${accentColor.split(' ')[0]} rounded-full flex items-center justify-center mb-4`}>
              <Map className={`${accentColor.split(' ')[1]} text-2xl`} />
            </div>
            <h3 className="text-xl font-bold mb-3 font-poppins text-white">Get Custom Itineraries</h3>
            <p className="text-gray-300">Our app generates personalized trip options with flights, accommodations, and activities tailored to your preferences.</p>
          </div>
          
          <div className="bg-gray-900 rounded-lg p-6 shadow-md flex flex-col items-center text-center">
            <div className={`w-16 h-16 bg-black border-2 ${accentColor.split(' ')[0]} rounded-full flex items-center justify-center mb-4`}>
              <GlassWater className={`${accentColor.split(' ')[1]} text-2xl`} />
            </div>
            <h3 className="text-xl font-bold mb-3 font-poppins text-white">Book & Celebrate</h3>
            <p className="text-gray-300">{copy.bookText}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
