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
        <HowItWorks />
        
        {/* Featured Destinations */}
        <FeaturedDestinations />
        
        {/* Experience Types */}
        <ExperienceTypes />
        
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
