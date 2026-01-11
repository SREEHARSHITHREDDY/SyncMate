import { useState } from "react";
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
  ArrowUpDown, Trash2, Calendar as CalendarIcon, SortAsc, SortDesc
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isPast, isToday, isTomorrow, parseISO, differenceInDays } from "date-fns";
import { Link } from "react-router-dom";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
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

type FilterType = "all" | "overdue" | "today" | "upcoming" | "no-date";
type SortType = "due-date" | "created" | "event";
type SortDirection = "asc" | "desc";

export default function MyTasks() {
  const { actionItems, isLoading, overdueCount, totalCount } = useUserActionItems();
  const [filter, setFilter] = useState<FilterType>("all");
  const [sortBy, setSortBy] = useState<SortType>("due-date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [completingIds, setCompletingIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

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

  // Filter items
  const filteredItems = actionItems.filter(item => {
    // Search filter
    if (searchQuery && !item.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !item.event_title?.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Status filter
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
    setCompletingIds(prev => new Set(prev).add(item.id));
    try {
      const { error } = await supabase
        .from("action_items")
        .update({ is_completed: true })
        .eq("id", item.id);

      if (error) throw error;
      
      toast.success("Action item completed!");
      setSelectedItems(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["user-action-items", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["action-items"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to complete action item");
    } finally {
      setCompletingIds(prev => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const handleBulkComplete = async () => {
    const ids = Array.from(selectedItems);
    setCompletingIds(new Set(ids));
    
    try {
      const { error } = await supabase
        .from("action_items")
        .update({ is_completed: true })
        .in("id", ids);

      if (error) throw error;
      
      toast.success(`${ids.length} item(s) marked as complete!`);
      setSelectedItems(new Set());
      queryClient.invalidateQueries({ queryKey: ["user-action-items", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["action-items"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to complete items");
    } finally {
      setCompletingIds(new Set());
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
      
      toast.success(`${ids.length} item(s) deleted!`);
      setSelectedItems(new Set());
      setShowBulkDeleteDialog(false);
      queryClient.invalidateQueries({ queryKey: ["user-action-items", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["action-items"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to delete items");
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

  const toggleSelectAll = () => {
    if (selectedItems.size === sortedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(sortedItems.map(item => item.id)));
    }
  };

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
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              <ListTodo className="h-3 w-3" />
              {totalCount} total
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
          </div>
        </div>

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
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedItems.size} item(s) selected
                </span>
                <div className="flex items-center gap-2">
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
                    disabled={completingIds.size > 0}
                    className="gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Mark Complete
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
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Tasks</CardTitle>
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
                <p className="text-lg font-medium">
                  {filter === "all" && !searchQuery ? "No tasks assigned to you" : "No matching tasks"}
                </p>
                <p className="text-sm">
                  {filter === "overdue" ? "Great job! No overdue tasks." : 
                   filter === "today" ? "Nothing due today." :
                   searchQuery ? "Try a different search term." :
                   "Action items will appear here when assigned."}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sortedItems.map((item) => {
                  const dueDateInfo = getDueDateInfo(item.due_date);
                  const isSelected = selectedItems.has(item.id);
                  const isCompleting = completingIds.has(item.id);
                  
                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "flex items-start gap-3 p-4 rounded-lg border bg-card transition-all",
                        dueDateInfo?.isOverdue && "border-destructive/50 bg-destructive/5",
                        dueDateInfo?.isToday && "border-primary/50 bg-primary/5",
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
                        <p className={cn(
                          "font-medium leading-tight",
                          isCompleting && "line-through text-muted-foreground"
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
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleComplete(item)}
                        disabled={isCompleting}
                        className="shrink-0"
                      >
                        {isCompleting ? (
                          <CheckCircle2 className="h-4 w-4 animate-pulse text-primary" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1.5" />
                            Complete
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
    </AppLayout>
  );
}
