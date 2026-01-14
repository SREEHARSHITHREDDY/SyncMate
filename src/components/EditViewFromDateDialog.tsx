import { useState, useEffect } from "react";
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

interface EditPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permission: CalendarPermission;
  onSave: (permissionId: string, viewFromDate: string | null, expiresAt: string | null) => Promise<void>;
  isSaving: boolean;
}

export function EditViewFromDateDialog({
  open,
  onOpenChange,
  permission,
  onSave,
  isSaving,
}: EditPermissionDialogProps) {
  const [hasStartRestriction, setHasStartRestriction] = useState(!!permission.view_from_date);
  const [hasExpiration, setHasExpiration] = useState(!!permission.expires_at);
  const [startDate, setStartDate] = useState<Date | undefined>(
    permission.view_from_date ? new Date(permission.view_from_date) : undefined
  );
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(
    permission.expires_at ? new Date(permission.expires_at) : undefined
  );

  // Reset state when permission changes
  useEffect(() => {
    setHasStartRestriction(!!permission.view_from_date);
    setHasExpiration(!!permission.expires_at);
    setStartDate(permission.view_from_date ? new Date(permission.view_from_date) : undefined);
    setExpirationDate(permission.expires_at ? new Date(permission.expires_at) : undefined);
  }, [permission]);

  const handleSave = async () => {
    const viewFromDate = hasStartRestriction && startDate
      ? format(startDate, "yyyy-MM-dd")
      : null;
    const expiresAt = hasExpiration && expirationDate
      ? format(expirationDate, "yyyy-MM-dd")
      : null;
    await onSave(permission.id, viewFromDate, expiresAt);
    onOpenChange(false);
  };

  const isValid = 
    (!hasStartRestriction || startDate) && 
    (!hasExpiration || expirationDate);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Calendar Access</DialogTitle>
          <DialogDescription>
            Update access settings for <strong>{permission.profile?.name || "this user"}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Start date restriction */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="start-restriction" className="flex flex-col gap-1">
                <span>Restrict start date</span>
                <span className="text-sm font-normal text-muted-foreground">
                  Only show events from a specific date
                </span>
              </Label>
              <Switch
                id="start-restriction"
                checked={hasStartRestriction}
                onCheckedChange={(checked) => {
                  setHasStartRestriction(checked);
                  if (!checked) setStartDate(undefined);
                }}
              />
            </div>

            {hasStartRestriction && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : "Select start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Expiration date */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="expiration" className="flex flex-col gap-1">
                <span>Set expiration date</span>
                <span className="text-sm font-normal text-muted-foreground">
                  Automatically revoke access after a date
                </span>
              </Label>
              <Switch
                id="expiration"
                checked={hasExpiration}
                onCheckedChange={(checked) => {
                  setHasExpiration(checked);
                  if (!checked) setExpirationDate(undefined);
                }}
              />
            </div>

            {hasExpiration && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expirationDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expirationDate ? format(expirationDate, "PPP") : "Select expiration date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expirationDate}
                    onSelect={setExpirationDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !isValid}>
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
