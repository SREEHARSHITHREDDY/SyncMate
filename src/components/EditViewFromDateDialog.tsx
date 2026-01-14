import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CalendarPermission } from "@/hooks/useCalendarPermissions";

interface EditViewFromDateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permission: CalendarPermission;
  onSave: (permissionId: string, viewFromDate: string | null) => Promise<void>;
  isSaving: boolean;
}

export function EditViewFromDateDialog({
  open,
  onOpenChange,
  permission,
  onSave,
  isSaving,
}: EditViewFromDateDialogProps) {
  const [hasRestriction, setHasRestriction] = useState(!!permission.view_from_date);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    permission.view_from_date ? new Date(permission.view_from_date) : undefined
  );

  const handleSave = async () => {
    const viewFromDate = hasRestriction && selectedDate
      ? format(selectedDate, "yyyy-MM-dd")
      : null;
    await onSave(permission.id, viewFromDate);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Calendar Access</DialogTitle>
          <DialogDescription>
            Update when <strong>{permission.profile?.name || "this user"}</strong> can
            view your calendar from.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="restriction-toggle" className="flex flex-col gap-1">
              <span>Restrict access by date</span>
              <span className="text-sm font-normal text-muted-foreground">
                Only show events from a specific date onwards
              </span>
            </Label>
            <Switch
              id="restriction-toggle"
              checked={hasRestriction}
              onCheckedChange={(checked) => {
                setHasRestriction(checked);
                if (!checked) {
                  setSelectedDate(undefined);
                }
              }}
            />
          </div>

          {hasRestriction && (
            <div className="space-y-2">
              <Label>View from date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Select a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                They will only see your events from this date onwards
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || (hasRestriction && !selectedDate)}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
