import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface FavoritesContextType {
  favorites: number[];
  toggleFavorite: (productId: number) => void;
  isFavorite: (productId: number) => boolean;
  getFavoritesCount: () => number;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

export const FavoritesProvider = ({ children }: { children: ReactNode }) => {
  const [favorites, setFavorites] = useState<number[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("product_favorites");
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch {
        setFavorites([]);
      }
    }
  }, []);

  const toggleFavorite = (productId: number) => {
    setFavorites((prev) => {
      const newFavorites = prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      localStorage.setItem("product_favorites", JSON.stringify(newFavorites));
      return newFavorites;
    });
  };

  const isFavorite = (productId: number) => favorites.includes(productId);

  const getFavoritesCount = () => favorites.length;

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite, getFavoritesCount }}>
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a FavoritesProvider");
  }
  return context;
};
