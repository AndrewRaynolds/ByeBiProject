import { Building, Map, GlassWater } from "lucide-react";

export default function HowItWorks() {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-3">How ByeBro Works</h2>
          <p className="text-gray-600 max-w-3xl mx-auto">Planning a bachelor party has never been easier. Follow these simple steps to create the ultimate experience.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
          <div className="bg-light rounded-lg p-6 shadow-md flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Building className="text-red-600 text-2xl" />
            </div>
            <h3 className="text-xl font-bold mb-3 font-poppins">Sign Up & Share Details</h3>
            <p className="text-gray-600">Create an account and tell us about the party - who's coming, what you're into, and where you want to go.</p>
          </div>
          
          <div className="bg-light rounded-lg p-6 shadow-md flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Map className="text-red-600 text-2xl" />
            </div>
            <h3 className="text-xl font-bold mb-3 font-poppins">Get Custom Itineraries</h3>
            <p className="text-gray-600">Our app generates personalized trip options with flights, accommodations, and activities tailored to your preferences.</p>
          </div>
          
          <div className="bg-light rounded-lg p-6 shadow-md flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <GlassWater className="text-red-600 text-2xl" />
            </div>
            <h3 className="text-xl font-bold mb-3 font-poppins">Book & Celebrate</h3>
            <p className="text-gray-600">Book your trip through our trusted partners, order custom merch, and get ready for an unforgettable bachelor party.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
