// Auto-categorization rules based on product attributes
interface CategoryRule {
  keywords: string[];
  category: string;
  priority: number;
}

const CATEGORY_RULES: CategoryRule[] = [
  // Caps/Packaging
  { keywords: ["tampa de bambu", "bambu", "bamboo"], category: "Tampa de Bambu", priority: 10 },
  { keywords: ["tampa de madeira", "wood cap"], category: "Tampa de Madeira", priority: 10 },
  { keywords: ["tampa de metal", "metal cap"], category: "Tampa de Metal", priority: 10 },
  { keywords: ["tampa de cortiça", "cork"], category: "Tampa de Cortiça", priority: 10 },
  { keywords: ["vidro", "glass"], category: "Embalagem de Vidro", priority: 8 },
  { keywords: ["pet", "plástico", "plastic"], category: "Embalagem Plástica", priority: 8 },
  { keywords: ["sachê", "sachet", "envelope"], category: "Sachês", priority: 8 },
  { keywords: ["refil", "refill"], category: "Refis", priority: 9 },
  
  // Product Types
  { keywords: ["chá", "tea", "infusão", "infusion"], category: "Chás", priority: 7 },
  { keywords: ["erva", "herb", "ervas finas"], category: "Ervas", priority: 7 },
  { keywords: ["tempero", "spice", "seasoning"], category: "Temperos", priority: 6 },
  { keywords: ["sal", "salt"], category: "Sais", priority: 7 },
  { keywords: ["pimenta", "pepper", "chili"], category: "Pimentas", priority: 7 },
  { keywords: ["curry", "açafrão", "turmeric", "cúrcuma"], category: "Especiarias", priority: 7 },
  { keywords: ["mix", "blend", "mistura"], category: "Blends", priority: 6 },
  { keywords: ["kit", "combo", "conjunto"], category: "Kits", priority: 9 },
  { keywords: ["presente", "gift", "lembrança"], category: "Presentes", priority: 9 },
  
  // Dietary
  { keywords: ["orgânico", "organic", "bio"], category: "Orgânicos", priority: 8 },
  { keywords: ["vegano", "vegan", "plant-based"], category: "Veganos", priority: 8 },
  { keywords: ["sem glúten", "gluten-free", "gluten free"], category: "Sem Glúten", priority: 8 },
  { keywords: ["low carb", "keto", "cetogênico"], category: "Low Carb", priority: 8 },
  { keywords: ["integral", "whole grain"], category: "Integrais", priority: 7 },
  
  // Usage
  { keywords: ["churrasco", "bbq", "barbecue"], category: "Para Churrasco", priority: 6 },
  { keywords: ["salada", "salad"], category: "Para Saladas", priority: 6 },
  { keywords: ["carne", "meat"], category: "Para Carnes", priority: 6 },
  { keywords: ["peixe", "fish", "frutos do mar"], category: "Para Peixes", priority: 6 },
  { keywords: ["massas", "pasta"], category: "Para Massas", priority: 6 },
  { keywords: ["sobremesa", "dessert", "doce"], category: "Para Sobremesas", priority: 6 },
];

export interface AutoCategorySuggestion {
  category: string;
  confidence: number;
  matchedKeywords: string[];
}

export const suggestCategories = (
  productName: string,
  description: string = "",
  badges: string[] = [],
  variations: { name: string; variation_type: string }[] = []
): AutoCategorySuggestion[] => {
  const searchText = [
    productName,
    description,
    ...badges,
    ...variations.map((v) => `${v.name} ${v.variation_type}`),
  ]
    .join(" ")
    .toLowerCase();

  const suggestions: AutoCategorySuggestion[] = [];

  for (const rule of CATEGORY_RULES) {
    const matchedKeywords: string[] = [];
    
    for (const keyword of rule.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
      }
    }

    if (matchedKeywords.length > 0) {
      const confidence = Math.min(
        100,
        (matchedKeywords.length / rule.keywords.length) * 100 * (rule.priority / 10)
      );

      suggestions.push({
        category: rule.category,
        confidence: Math.round(confidence),
        matchedKeywords,
      });
    }
  }

  // Sort by confidence descending
  return suggestions.sort((a, b) => b.confidence - a.confidence);
};

export const getPrimaryCategory = (
  productName: string,
  description: string = "",
  badges: string[] = [],
  variations: { name: string; variation_type: string }[] = []
): string | null => {
  const suggestions = suggestCategories(productName, description, badges, variations);
  return suggestions.length > 0 ? suggestions[0].category : null;
};

export const AVAILABLE_CATEGORIES = [
  "Tampa de Bambu",
  "Tampa de Madeira",
  "Tampa de Metal",
  "Tampa de Cortiça",
  "Embalagem de Vidro",
  "Embalagem Plástica",
  "Sachês",
  "Refis",
  "Chás",
  "Ervas",
  "Temperos",
  "Sais",
  "Pimentas",
  "Especiarias",
  "Blends",
  "Kits",
  "Presentes",
  "Orgânicos",
  "Veganos",
  "Sem Glúten",
  "Low Carb",
  "Integrais",
  "Para Churrasco",
  "Para Saladas",
  "Para Carnes",
  "Para Peixes",
  "Para Massas",
  "Para Sobremesas",
];

export default {
  suggestCategories,
  getPrimaryCategory,
  AVAILABLE_CATEGORIES,
};
