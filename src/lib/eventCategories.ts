// Each category has:
// - label: display name
// - color: Tailwind dot class (for small indicators)
// - bgColor: Tailwind bg class (for event blocks)
// - hex: actual hex value used for custom color overrides on calendar blocks

export type CategoryType =
  | "general"
  | "class"
  | "exam"
  | "meeting"
  | "personal"
  | "work"
  | "health"
  | "travel";

export const CATEGORY_COLORS: Record<
  CategoryType,
  { label: string; color: string; bgColor: string; hex: string }
> = {
  general: {
    label: "General",
    color: "bg-gray-500",
    bgColor: "bg-gray-500",
    hex: "#6b7280",
  },
  class: {
    label: "Class / Lecture",
    color: "bg-blue-500",
    bgColor: "bg-blue-500",
    hex: "#3b82f6",
  },
  exam: {
    label: "Exam / Test",
    color: "bg-red-500",
    bgColor: "bg-red-500",
    hex: "#ef4444",
  },
  meeting: {
    label: "Meeting / Call",
    color: "bg-violet-500",
    bgColor: "bg-violet-500",
    hex: "#8b5cf6",
  },
  personal: {
    label: "Personal / Social",
    color: "bg-pink-500",
    bgColor: "bg-pink-500",
    hex: "#ec4899",
  },
  work: {
    label: "Work / Project",
    color: "bg-amber-500",
    bgColor: "bg-amber-500",
    hex: "#f59e0b",
  },
  health: {
    label: "Health / Fitness",
    color: "bg-green-500",
    bgColor: "bg-green-500",
    hex: "#22c55e",
  },
  travel: {
    label: "Travel",
    color: "bg-orange-500",
    bgColor: "bg-orange-500",
    hex: "#f97316",
  },
};

// Preset color palette for manual color picker (12 colors)
export const COLOR_PALETTE = [
  { hex: "#3b82f6", label: "Blue" },
  { hex: "#ef4444", label: "Red" },
  { hex: "#22c55e", label: "Green" },
  { hex: "#f59e0b", label: "Amber" },
  { hex: "#8b5cf6", label: "Violet" },
  { hex: "#ec4899", label: "Pink" },
  { hex: "#f97316", label: "Orange" },
  { hex: "#06b6d4", label: "Cyan" },
  { hex: "#84cc16", label: "Lime" },
  { hex: "#6b7280", label: "Gray" },
  { hex: "#0f172a", label: "Dark" },
  { hex: "#7c3aed", label: "Purple" },
];

// Returns hex color for an event — custom color overrides category color
export const getEventHex = (
  category: string | null | undefined,
  customColor: string | null | undefined
): string => {
  if (customColor) return customColor;
  const cat = (category || "general") as CategoryType;
  return CATEGORY_COLORS[cat]?.hex || CATEGORY_COLORS.general.hex;
};

// Returns Tailwind bg class for category
export const getCategoryColor = (category: string | null | undefined): string => {
  const cat = (category || "general") as CategoryType;
  return CATEGORY_COLORS[cat]?.bgColor || CATEGORY_COLORS.general.bgColor;
};

// Returns Tailwind dot class for category
export const getCategoryDotColor = (category: string | null | undefined): string => {
  const cat = (category || "general") as CategoryType;
  return CATEGORY_COLORS[cat]?.color || CATEGORY_COLORS.general.color;
};

// Returns duration string from start + end time
export const getDurationLabel = (
  startTime: string,
  endTime: string | null | undefined
): string => {
  const [sh, sm] = startTime.split(":").map(Number);
  const startMins = sh * 60 + sm;

  let endMins: number;
  if (endTime) {
    const [eh, em] = endTime.split(":").map(Number);
    endMins = eh * 60 + em;
  } else {
    endMins = startMins + 60; // default 1hr
  }

  const diff = endMins - startMins;
  if (diff <= 0) return "1 hr";
  if (diff < 60) return `${diff} min`;
  if (diff === 60) return "1 hr";
  if (diff % 60 === 0) return `${diff / 60} hr`;
  return `${Math.floor(diff / 60)} hr ${diff % 60} min`;
};

// Returns pixel height for calendar block (1 min = 1px)
export const getEventHeightPx = (
  startTime: string,
  endTime: string | null | undefined,
  minHeight = 44
): number => {
  const [sh, sm] = startTime.split(":").map(Number);
  const startMins = sh * 60 + sm;

  let endMins: number;
  if (endTime) {
    const [eh, em] = endTime.split(":").map(Number);
    endMins = eh * 60 + em;
  } else {
    endMins = startMins + 60;
  }

  const diff = endMins - startMins;
  return Math.max(diff > 0 ? diff : 60, minHeight);
};