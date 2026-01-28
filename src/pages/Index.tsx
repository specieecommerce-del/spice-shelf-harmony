import Header from "@/components/layout/Header";
import HeroSection from "@/components/home/HeroSection";
import BannerCarousel from "@/components/home/BannerCarousel";
import BenefitsBar from "@/components/home/BenefitsBar";
import FeaturedProducts from "@/components/home/FeaturedProducts";
import CategoriesSection from "@/components/home/CategoriesSection";
import RecipesSection from "@/components/home/RecipesSection";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import NewsletterSection from "@/components/home/NewsletterSection";
import Footer from "@/components/layout/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <HeroSection />
        {/* Banner Carousel Section */}
        <section className="py-6 bg-background">
          <div className="container-species">
            <BannerCarousel autoPlayInterval={5000} />
          </div>
        </section>
        <BenefitsBar />
        <FeaturedProducts />
        <CategoriesSection />
        <RecipesSection />
        <TestimonialsSection />
        <NewsletterSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
