import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUserActionItems, UserActionItem } from "@/hooks/useUserActionItems";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { ListTodo, Clock, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, isPast, isToday, isTomorrow, parseISO, differenceInDays } from "date-fns";
import { Link } from "react-router-dom";

export function MyActionItems() {
  const { actionItems, isLoading, overdueCount, dueSoonCount, totalCount } = useUserActionItems();
  const [isExpanded, setIsExpanded] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const handleToggleComplete = async (item: UserActionItem) => {
    setCompletingId(item.id);
    try {
      const { error } = await supabase
        .from("action_items")
        .update({ is_completed: true })
        .eq("id", item.id);

      if (error) throw error;
      
      toast.success("Action item completed!");
      queryClient.invalidateQueries({ queryKey: ["user-action-items", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["action-items"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to complete action item");
    } finally {
      setCompletingId(null);
    }
  };

  const getDueDateInfo = (dueDate: string | null) => {
    if (!dueDate) return null;
    
    const date = parseISO(dueDate);
    const isOverdue = isPast(date) && !isToday(date);
    const daysUntil = differenceInDays(date, new Date());
    
    let label = format(date, "MMM d");
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
    };
  };

  if (totalCount === 0 && !isLoading) {
    return null;
  }

  // Sort: overdue first, then by due date, then items without due date
  const sortedItems = [...actionItems].sort((a, b) => {
    if (!a.due_date && !b.due_date) return 0;
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
  });

  return (
    <Card className="animate-fade-in" style={{ animationDelay: '0.28s' }}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <ListTodo className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                My Action Items
                <Badge variant="secondary" className="ml-1">
                  {totalCount}
                </Badge>
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-0.5">
                {overdueCount > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    {overdueCount} overdue
                  </span>
                )}
                {dueSoonCount > 0 && (
                  <span className="flex items-center gap-1 text-warning">
                    <Clock className="h-3 w-3" />
                    {dueSoonCount} due soon
                  </span>
                )}
                {overdueCount === 0 && dueSoonCount === 0 && (
                  <span>Tasks assigned to you</span>
                )}
              </CardDescription>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="gap-1"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                <span className="sr-only">Collapse</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                <span className="sr-only">Expand</span>
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Loading action items...
            </div>
          ) : (
            <div className="space-y-2">
              {sortedItems.slice(0, 10).map((item) => {
                const dueDateInfo = getDueDateInfo(item.due_date);
                
                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors",
                      dueDateInfo?.isOverdue && "border-destructive/50 bg-destructive/5"
                    )}
                  >
                    <Checkbox
                      checked={false}
                      disabled={completingId === item.id}
                      onCheckedChange={() => handleToggleComplete(item)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">
                        {item.content}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Link 
                          to="/calendar" 
                          className="text-xs text-muted-foreground hover:text-primary transition-colors"
                        >
                          {item.event_title}
                        </Link>
                        {dueDateInfo && (
                          <Badge 
                            variant={dueDateInfo.isOverdue ? "destructive" : dueDateInfo.isUrgent ? "default" : "secondary"}
                            className="text-[10px] px-1.5 py-0 gap-1"
                          >
                            <Clock className="h-2.5 w-2.5" />
                            {dueDateInfo.label}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {completingId === item.id && (
                      <CheckCircle2 className="h-4 w-4 text-primary animate-pulse" />
                    )}
                  </div>
                );
              })}
              
              {sortedItems.length > 10 && (
                <p className="text-xs text-center text-muted-foreground pt-2">
                  And {sortedItems.length - 10} more...
                </p>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
