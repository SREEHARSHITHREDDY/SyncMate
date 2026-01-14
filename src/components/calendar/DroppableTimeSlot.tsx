import { useDroppable } from "@dnd-kit/core";
import { ReactNode } from "react";

interface DroppableTimeSlotProps {
  id: string;
  date: Date;
  hour: number;
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function DroppableTimeSlot({ id, date, hour, children, className, onClick }: DroppableTimeSlotProps) {
  const { isOver, setNodeRef } = useDroppable({
    id,
    data: { date, hour },
  });

  return (
    <div
      ref={setNodeRef}
      onClick={onClick}
      className={`${className} ${isOver ? "bg-primary/20 ring-2 ring-primary/50" : ""} transition-colors`}
    >
      {children}
    </div>
  );
}
