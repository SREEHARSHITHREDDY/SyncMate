import React, { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserActionItems, UserActionItem, TaskPriority, TaskRecurrenceType } from "@/hooks/useUserActionItems";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  ListTodo, Clock, AlertTriangle, CheckCircle2, Search, 
  ArrowUpDown, Trash2, Calendar as CalendarIcon, SortAsc, SortDesc,
  RotateCcw, Pencil, History, Keyboard, GripVertical, Tag, Flag, Repeat
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isPast, isToday, isTomorrow, parseISO, differenceInDays } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TaskEditDialog } from "@/components/TaskEditDialog";
import { TagBadge, getTagColor } from "@/components/TagInput";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";


type FilterType = "all" | "overdue" | "today" | "upcoming" | "no-date";
type PriorityFilterType = "all" | TaskPriority;
type SortType = "custom" | "due-date" | "created" | "event" | "priority";
type SortDirection = "asc" | "desc";
type TabType = "active" | "completed";

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string; bgColor: string }> = {
  high: { label: "High", color: "text-priority-high", bgColor: "bg-priority-high" },
  medium: { label: "Medium", color: "text-priority-medium", bgColor: "bg-priority-medium" },
  low: { label: "Low", color: "text-priority-low", bgColor: "bg-priority-low" },
};

const RECURRENCE_LABELS: Record<string, string> = {
  daily: "Repeats daily",
  weekly: "Repeats weekly",
  monthly: "Repeats monthly",
};

export default function MyTasks() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { actionItems, completedItems, allTags, isLoading, overdueCount, totalCount, completedCount } = useUserActionItems(true);
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [filter, setFilter] = useState<FilterType>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilterType>("all");
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortType>("custom");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<UserActionItem | null>(null);
  const [localItems, setLocalItems] = useState<UserActionItem[]>([]);
  const queryClient = useQueryClient();

  // DnD Sensors - use delay constraint to prevent interfering with quick clicks
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 150,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // ALL useCallback hooks MUST be before conditional returns
  const toggleSelectAll = useCallback(() => {
    setSelectedItems(prev => {
      if (prev.size > 0) {
        return new Set();
      }
      return new Set(localItems.map(item => item.id));
    });
  }, [localItems]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // ALL useEffect hooks MUST be before conditional returns
  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  // Keep local items in sync with server items
  useEffect(() => {
    if (activeTab === "active") {
      setLocalItems(actionItems);
    } else {
      setLocalItems(completedItems);
    }
  }, [actionItems, completedItems, activeTab]);

  // Clear selection when switching tabs
  useEffect(() => {
    setSelectedItems(new Set());
    setTagFilter(null);
    setPriorityFilter("all");
  }, [activeTab]);

  // Keyboard shortcuts - only listen when component is actually mounted and visible
  useEffect(() => {
    // Don't attach listeners if user is not authenticated
    if (!user) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        if (e.key !== "Escape") return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === "a" && !e.shiftKey) {
        e.preventDefault();
        toggleSelectAll();
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        clearSelection();
        return;
      }

      if ((e.key === "Delete" || e.key === "Backspace") && selectedItems.size > 0) {
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault();
          setShowBulkDeleteDialog(true);
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [user, toggleSelectAll, clearSelection, selectedItems]);

  if (authLoading) {
    return null;
  }

  if (!user) {
    return null;
  }

  // Calculate counts for each filter
  const dueTodayCount = actionItems.filter(item => {
    if (!item.due_date) return false;
    return isToday(parseISO(item.due_date));
  }).length;

  const upcomingCount = actionItems.filter(item => {
    if (!item.due_date) return false;
    const date = parseISO(item.due_date);
    return !isPast(date) && !isToday(date);
  }).length;

  const noDateCount = actionItems.filter(item => !item.due_date).length;

  const getDueDateInfo = (dueDate: string | null) => {
    if (!dueDate) return null;
    
    const date = parseISO(dueDate);
    const isOverdue = isPast(date) && !isToday(date);
    const daysUntil = differenceInDays(date, new Date());
    
    let label = format(date, "MMM d, yyyy");
    if (isToday(date)) {
      label = "Today";
    } else if (isTomorrow(date)) {
      label = "Tomorrow";
    } else if (isOverdue) {
      const daysOverdue = Math.abs(daysUntil);
      label = daysOverdue === 1 ? "1 day overdue" : `${daysOverdue} days overdue`;
    }
    
    return {
      label,
      isOverdue,
      isUrgent: daysUntil <= 1 && daysUntil >= 0,
      isToday: isToday(date),
    };
  };

  // Priority counts
  const highPriorityCount = actionItems.filter(item => item.priority === "high").length;
  const mediumPriorityCount = actionItems.filter(item => item.priority === "medium").length;
  const lowPriorityCount = actionItems.filter(item => item.priority === "low").length;

  // Filter items
  const filteredItems = localItems.filter(item => {
    // Search filter
    if (searchQuery && !item.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.event_title?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Priority filter
    if (priorityFilter !== "all" && item.priority !== priorityFilter) {
      return false;
    }

    // Tag filter
    if (tagFilter && !item.tags?.includes(tagFilter)) {
      return false;
    }

    // Status filter (only applies to active items)
    if (activeTab === "completed") return true;

    switch (filter) {
      case "overdue":
        if (!item.due_date) return false;
        const overdueDate = parseISO(item.due_date);
        return isPast(overdueDate) && !isToday(overdueDate);
      case "today":
        if (!item.due_date) return false;
        return isToday(parseISO(item.due_date));
      case "upcoming":
        if (!item.due_date) return false;
        const upcomingDate = parseISO(item.due_date);
        return !isPast(upcomingDate) && !isToday(upcomingDate);
      case "no-date":
        return !item.due_date;
      default:
        return true;
    }
  });

  // Sort items
  const sortedItems = sortBy === "custom" 
    ? filteredItems 
    : [...filteredItems].sort((a, b) => {
        let comparison = 0;
        const priorityOrder: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };
        
        switch (sortBy) {
          case "due-date":
            if (!a.due_date && !b.due_date) comparison = 0;
            else if (!a.due_date) comparison = 1;
            else if (!b.due_date) comparison = -1;
            else comparison = new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
            break;
          case "created":
            comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            break;
          case "event":
            comparison = (a.event_title || "").localeCompare(b.event_title || "");
            break;
          case "priority":
            comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
            break;
        }
        
        return sortDirection === "desc" ? -comparison : comparison;
      });

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = localItems.findIndex(item => item.id === active.id);
    const newIndex = localItems.findIndex(item => item.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;

    // Optimistically update local state
    const newItems = arrayMove(localItems, oldIndex, newIndex);
    setLocalItems(newItems);

    // Update sort_order in database
    try {
      const updates = newItems.map((item, index) => ({
        id: item.id,
        sort_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from("action_items")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);
      }

      toast.success("Task order updated");
    } catch (error) {
      // Revert on error
      setLocalItems(activeTab === "active" ? actionItems : completedItems);
      toast.error("Failed to update task order");
    }
  };

  const handleToggleComplete = async (item: UserActionItem) => {
    setProcessingIds(prev => new Set(prev).add(item.id));
    try {
      const { error } = await supabase
        .from("action_items")
        .update({ is_completed: true })
        .eq("id", item.id);

      if (error) throw error;
      
      toast.success("Task completed!");
      setSelectedItems(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["user-action-items", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["action-items"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to complete task");
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleRestoreItem = async (item: UserActionItem) => {
    setProcessingIds(prev => new Set(prev).add(item.id));
    try {
      const { error } = await supabase
        .from("action_items")
        .update({ is_completed: false })
        .eq("id", item.id);

      if (error) throw error;
      
      toast.success("Task restored!");
      setSelectedItems(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["user-action-items", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["action-items"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to restore task");
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleBulkComplete = async () => {
    const ids = Array.from(selectedItems);
    setProcessingIds(new Set(ids));
    
    try {
      const { error } = await supabase
        .from("action_items")
        .update({ is_completed: true })
        .in("id", ids);

      if (error) throw error;
      
      toast.success(`${ids.length} task(s) completed!`);
      setSelectedItems(new Set());
      queryClient.invalidateQueries({ queryKey: ["user-action-items", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["action-items"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to complete tasks");
    } finally {
      setProcessingIds(new Set());
    }
  };

  const handleBulkRestore = async () => {
    const ids = Array.from(selectedItems);
    setProcessingIds(new Set(ids));
    
    try {
      const { error } = await supabase
        .from("action_items")
        .update({ is_completed: false })
        .in("id", ids);

      if (error) throw error;
      
      toast.success(`${ids.length} task(s) restored!`);
      setSelectedItems(new Set());
      queryClient.invalidateQueries({ queryKey: ["user-action-items", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["action-items"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to restore tasks");
    } finally {
      setProcessingIds(new Set());
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedItems);
    
    try {
      const { error } = await supabase
        .from("action_items")
        .delete()
        .in("id", ids);

      if (error) throw error;
      
      toast.success(`${ids.length} task(s) deleted!`);
      setSelectedItems(new Set());
      setShowBulkDeleteDialog(false);
      queryClient.invalidateQueries({ queryKey: ["user-action-items", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["action-items"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete tasks");
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };


  return (
    <AppLayout>
      <div className="container py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
            <p className="text-muted-foreground">
              Manage all your action items across events
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="gap-1">
              <ListTodo className="h-3 w-3" />
              {totalCount} active
            </Badge>
            {overdueCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {overdueCount} overdue
              </Badge>
            )}
            {dueTodayCount > 0 && (
              <Badge variant="default" className="gap-1">
                <Clock className="h-3 w-3" />
                {dueTodayCount} due today
              </Badge>
            )}
            {completedCount > 0 && (
              <Badge variant="outline" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {completedCount} completed
              </Badge>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="space-y-4">
          <TabsList>
            <TabsTrigger value="active" className="gap-1.5">
              <ListTodo className="h-4 w-4" />
              Active ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="completed" className="gap-1.5">
              <History className="h-4 w-4" />
              Completed ({completedCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {/* Filters and Search */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Filter Toggles */}
                  <div className="flex flex-wrap items-center gap-4">
                    <ToggleGroup 
                      type="single" 
                      value={filter} 
                      onValueChange={(value) => value && setFilter(value as FilterType)}
                      className="flex-wrap justify-start"
                    >
                      <ToggleGroupItem value="all" size="sm" className="text-xs gap-1.5 px-3">
                        <ListTodo className="h-3.5 w-3.5" />
                        All ({totalCount})
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="overdue" 
                        size="sm" 
                        className={cn(
                          "text-xs gap-1.5 px-3",
                          overdueCount > 0 && "data-[state=on]:bg-destructive data-[state=on]:text-destructive-foreground"
                        )}
                        disabled={overdueCount === 0}
                      >
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Overdue ({overdueCount})
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="today" 
                        size="sm" 
                        className="text-xs gap-1.5 px-3"
                        disabled={dueTodayCount === 0}
                      >
                        <CalendarIcon className="h-3.5 w-3.5" />
                        Due Today ({dueTodayCount})
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="upcoming" 
                        size="sm" 
                        className="text-xs gap-1.5 px-3"
                        disabled={upcomingCount === 0}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        Upcoming ({upcomingCount})
                      </ToggleGroupItem>
                      <ToggleGroupItem 
                        value="no-date" 
                        size="sm" 
                        className="text-xs gap-1.5 px-3"
                        disabled={noDateCount === 0}
                      >
                        No Date ({noDateCount})
                      </ToggleGroupItem>
                    </ToggleGroup>

                    <div className="flex items-center gap-2 ml-auto">
                      <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortType)}>
                        <SelectTrigger className="w-[140px] h-8">
                          <ArrowUpDown className="h-3.5 w-3.5 mr-2" />
                          <SelectValue placeholder="Sort by" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="custom">Custom Order</SelectItem>
                          <SelectItem value="due-date">Due Date</SelectItem>
                          <SelectItem value="priority">Priority</SelectItem>
                          <SelectItem value="created">Created</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                        </SelectContent>
                      </Select>
                      {sortBy !== "custom" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSortDirection(prev => prev === "asc" ? "desc" : "asc")}
                          className="h-8 w-8 p-0"
                        >
                          {sortDirection === "asc" ? (
                            <SortAsc className="h-4 w-4" />
                          ) : (
                            <SortDesc className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Priority Filter */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Flag className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Priority:</span>
                    <Button
                      variant={priorityFilter === "all" ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setPriorityFilter("all")}
                      className="h-6 text-xs"
                    >
                      All
                    </Button>
                    {(Object.entries(PRIORITY_CONFIG) as [TaskPriority, typeof PRIORITY_CONFIG[TaskPriority]][]).map(([value, config]) => (
                      <Button
                        key={value}
                        variant={priorityFilter === value ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setPriorityFilter(priorityFilter === value ? "all" : value)}
                        className={cn("h-6 text-xs gap-1.5", priorityFilter === value && config.color)}
                      >
                        <div className={cn("h-2 w-2 rounded-full", config.bgColor)} />
                        {config.label} ({value === "high" ? highPriorityCount : value === "medium" ? mediumPriorityCount : lowPriorityCount})
                      </Button>
                    ))}
                  </div>

                  {/* Tag Filter */}
                  {allTags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Filter by tag:</span>
                      <Button
                        variant={tagFilter === null ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setTagFilter(null)}
                        className="h-6 text-xs"
                      >
                        All
                      </Button>
                      {allTags.map(tag => (
                        <Button
                          key={tag}
                          variant={tagFilter === tag ? "secondary" : "ghost"}
                          size="sm"
                          onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                          className={cn("h-6 text-xs gap-1", tagFilter === tag && getTagColor(tag))}
                        >
                          <Tag className="h-3 w-3" />
                          {tag}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Bulk Actions */}
            {selectedItems.size > 0 && (
              <Card className="border-primary/50 bg-primary/5 animate-fade-in">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-sm font-medium">
                      {selectedItems.size} task(s) selected
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground mr-2">
                        <Keyboard className="h-3.5 w-3.5" />
                        <span>⌘A select all • Esc clear • ⌘↵ complete • Del delete</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedItems(new Set())}
                      >
                        Clear
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleBulkComplete}
                        disabled={processingIds.size > 0}
                        className="gap-1.5"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Complete
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowBulkDeleteDialog(true)}
                        className="gap-1.5"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Task List with Drag and Drop */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Tasks</CardTitle>
                    <CardDescription>
                      {sortedItems.length} task{sortedItems.length !== 1 ? "s" : ""} shown
                      {sortBy === "custom" && " • Drag to reorder"}
                    </CardDescription>
                  </div>
                  {sortedItems.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleSelectAll}
                      className="text-xs"
                    >
                      {selectedItems.size === sortedItems.length ? "Deselect All" : "Select All"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    Loading tasks...
                  </div>
                ) : sortedItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mb-3 text-primary/30" />
                    <p className="text-lg font-medium">
                      {filter === "all" && !searchQuery && !tagFilter ? "No tasks assigned to you" : "No matching tasks"}
                    </p>
                    <p className="text-sm">
                      {filter === "overdue" ? "Great job! No overdue tasks." : 
                       filter === "today" ? "Nothing due today." :
                       tagFilter ? `No tasks with tag "${tagFilter}".` :
                       searchQuery ? "Try a different search term." :
                       "Action items will appear here when assigned."}
                    </p>
                  </div>
                ) : sortBy === "custom" ? (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={sortedItems.map(item => item.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {sortedItems.map((item) => (
                          <SortableTaskItem
                            key={item.id}
                            item={item}
                            isSelected={selectedItems.has(item.id)}
                            isProcessing={processingIds.has(item.id)}
                            isDraggable={true}
                            onToggleSelect={() => toggleSelectItem(item.id)}
                            onComplete={() => handleToggleComplete(item)}
                            onEdit={() => setEditingItem(item)}
                            getDueDateInfo={getDueDateInfo}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <div className="space-y-2">
                    {sortedItems.map((item) => (
                      <SortableTaskItem
                        key={item.id}
                        item={item}
                        isSelected={selectedItems.has(item.id)}
                        isProcessing={processingIds.has(item.id)}
                        isDraggable={false}
                        onToggleSelect={() => toggleSelectItem(item.id)}
                        onComplete={() => handleToggleComplete(item)}
                        onEdit={() => setEditingItem(item)}
                        getDueDateInfo={getDueDateInfo}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            {/* Search for completed */}
            <Card>
              <CardContent className="pt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search completed tasks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Bulk Actions for Completed */}
            {selectedItems.size > 0 && (
              <Card className="border-primary/50 bg-primary/5 animate-fade-in">
                <CardContent className="py-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-sm font-medium">
                      {selectedItems.size} task(s) selected
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedItems(new Set())}
                      >
                        Clear
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={handleBulkRestore}
                        disabled={processingIds.size > 0}
                        className="gap-1.5"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Restore
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setShowBulkDeleteDialog(true)}
                        className="gap-1.5"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Completed Task List */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Completed Tasks</CardTitle>
                  {sortedItems.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleSelectAll}
                      className="text-xs"
                    >
                      {selectedItems.size === sortedItems.length ? "Deselect All" : "Select All"}
                    </Button>
                  )}
                </div>
                <CardDescription>
                  {sortedItems.length} task{sortedItems.length !== 1 ? "s" : ""} shown
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    Loading tasks...
                  </div>
                ) : sortedItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <CheckCircle2 className="h-12 w-12 mb-3 text-primary/30" />
                    <p className="text-lg font-medium">No completed tasks yet</p>
                    <p className="text-sm">Completed tasks will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {sortedItems.map((item) => {
                      const dueDateInfo = getDueDateInfo(item.due_date);
                      const isSelected = selectedItems.has(item.id);
                      const isProcessing = processingIds.has(item.id);
                      
                      return (
                        <div
                          key={item.id}
                          className={cn(
                            "flex items-start gap-3 p-4 rounded-lg border bg-card transition-all group",
                            isSelected && "ring-2 ring-primary/50",
                            "hover:bg-accent/30"
                          )}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectItem(item.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium leading-tight line-through text-muted-foreground">
                              {item.content}
                            </p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Link 
                                to="/calendar" 
                                className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
                              >
                                <CalendarIcon className="h-3 w-3" />
                                {item.event_title}
                              </Link>
                              {dueDateInfo && (
                                <Badge variant="secondary" className="text-xs px-2 py-0.5 gap-1">
                                  <Clock className="h-3 w-3" />
                                  {dueDateInfo.label}
                                </Badge>
                              )}
                              {item.tags?.map(tag => (
                                <TagBadge key={tag} tag={tag} />
                              ))}
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRestoreItem(item)}
                            disabled={isProcessing}
                            className="gap-1.5"
                          >
                            {isProcessing ? (
                              <RotateCcw className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <RotateCcw className="h-4 w-4" />
                                <span className="hidden sm:inline">Restore</span>
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedItems.size} task(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected tasks will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Task Dialog */}
      <TaskEditDialog
        item={editingItem}
        open={!!editingItem}
        onOpenChange={(open) => !open && setEditingItem(null)}
        allTags={allTags}
      />
    </AppLayout>
  );
}

// Sortable Task Item Component
interface SortableTaskItemProps {
  item: UserActionItem;
  isSelected: boolean;
  isProcessing: boolean;
  isDraggable: boolean;
  onToggleSelect: () => void;
  onComplete: () => void;
  onEdit: () => void;
  getDueDateInfo: (dueDate: string | null) => { label: string; isOverdue: boolean; isUrgent: boolean; isToday: boolean } | null;
}

function SortableTaskItem({
  item,
  isSelected,
  isProcessing,
  isDraggable,
  onToggleSelect,
  onComplete,
  onEdit,
  getDueDateInfo,
}: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !isDraggable });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dueDateInfo = getDueDateInfo(item.due_date);

  const priorityConfig = PRIORITY_CONFIG[item.priority];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-start gap-3 p-4 rounded-lg border bg-card transition-all group",
        item.priority === "high" && "border-l-4 border-l-priority-high",
        item.priority === "medium" && "border-l-4 border-l-priority-medium",
        item.priority === "low" && "border-l-4 border-l-priority-low",
        dueDateInfo?.isOverdue && "border-destructive/50 bg-destructive/5",
        dueDateInfo?.isToday && !dueDateInfo?.isOverdue && "border-primary/50 bg-primary/5",
        isSelected && "ring-2 ring-primary/50",
        isDragging && "opacity-50 shadow-lg",
        "hover:bg-accent/30"
      )}
    >
      {isDraggable && (
        <button
          data-drag-handle
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing touch-none p-1 -ml-1 text-muted-foreground hover:text-foreground"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <Checkbox
        checked={isSelected}
        onCheckedChange={onToggleSelect}
        className="mt-1"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn(
            "font-medium leading-tight",
            isProcessing && "line-through text-muted-foreground"
          )}>
            {item.content}
          </p>
          <Tooltip>
            <TooltipTrigger asChild>
              <Flag className={cn("h-4 w-4 shrink-0", priorityConfig.color)} />
            </TooltipTrigger>
            <TooltipContent>{priorityConfig.label} priority</TooltipContent>
          </Tooltip>
          {item.recurrence_type && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Repeat className="h-4 w-4 shrink-0 text-primary" />
              </TooltipTrigger>
              <TooltipContent>{RECURRENCE_LABELS[item.recurrence_type]}</TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <Link 
            to="/calendar" 
            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            <CalendarIcon className="h-3 w-3" />
            {item.event_title}
          </Link>
          {dueDateInfo && (
            <Badge 
              variant={dueDateInfo.isOverdue ? "destructive" : dueDateInfo.isToday ? "default" : "secondary"}
              className="text-xs px-2 py-0.5 gap-1"
            >
              <Clock className="h-3 w-3" />
              {dueDateInfo.label}
            </Badge>
          )}
          {!item.due_date && (
            <Badge variant="outline" className="text-xs px-2 py-0.5">
              No due date
            </Badge>
          )}
          {item.recurrence_type && (
            <Badge variant="secondary" className="text-xs px-2 py-0.5 gap-1">
              <Repeat className="h-3 w-3" />
              {item.recurrence_type.charAt(0).toUpperCase() + item.recurrence_type.slice(1)}
            </Badge>
          )}
          {item.tags?.map(tag => (
            <TagBadge key={tag} tag={tag} />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onEdit}
              className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit task</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onComplete}
              disabled={isProcessing}
              className="gap-1.5"
            >
              {isProcessing ? (
                <CheckCircle2 className="h-4 w-4 animate-pulse text-primary" />
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Complete</span>
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>Mark as complete</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
