import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import FeaturedDestinations from "@/components/FeaturedDestinations";
import ExperienceTypes from "@/components/ExperienceTypes";
import SecretBlog from "@/components/SecretBlog";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";
import { useEffect } from "react";
import { trackProductEvent } from "@/lib/track";

export default function Home() {
  useEffect(() => trackProductEvent("home_view"), []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main id="main-content" tabIndex={-1} className="flex-grow">
        {/* Hero Section with Integrated Activity Ideas & Chat */}
        <HeroSection />
        
        {/* How It Works */}
        <HowItWorks brand="bro" />
        
        {/* Featured Destinations */}
        <FeaturedDestinations brand="bro" />
        
        {/* Experience Types */}
        <ExperienceTypes brand="bro" />
        
        {/* Secret Blog */}
        <SecretBlog brand="bro" />
        
        {/* Newsletter */}
        <Newsletter />
      </main>
      
      <Footer />
    </div>
  );
}
