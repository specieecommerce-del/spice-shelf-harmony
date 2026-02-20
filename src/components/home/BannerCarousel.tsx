import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  button_text: string | null;
  sort_order: number;
  is_active: boolean;
  image_position?: string | null;
}

interface BannerCarouselProps {
  autoPlayInterval?: number;
  showControls?: boolean;
  showIndicators?: boolean;
}

const BannerCarousel = ({
  autoPlayInterval = 5000,
  showControls = true,
  showIndicators = true,
}: BannerCarouselProps) => {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const { data, error } = await supabase
        .from("promotional_banners")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (error) throw error;

      // Filter banners within date range
      const now = new Date();
      const validBanners = (data || []).filter((banner) => {
        if (banner.start_date && new Date(banner.start_date) > now) return false;
        if (banner.end_date && new Date(banner.end_date) < now) return false;
        return true;
      });

      setBanners(validBanners);
    } catch (error) {
      console.error("Error fetching banners:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Auto-play functionality
  useEffect(() => {
    if (!isPlaying || banners.length <= 1) return;

    const interval = setInterval(nextSlide, autoPlayInterval);
    return () => clearInterval(interval);
  }, [isPlaying, banners.length, autoPlayInterval, nextSlide]);

  if (isLoading) {
    return (
      <div className="relative w-full aspect-[3/1] bg-muted animate-pulse rounded-lg overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (banners.length === 0) {
    return null;
  }

  return (
    <div className="relative w-full aspect-[3/2] md:aspect-[16/5] overflow-hidden rounded-lg group bg-black">
      {/* Slides */}
      <div
        className="flex h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {banners.map((banner) => (
          <div
            key={banner.id}
            className="relative w-full h-full flex-shrink-0"
          >
            {banner.image_url ? (
              <img
                src={banner.image_url}
                alt={banner.title}
                className="w-full h-full object-cover"
                style={{ objectPosition: banner.image_position || "center center" }}
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-primary/20 to-primary/5" />
            )}

            {/* Overlay & Content */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent">
              <div className="absolute inset-0 flex items-center">
                <div className="container-species">
                  <div className="max-w-lg text-white">
                    <h2 className="text-2xl md:text-4xl font-bold mb-2 drop-shadow-lg animate-fade-in">
                      {banner.title}
                    </h2>
                    {banner.subtitle && (
                      <p className="text-lg md:text-xl text-white/90 mb-4 drop-shadow animate-fade-in" style={{ animationDelay: "0.1s" }}>
                        {banner.subtitle}
                      </p>
                    )}
                    {banner.button_text && banner.link_url && (
                      <Link to={banner.link_url}>
                        <Button
                          size="lg"
                          className="animate-fade-in"
                          style={{ animationDelay: "0.2s" }}
                        >
                          {banner.button_text}
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {showControls && banners.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/30"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/30"
            aria-label="Próximo"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}

      {/* Play/Pause Button */}
      {showControls && banners.length > 1 && (
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="absolute bottom-4 right-4 w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white/30"
          aria-label={isPlaying ? "Pausar" : "Reproduzir"}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </button>
      )}

      {/* Indicators */}
      {showIndicators && banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                index === currentIndex
                  ? "bg-white w-6"
                  : "bg-white/50 hover:bg-white/75"
              )}
              aria-label={`Ir para slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default BannerCarousel;
