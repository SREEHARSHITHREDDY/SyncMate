import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Eye, EyeOff } from "lucide-react";

interface CompletedFilterProps {
  showCompleted: boolean;
  onChange: (show: boolean) => void;
}

export function CompletedFilter({ showCompleted, onChange }: CompletedFilterProps) {
  return (
    <Button
      variant={showCompleted ? "secondary" : "outline"}
      size="sm"
      className="gap-2"
      onClick={() => onChange(!showCompleted)}
    >
      {showCompleted ? (
        <>
          <Eye className="h-4 w-4" />
          Showing completed
        </>
      ) : (
        <>
          <EyeOff className="h-4 w-4" />
          Hiding completed
        </>
      )}
    </Button>
  );
}
