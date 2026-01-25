import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Settings, Clock } from "lucide-react";
import { format } from "date-fns";

interface EditPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userName: string;
  permissionId: string;
  currentViewFromDate: string | null;
  currentExpiresAt: string | null;
  onUpdate: (params: { permissionId: string; viewFromDate?: string | null; expiresAt?: string | null }) => Promise<void>;
  isUpdating: boolean;
}

export function EditPermissionDialog({
  open,
  onOpenChange,
  userName,
  permissionId,
  currentViewFromDate,
  currentExpiresAt,
  onUpdate,
  isUpdating,
}: EditPermissionDialogProps) {
  const [useViewFromDate, setUseViewFromDate] = useState(!!currentViewFromDate);
  const [useExpiresAt, setUseExpiresAt] = useState(!!currentExpiresAt);
  const [viewFromDate, setViewFromDate] = useState(currentViewFromDate || format(new Date(), "yyyy-MM-dd"));
  const [expiresAt, setExpiresAt] = useState(currentExpiresAt || "");

  const handleUpdate = async () => {
    await onUpdate({
      permissionId,
      viewFromDate: useViewFromDate ? viewFromDate : null,
      expiresAt: useExpiresAt ? expiresAt : null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Edit Access Restrictions
          </DialogTitle>
          <DialogDescription>
            Update access restrictions for <span className="font-medium text-foreground">{userName}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* View From Date Restriction */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="viewFromDate" className="text-sm font-medium">
                  Restrict view start date
                </Label>
                <p className="text-xs text-muted-foreground">
                  Only show events from a specific date forward
                </p>
              </div>
              <Switch
                id="viewFromDateToggle"
                checked={useViewFromDate}
                onCheckedChange={setUseViewFromDate}
              />
            </div>
            {useViewFromDate && (
              <Input
                id="viewFromDate"
                type="date"
                value={viewFromDate}
                onChange={(e) => setViewFromDate(e.target.value)}
                className="w-full"
              />
            )}
          </div>

          {/* Expires At Restriction */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="expiresAt" className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Set expiration date
                </Label>
                <p className="text-xs text-muted-foreground">
                  Automatically revoke access after this date
                </p>
              </div>
              <Switch
                id="expiresAtToggle"
                checked={useExpiresAt}
                onCheckedChange={setUseExpiresAt}
              />
            </div>
            {useExpiresAt && (
              <Input
                id="expiresAt"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={format(new Date(), "yyyy-MM-dd")}
                className="w-full"
              />
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleUpdate} disabled={isUpdating}>
            {isUpdating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Updating...
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
