import { useState, useEffect, useCallback } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserActionItems, UserActionItem } from "@/hooks/useUserActionItems";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { 
  ListTodo, Clock, AlertTriangle, CheckCircle2, Search, 
  ArrowUpDown, Trash2, Calendar as CalendarIcon, SortAsc, SortDesc,
  RotateCcw, Pencil, History, Keyboard
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isPast, isToday, isTomorrow, parseISO, differenceInDays } from "date-fns";
import { Link } from "react-router-dom";
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

type FilterType = "all" | "overdue" | "today" | "upcoming" | "no-date";
type SortType = "due-date" | "created" | "event";
type SortDirection = "asc" | "desc";
type TabType = "active" | "completed";

export default function MyTasks() {
  const { actionItems, completedItems, isLoading, overdueCount, totalCount, completedCount } = useUserActionItems(true);
  const [activeTab, setActiveTab] = useState<TabType>("active");
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("due-date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<UserActionItem | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Current items based on active tab
  const currentItems = activeTab === "active" ? actionItems : completedItems;

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

  // Filter items (only for active tab)
  const filteredItems = currentItems.filter(item => {
    // Search filter
    if (searchQuery && !item.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.event_title?.toLowerCase().includes(searchQuery.toLowerCase())) {
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
  const sortedItems = [...filteredItems].sort((a, b) => {
    let comparison = 0;
    
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
    }
    
    return sortDirection === "desc" ? -comparison : comparison;
  });

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

  const toggleSelectAll = useCallback(() => {
    if (selectedItems.size === sortedItems.length && sortedItems.length > 0) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(sortedItems.map(item => item.id)));
    }
  }, [selectedItems.size, sortedItems]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        if (e.key !== "Escape") return;
      }

      // Cmd/Ctrl + A - Select All
      if ((e.metaKey || e.ctrlKey) && e.key === "a" && !e.shiftKey) {
        e.preventDefault();
        toggleSelectAll();
        return;
      }

      // Escape - Clear selection
      if (e.key === "Escape") {
        e.preventDefault();
        clearSelection();
        return;
      }

      // Delete/Backspace - Delete selected (when items are selected)
      if ((e.key === "Delete" || e.key === "Backspace") && selectedItems.size > 0) {
        // Only trigger if not in input
        if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
          e.preventDefault();
          setShowBulkDeleteDialog(true);
        }
        return;
      }

      // Cmd/Ctrl + Enter - Complete selected
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && selectedItems.size > 0) {
        e.preventDefault();
        if (activeTab === "active") {
          handleBulkComplete();
        } else {
          handleBulkRestore();
        }
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSelectAll, clearSelection, selectedItems, activeTab]);

  // Clear selection when switching tabs
  useEffect(() => {
    setSelectedItems(new Set());
  }, [activeTab]);

  return (
    <AppLayout>
      <div className="space-y-6">
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
                          <SelectItem value="due-date">Due Date</SelectItem>
                          <SelectItem value="created">Created</SelectItem>
                          <SelectItem value="event">Event</SelectItem>
                        </SelectContent>
                      </Select>
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
                    </div>
                  </div>
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

            {/* Task List */}
            <TaskList
              items={sortedItems}
              isLoading={isLoading}
              selectedItems={selectedItems}
              processingIds={processingIds}
              filter={filter}
              searchQuery={searchQuery}
              isCompleted={false}
              onToggleSelect={toggleSelectItem}
              onToggleSelectAll={toggleSelectAll}
              onComplete={handleToggleComplete}
              onRestore={handleRestoreItem}
              onEdit={setEditingItem}
              getDueDateInfo={getDueDateInfo}
            />
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
                      <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground mr-2">
                        <Keyboard className="h-3.5 w-3.5" />
                        <span>⌘A select all • Esc clear • ⌘↵ restore • Del delete</span>
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
            <TaskList
              items={sortedItems}
              isLoading={isLoading}
              selectedItems={selectedItems}
              processingIds={processingIds}
              filter="all"
              searchQuery={searchQuery}
              isCompleted={true}
              onToggleSelect={toggleSelectItem}
              onToggleSelectAll={toggleSelectAll}
              onComplete={handleToggleComplete}
              onRestore={handleRestoreItem}
              onEdit={setEditingItem}
              getDueDateInfo={getDueDateInfo}
            />
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
      />
    </AppLayout>
  );
}

// Task List Component
interface TaskListProps {
  items: UserActionItem[];
  isLoading: boolean;
  selectedItems: Set<string>;
  processingIds: Set<string>;
  filter: FilterType;
  searchQuery: string;
  isCompleted: boolean;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onComplete: (item: UserActionItem) => void;
  onRestore: (item: UserActionItem) => void;
  onEdit: (item: UserActionItem) => void;
  getDueDateInfo: (dueDate: string | null) => { label: string; isOverdue: boolean; isUrgent: boolean; isToday: boolean } | null;
}

function TaskList({
  items,
  isLoading,
  selectedItems,
  processingIds,
  filter,
  searchQuery,
  isCompleted,
  onToggleSelect,
  onToggleSelectAll,
  onComplete,
  onRestore,
  onEdit,
  getDueDateInfo,
}: TaskListProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{isCompleted ? "Completed Tasks" : "Tasks"}</CardTitle>
          {items.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSelectAll}
              className="text-xs"
            >
              {selectedItems.size === items.length ? "Deselect All" : "Select All"}
            </Button>
          )}
        </div>
        <CardDescription>
          {items.length} task{items.length !== 1 ? "s" : ""} shown
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            Loading tasks...
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mb-3 text-primary/30" />
            <p className="text-lg font-medium">
              {isCompleted 
                ? "No completed tasks yet"
                : filter === "all" && !searchQuery 
                  ? "No tasks assigned to you" 
                  : "No matching tasks"}
            </p>
            <p className="text-sm">
              {isCompleted
                ? "Completed tasks will appear here."
                : filter === "overdue" ? "Great job! No overdue tasks." : 
                  filter === "today" ? "Nothing due today." :
                  searchQuery ? "Try a different search term." :
                  "Action items will appear here when assigned."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => {
              const dueDateInfo = getDueDateInfo(item.due_date);
              const isSelected = selectedItems.has(item.id);
              const isProcessing = processingIds.has(item.id);
              
              return (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg border bg-card transition-all group",
                    !isCompleted && dueDateInfo?.isOverdue && "border-destructive/50 bg-destructive/5",
                    !isCompleted && dueDateInfo?.isToday && "border-primary/50 bg-primary/5",
                    isSelected && "ring-2 ring-primary/50",
                    "hover:bg-accent/30"
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelect(item.id)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "font-medium leading-tight",
                      (isCompleted || isProcessing) && "line-through text-muted-foreground"
                    )}>
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
                        <Badge 
                          variant={isCompleted ? "secondary" : dueDateInfo.isOverdue ? "destructive" : dueDateInfo.isToday ? "default" : "secondary"}
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
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!isCompleted && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(item)}
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit task</TooltipContent>
                      </Tooltip>
                    )}
                    {isCompleted ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRestore(item)}
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
                        </TooltipTrigger>
                        <TooltipContent>Restore task</TooltipContent>
                      </Tooltip>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onComplete(item)}
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
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
