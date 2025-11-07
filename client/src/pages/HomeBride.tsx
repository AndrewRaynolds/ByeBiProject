import Header from "@/components/Header";
import HeroSectionBride from "@/components/HeroSectionBride";
import HowItWorks from "@/components/HowItWorks";
import FeaturedDestinations from "@/components/FeaturedDestinations";
import ExperienceTypes from "@/components/ExperienceTypes";
import SecretBlog from "@/components/SecretBlog";
import PremiumFeatures from "@/components/PremiumFeatures";
import Testimonials from "@/components/Testimonials";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";

export default function HomeBride() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        <HeroSectionBride />
        <HowItWorks />
        <FeaturedDestinations />
        <ExperienceTypes />
        <SecretBlog />
        <PremiumFeatures />
        <Testimonials />
        <Newsletter />
      </main>
      
      <Footer />
    </div>
  );
}
