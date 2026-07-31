import Header from "@/components/Header";
import HeroSectionBride from "@/components/HeroSectionBride";
import HowItWorks from "@/components/HowItWorks";
import FeaturedDestinations from "@/components/FeaturedDestinations";
import ExperienceTypes from "@/components/ExperienceTypes";
import SecretBlog from "@/components/SecretBlog";
import Testimonials from "@/components/Testimonials";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";

export default function HomeBride() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main id="main-content" tabIndex={-1} className="flex-grow">
        <HeroSectionBride />
        <HowItWorks brand="bride" />
        <FeaturedDestinations brand="bride" />
        <ExperienceTypes brand="bride" />
        <SecretBlog brand="bride" />
        <Testimonials brand="bride" />
        <Newsletter />
      </main>
      
      <Footer />
    </div>
  );
}
