export type CategoryType = "default" | "work" | "personal" | "social" | "health" | "travel" | "education";

export const CATEGORY_COLORS: Record<CategoryType, { label: string; color: string; bgColor: string }> = {
  default: {
    label: "Default",
    color: "bg-gray-500",
    bgColor: "bg-gray-500/90",
  },
  work: {
    label: "Work",
    color: "bg-blue-500",
    bgColor: "bg-blue-500/90",
  },
  personal: {
    label: "Personal",
    color: "bg-purple-500",
    bgColor: "bg-purple-500/90",
  },
  social: {
    label: "Social",
    color: "bg-green-500",
    bgColor: "bg-green-500/90",
  },
  health: {
    label: "Health",
    color: "bg-red-500",
    bgColor: "bg-red-500/90",
  },
  travel: {
    label: "Travel",
    color: "bg-orange-500",
    bgColor: "bg-orange-500/90",
  },
  education: {
    label: "Education",
    color: "bg-cyan-500",
    bgColor: "bg-cyan-500/90",
  },
};

export const getCategoryColor = (category: string | null | undefined): string => {
  const cat = (category || "default") as CategoryType;
  return CATEGORY_COLORS[cat]?.bgColor || CATEGORY_COLORS.default.bgColor;
};

export const getCategoryDotColor = (category: string | null | undefined): string => {
  const cat = (category || "default") as CategoryType;
  return CATEGORY_COLORS[cat]?.color || CATEGORY_COLORS.default.color;
};
