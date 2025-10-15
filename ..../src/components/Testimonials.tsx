import { Star } from "lucide-react";

// Testimonial data
const testimonials = [
  {
    name: "James Wilson",
    rating: 5.0,
    text: "ByeBro made planning my best friend's bachelor party so easy. The itinerary was perfect, accommodations were great, and everyone had an amazing time in Amsterdam. Would absolutely recommend!",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&h=100&q=80",
    trip: "Berlin Trip, July 2023"
  },
  {
    name: "Michael Johnson",
    rating: 4.5,
    text: "The custom t-shirts were a huge hit! Everyone loved them, and the whole experience from planning to partying was seamless. The Secret Blog tips definitely saved us from some rookie mistakes.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&h=100&q=80",
    trip: "Prague Trip, May 2023"
  },
  {
    name: "David Thompson",
    rating: 5.0,
    text: "As the best man, I was stressed about planning the perfect bachelor party. ByeBro took all that stress away. The activities they recommended in Barcelona were spot on, and the groom had the time of his life!",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?ixlib=rb-1.2.1&auto=format&fit=crop&w=100&h=100&q=80",
    trip: "Barcelona Trip, August 2023"
  }
];

// Helper function to render rating stars
const renderRatingStars = (rating: number) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const stars = [];

  for (let i = 0; i < fullStars; i++) {
    stars.push(<Star key={`full-${i}`} className="fill-yellow-400 text-yellow-400" />);
  }

  if (hasHalfStar) {
    stars.push(
      <svg key="half" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="fill-yellow-400 text-yellow-400">
        <path d="M12 17.8 5.8 21 7 14.1 2 9.3l7-1L12 2" fill="yellow" />
      </svg>
    );
  }

  return stars;
};

export default function Testimonials() {
  return (
    <section className="py-16 bg-light">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-poppins mb-3">What Our Customers Say</h2>
          <p className="text-gray-600 max-w-3xl mx-auto">Don't just take our word for it. Here's what bachelor parties planned with ByeBro have to say.</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-md">
              <div className="flex items-center mb-4">
                <div className="text-yellow-400 flex">
                  {renderRatingStars(testimonial.rating)}
                </div>
                <span className="text-gray-600 ml-2">{testimonial.rating.toFixed(1)}</span>
              </div>
              <p className="text-gray-600 mb-6 italic">"{testimonial.text}"</p>
              <div className="flex items-center">
                <img 
                  src={testimonial.image} 
                  alt={`${testimonial.name} profile photo`} 
                  className="w-12 h-12 rounded-full object-cover" 
                />
                <div className="ml-3">
                  <h4 className="font-bold text-dark">{testimonial.name}</h4>
                  <p className="text-gray-500 text-sm">{testimonial.trip}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
