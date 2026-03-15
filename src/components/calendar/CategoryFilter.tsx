import { Button } from "@/components/ui/button";
import { CATEGORY_COLORS, CategoryType } from "@/lib/eventCategories";
import { Check } from "lucide-react";

interface CategoryFilterProps {
  selectedCategories: CategoryType[];
  onCategoryToggle: (category: CategoryType) => void;
  // FIX: added onClearAll prop.
  // Old "All" button called selectedCategories.forEach(onCategoryToggle) which
  // collapses React state updates — only the last category was ever removed.
  // Now the parent passes a direct setState([]) call so it works correctly.
  onClearAll: () => void;
}

export function CategoryFilter({ selectedCategories, onCategoryToggle, onClearAll }: CategoryFilterProps) {
  const allSelected = selectedCategories.length === 0;

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={allSelected ? "default" : "outline"}
        size="sm"
        onClick={onClearAll}
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