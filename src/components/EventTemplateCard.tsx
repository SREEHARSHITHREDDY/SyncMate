import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Clock, MoreVertical, Trash2, Edit, Play, Repeat } from "lucide-react";
import { EventTemplate } from "@/hooks/useEventTemplates";
import { CATEGORY_COLORS, CategoryType, getEventHex } from "@/lib/eventCategories";
import { cn } from "@/lib/utils";

interface EventTemplateCardProps {
  template: EventTemplate;
  onUse: (template: EventTemplate) => void;
  onEdit: (template: EventTemplate) => void;
  onDelete: (id: string) => void;
}

const priorityColors = {
  low: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  medium: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  high: "bg-red-500/10 text-red-600 border-red-500/30",
};

export function EventTemplateCard({ template, onUse, onEdit, onDelete }: EventTemplateCardProps) {
  // FIX 14: show category color on card border and badge
  const hex = getEventHex(template.category, null);
  const categoryLabel =
    template.category && CATEGORY_COLORS[template.category as CategoryType]
      ? CATEGORY_COLORS[template.category as CategoryType].label
      : null;

  return (
    <Card
      className="group hover:shadow-md transition-shadow"
      style={{ borderLeft: `3px solid ${hex}` }}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-medium truncate">{template.name}</h3>
              <Badge
                variant="outline"
                className={cn("shrink-0 text-xs", priorityColors[template.priority as keyof typeof priorityColors])}
              >
                {template.priority}
              </Badge>
              {/* FIX 14: category badge now shows */}
              {categoryLabel && (
                <Badge
                  variant="secondary"
                  className="shrink-0 text-xs text-white"
                  style={{ backgroundColor: hex + "cc" }}
                >
                  {categoryLabel}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{template.title}</p>
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {template.default_time.slice(0, 5)}
              </span>
              {template.recurrence_type && (
                <span className="flex items-center gap-1">
                  <Repeat className="h-3 w-3" />
                  {template.recurrence_type}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => onUse(template)}
            >
              <Play className="h-4 w-4 mr-1" />
              Use
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(template)}>
                  <Edit className="h-4 w-4 mr-2" />Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onDelete(template.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}