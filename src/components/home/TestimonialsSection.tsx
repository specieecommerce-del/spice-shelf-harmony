import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    id: 1,
    name: "Maria Clara",
    location: "São Paulo, SP",
    rating: 5,
    text: "Os temperos da Species transformaram completamente minha cozinha! A qualidade é incomparável e o aroma é incrível.",
    avatar: "MC",
  },
  {
    id: 2,
    name: "João Pedro",
    location: "Rio de Janeiro, RJ",
    rating: 5,
    text: "Comprei o kit para presentear minha mãe e ela adorou! Embalagem linda e temperos de altíssima qualidade.",
    avatar: "JP",
  },
  {
    id: 3,
    name: "Ana Beatriz",
    location: "Belo Horizonte, MG",
    rating: 5,
    text: "Sou chef profissional e confio nos produtos Species. O frescor e a intensidade dos sabores fazem toda diferença.",
    avatar: "AB",
  },
];

const TestimonialsSection = () => {
  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container-species">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1 bg-spice-gold/10 rounded-full text-spice-gold font-medium text-sm mb-4">
            💬 Depoimentos
          </span>
          <h2 className="font-serif text-3xl lg:text-4xl font-bold text-foreground mb-4">
            O Que Nossos Clientes Dizem
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Mais de 5.000 clientes satisfeitos em todo o Brasil
          </p>
        </div>

        {/* Testimonials grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div
              key={testimonial.id}
              className="bg-card p-8 rounded-2xl shadow-card hover:shadow-elevated transition-shadow relative"
            >
              {/* Quote icon */}
              <Quote className="absolute top-6 right-6 w-10 h-10 text-primary/10" />

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star
                    key={i}
                    size={16}
                    className="fill-spice-gold text-spice-gold"
                  />
                ))}
              </div>

              {/* Text */}
              <p className="text-foreground mb-6 leading-relaxed">
                "{testimonial.text}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
                  {testimonial.avatar}
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">
                    {testimonial.name}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {testimonial.location}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="mt-16 flex flex-wrap justify-center items-center gap-8 opacity-60">
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground">+5.000</div>
            <div className="text-sm text-muted-foreground">Clientes felizes</div>
          </div>
          <div className="w-px h-12 bg-border hidden sm:block" />
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground">4.9/5</div>
            <div className="text-sm text-muted-foreground">Avaliação média</div>
          </div>
          <div className="w-px h-12 bg-border hidden sm:block" />
          <div className="text-center">
            <div className="text-3xl font-bold text-foreground">99%</div>
            <div className="text-sm text-muted-foreground">Recomendam</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
