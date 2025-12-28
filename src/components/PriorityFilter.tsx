import { Button } from "@/components/ui/button";
import { Filter } from "lucide-react";

type Priority = "all" | "low" | "medium" | "high";

interface PriorityFilterProps {
  value: Priority;
  onChange: (priority: Priority) => void;
}

export function PriorityFilter({ value, onChange }: PriorityFilterProps) {
  const priorities: { value: Priority; label: string; color?: string }[] = [
    { value: "all", label: "All" },
    { value: "low", label: "Low", color: "bg-priority-low" },
    { value: "medium", label: "Medium", color: "bg-priority-medium" },
    { value: "high", label: "High", color: "bg-priority-high" },
  ];

  return (
    <div className="flex items-center gap-2">
      <Filter className="h-4 w-4 text-muted-foreground" />
      <div className="flex gap-1">
        {priorities.map((p) => (
          <Button
            key={p.value}
            variant={value === p.value ? "default" : "outline"}
            size="sm"
            onClick={() => onChange(p.value)}
            className="gap-1.5"
          >
            {p.color && <div className={`h-2 w-2 rounded-full ${p.color}`} />}
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
