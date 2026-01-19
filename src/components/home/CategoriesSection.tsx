import { ArrowRight } from "lucide-react";
import productHerbs from "@/assets/product-herbs.jpg";
import productSalt from "@/assets/product-salt.jpg";
import productKit from "@/assets/product-kit.jpg";
import productTurmeric from "@/assets/product-turmeric.jpg";

const categories = [
  {
    name: "Ervas & Temperos",
    description: "Sabores naturais para cada prato",
    image: productHerbs,
    count: 24,
  },
  {
    name: "Sais & Flor de Sal",
    description: "Cristais gourmet premium",
    image: productSalt,
    count: 12,
  },
  {
    name: "Kits & Presentes",
    description: "O presente perfeito",
    image: productKit,
    count: 8,
  },
  {
    name: "Especiarias Exóticas",
    description: "Sabores do mundo",
    image: productTurmeric,
    count: 18,
  },
];

const CategoriesSection = () => {
  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container-species">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between mb-12">
          <div>
            <span className="inline-block px-4 py-1 bg-spice-forest/10 rounded-full text-spice-forest font-medium text-sm mb-4">
              🌿 Categorias
            </span>
            <h2 className="font-serif text-3xl lg:text-4xl font-bold text-foreground">
              Explore por Categoria
            </h2>
          </div>
          <a
            href="#"
            className="mt-4 lg:mt-0 inline-flex items-center gap-2 text-primary font-medium hover:gap-3 transition-all"
          >
            Ver todas
            <ArrowRight size={18} />
          </a>
        </div>

        {/* Categories grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((category, index) => (
            <a
              key={index}
              href="#"
              className="group relative rounded-2xl overflow-hidden aspect-[4/5] cursor-pointer"
            >
              {/* Background image */}
              <img
                src={category.image}
                alt={category.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              />

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-spice-brown/90 via-spice-brown/40 to-transparent" />

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6 text-spice-warm-white">
                <span className="text-sm text-spice-cream/80">
                  {category.count} produtos
                </span>
                <h3 className="font-serif text-xl font-bold mt-1 group-hover:text-spice-gold transition-colors">
                  {category.name}
                </h3>
                <p className="text-sm text-spice-cream/80 mt-1">
                  {category.description}
                </p>

                <div className="mt-4 flex items-center gap-2 text-sm font-medium group-hover:gap-3 transition-all">
                  <span>Explorar</span>
                  <ArrowRight size={16} />
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CategoriesSection;
