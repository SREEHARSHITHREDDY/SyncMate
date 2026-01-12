import { Button } from "@/components/ui/button";
import { CATEGORY_COLORS, CategoryType } from "@/lib/eventCategories";
import { Check } from "lucide-react";

interface CategoryFilterProps {
  selectedCategories: CategoryType[];
  onCategoryToggle: (category: CategoryType) => void;
}

export function CategoryFilter({ selectedCategories, onCategoryToggle }: CategoryFilterProps) {
  const allSelected = selectedCategories.length === 0;

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={allSelected ? "default" : "outline"}
        size="sm"
        onClick={() => {
          // Clear all filters (show all)
          selectedCategories.forEach(cat => onCategoryToggle(cat));
        }}
        className="text-xs"
      >
        All
      </Button>
      {Object.entries(CATEGORY_COLORS).map(([key, { label, color }]) => {
        const isSelected = selectedCategories.includes(key as CategoryType);
        return (
          <Button
            key={key}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => onCategoryToggle(key as CategoryType)}
            className="text-xs gap-1.5"
          >
            <div className={`h-2 w-2 rounded-full ${color}`} />
            {label}
            {isSelected && <Check className="h-3 w-3" />}
          </Button>
        );
      })}
    </div>
  );
}
