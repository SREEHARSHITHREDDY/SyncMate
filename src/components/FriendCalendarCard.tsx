import { Button } from "@/components/ui/button";
import { Calendar, Clock, Eye, Loader2, Send, X, Shield } from "lucide-react";
import { Friend } from "@/hooks/useFriends";
import { CalendarPermission } from "@/hooks/useCalendarPermissions";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface FriendCalendarCardProps {
  friend: Friend;
  permission?: CalendarPermission;
  friendPermission?: CalendarPermission;
  onRequestPermission: (friendUserId: string) => void;
  onViewCalendar: (friendUserId: string) => void;
  onRevokeRequest: (permissionId: string) => void;
  onRevokeAccess?: (permissionId: string, friendName: string) => void;
  isRequesting: boolean;
  isRevoking: boolean;
}

export function FriendCalendarCard({
  friend,
  permission,
  friendPermission,
  onRequestPermission,
  onViewCalendar,
  onRevokeRequest,
  onRevokeAccess,
  isRequesting,
  isRevoking,
}: FriendCalendarCardProps) {
  const friendUserId = friend.profile?.user_id;
  const friendName = friend.profile?.name || "Unknown";

  const renderCalendarAction = () => {
    if (!friendUserId) return null;

    if (!permission) {
      // No permission exists - show request button
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onRequestPermission(friendUserId)}
          disabled={isRequesting}
          className="gap-2"
        >
          {isRequesting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Send className="h-4 w-4" />
              Request Calendar
            </>
          )}
        </Button>
      );
    }

    if (permission.status === "pending") {
      // Request pending - show pending state with cancel option
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Pending
          </span>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => onRevokeRequest(permission.id)}
            disabled={isRevoking}
          >
            {isRevoking ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <X className="h-3 w-3" />
            )}
          </Button>
        </div>
      );
    }

    if (permission.status === "accepted") {
      // Permission granted - show view button with date restriction info
      return (
        <div className="flex flex-col items-end gap-1">
          <Button
            size="sm"
            variant="default"
            onClick={() => onViewCalendar(friendUserId)}
            className="gap-2"
          >
            <Eye className="h-4 w-4" />
            View Calendar
          </Button>
          {permission.view_from_date && (
            <span className="text-xs text-muted-foreground">
              From {format(new Date(permission.view_from_date), "MMM d, yyyy")}
            </span>
          )}
        </div>
      );
    }

    if (permission.status === "rejected") {
      // Request rejected - show re-request option
      return (
        <div className="flex items-center gap-2">
          <span className="text-xs text-destructive">Declined</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onRevokeRequest(permission.id)}
            disabled={isRevoking}
          >
            {isRevoking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Remove"
            )}
          </Button>
        </div>
      );
    }

    return null;
  };

  // Check if friend has accepted permission to view my calendar
  const canFriendViewMyCalendar = friendPermission?.status === "accepted";

  return (
    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-sm font-medium text-primary">
            {friend.profile?.name?.charAt(0).toUpperCase() || "?"}
          </span>
        </div>
        <div>
          <p className="font-medium">{friend.profile?.name || "Unknown"}</p>
          <p className="text-sm text-muted-foreground">
            {friend.profile?.email || ""}
          </p>
          {canFriendViewMyCalendar && (
            <p className="text-xs text-primary flex items-center gap-1 mt-0.5">
              <Shield className="h-3 w-3" />
              Can view your calendar
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        {canFriendViewMyCalendar && onRevokeAccess && friendPermission && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                disabled={isRevoking}
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revoke Calendar Access</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to revoke calendar access for{" "}
                  <strong>{friendName}</strong>?
                  They will no longer be able to view your calendar.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onRevokeAccess(friendPermission.id, friendName)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Revoke Access
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {renderCalendarAction()}
      </div>
    </div>
  );
}
