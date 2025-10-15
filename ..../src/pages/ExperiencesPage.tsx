import { useEffect } from "react";
import ExperienceTypes from "@/components/ExperienceTypes";
import Footer from "@/components/Footer";
import Newsletter from "@/components/Newsletter";
import Header from "@/components/Header";

export default function ExperiencesPage() {
  // Scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <section className="py-16 bg-black">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold font-poppins mb-4 text-white">Experience Types</h1>
              <p className="text-gray-300 max-w-3xl mx-auto">
                Choose the perfect vibe for your bachelor party. From adrenaline-pumping adventures to refined experiences, we've got you covered.
              </p>
            </div>
          </div>
        </section>
        
        <ExperienceTypes />
        
        <Newsletter />
      </main>
      <Footer />
    </div>
  );
}