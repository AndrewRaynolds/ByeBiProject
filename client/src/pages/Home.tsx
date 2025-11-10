import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import FeaturedDestinations from "@/components/FeaturedDestinations";
import ExperienceTypes from "@/components/ExperienceTypes";
import SecretBlog from "@/components/SecretBlog";
import PremiumFeatures from "@/components/PremiumFeatures";
import Testimonials from "@/components/Testimonials";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
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
        
        {/* Premium Features */}
        <PremiumFeatures brand="bro" />
        
        {/* Testimonials */}
        <Testimonials brand="bro" />
        
        {/* Newsletter */}
        <Newsletter />
      </main>
      
      <Footer />
    </div>
  );
}
