import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { EventWithResponse } from "@/hooks/useEvents";
import { getCategoryColor } from "@/lib/eventCategories";

interface DraggableEventProps {
  event: EventWithResponse & { isCancelled?: boolean };
  style?: React.CSSProperties;
  onEventClick?: (event: EventWithResponse) => void;
  compact?: boolean;
}

export function DraggableEvent({ event, style, onEventClick, compact = false }: DraggableEventProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: event.id,
    data: { event },
  });

  const isInactive = event.isCancelled || event.is_completed;
  const categoryColor = getCategoryColor((event as any).category);

  const dragStyle = {
    ...style,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? "grabbing" : "grab",
    zIndex: isDragging ? 1000 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEventClick?.(event);
  };

  if (compact) {
    return (
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        onClick={handleClick}
        style={dragStyle}
        className={`text-[10px] font-medium truncate cursor-grab active:cursor-grabbing text-white px-1 py-0.5 rounded transition-opacity hover:opacity-80 ${categoryColor} ${isInactive ? "opacity-50 line-through" : ""}`}
      >
        {event.title}
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      style={dragStyle}
      className={`rounded px-2 py-1 border-l-4 cursor-grab active:cursor-grabbing transition-opacity hover:opacity-80 ${categoryColor} ${isInactive ? "opacity-50" : ""}`}
    >
      <div className={`text-white text-sm font-medium ${isInactive ? "line-through" : ""}`}>
        {event.event_time.slice(0, 5)}
      </div>
      <div className={`text-white text-sm font-semibold ${isInactive ? "line-through" : ""}`}>
        {event.title}
      </div>
      {event.description && (
        <div className="text-white/80 text-xs truncate">{event.description}</div>
      )}
    </div>
  );
}
