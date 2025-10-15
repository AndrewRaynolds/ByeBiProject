import { useRef } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import FeaturedDestinations from "@/components/FeaturedDestinations";
import ExperienceTypes from "@/components/ExperienceTypes";
import TripPlanningForm from "@/components/TripPlanningForm";
import SecretBlog from "@/components/SecretBlog";
import PremiumFeatures from "@/components/PremiumFeatures";
import CustomMerchandise from "@/components/CustomMerchandise";
import Testimonials from "@/components/Testimonials";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";

export default function Home() {
  const tripPlanningRef = useRef<HTMLDivElement>(null);

  const scrollToTripPlanning = () => {
    tripPlanningRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <HeroSection onGetStarted={scrollToTripPlanning} />
        
        {/* How It Works */}
        <HowItWorks />
        
        {/* Featured Destinations */}
        <FeaturedDestinations />
        
        {/* Experience Types */}
        <ExperienceTypes />
        
        {/* Trip Planning Form */}
        <div ref={tripPlanningRef}>
          <TripPlanningForm />
        </div>
        
        {/* Secret Blog */}
        <SecretBlog />
        
        {/* Premium Features */}
        <PremiumFeatures />
        
        {/* Custom Merchandise */}
        <CustomMerchandise />
        
        {/* Testimonials */}
        <Testimonials />
        
        {/* Newsletter */}
        <Newsletter />
      </main>
      
      <Footer />
    </div>
  );
}
