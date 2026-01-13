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

interface CalendarPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permission: CalendarPermission;
  onAccept: (permissionId: string, viewFromDate?: string | null) => Promise<void>;
  onReject: (permissionId: string) => Promise<void>;
  isAccepting: boolean;
  isRejecting: boolean;
}

export function CalendarPermissionDialog({
  open,
  onOpenChange,
  permission,
  onAccept,
  onReject,
  isAccepting,
  isRejecting,
}: CalendarPermissionDialogProps) {
  const [restrictDate, setRestrictDate] = useState(false);
  const [viewFromDate, setViewFromDate] = useState<Date | undefined>(undefined);

  const handleAccept = async () => {
    await onAccept(
      permission.id,
      restrictDate && viewFromDate ? format(viewFromDate, "yyyy-MM-dd") : null
    );
    onOpenChange(false);
  };

  const handleReject = async () => {
    await onReject(permission.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Calendar Access Request</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">
              {permission.profile?.name || "Someone"}
            </span>{" "}
            wants to view your calendar. You can set restrictions on what they can see.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="restrict-date">Restrict viewing period</Label>
              <p className="text-sm text-muted-foreground">
                Only allow viewing events from a specific date
              </p>
            </div>
            <Switch
              id="restrict-date"
              checked={restrictDate}
              onCheckedChange={setRestrictDate}
            />
          </div>

          {restrictDate && (
            <div className="space-y-2">
              <Label>Can view from</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !viewFromDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {viewFromDate ? format(viewFromDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover" align="start">
                  <Calendar
                    mode="single"
                    selected={viewFromDate}
                    onSelect={setViewFromDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <p className="text-xs text-muted-foreground">
                They will only see events on or after this date
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={handleReject}
            disabled={isRejecting || isAccepting}
          >
            {isRejecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Decline"
            )}
          </Button>
          <Button
            onClick={handleAccept}
            disabled={isAccepting || isRejecting || (restrictDate && !viewFromDate)}
          >
            {isAccepting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Allow Access"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
