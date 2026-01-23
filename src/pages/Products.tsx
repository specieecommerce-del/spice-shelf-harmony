import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FeaturedProducts from "@/components/home/FeaturedProducts";

const Products = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-28">
        <FeaturedProducts />
      </main>
      <Footer />
    </div>
  );
};

export default Products;
