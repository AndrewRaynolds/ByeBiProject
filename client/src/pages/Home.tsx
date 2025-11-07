import { useRef } from "react";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import FeaturedDestinations from "@/components/FeaturedDestinations";
import ExperienceTypes from "@/components/ExperienceTypes";
import SecretBlog from "@/components/SecretBlog";
import PremiumFeatures from "@/components/PremiumFeatures";
import Testimonials from "@/components/Testimonials";
import ActivitySuggestions from "@/components/ActivitySuggestions";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";

export default function Home() {
  const activityIdeasRef = useRef<HTMLDivElement>(null);

  const scrollToActivityIdeas = () => {
    activityIdeasRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        {/* Hero Section */}
        <HeroSection onGetIdeas={scrollToActivityIdeas} />
        
        {/* How It Works */}
        <HowItWorks />
        
        {/* Featured Destinations */}
        <FeaturedDestinations />
        
        {/* Experience Types */}
        <ExperienceTypes />
        
        {/* Activity Ideas Generator */}
        <div ref={activityIdeasRef}>
          <ActivitySuggestions />
        </div>
        
        {/* Secret Blog */}
        <SecretBlog />
        
        {/* Premium Features */}
        <PremiumFeatures />
        
        {/* Testimonials */}
        <Testimonials />
        
        {/* Newsletter */}
        <Newsletter />
      </main>
      
      <Footer />
    </div>
  );
}
