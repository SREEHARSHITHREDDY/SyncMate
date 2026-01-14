import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCalendarPermissions, CalendarPermission } from "@/hooks/useCalendarPermissions";
import { Loader2, Users, X, Eye, Calendar, Pencil } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
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
import { EditViewFromDateDialog } from "./EditViewFromDateDialog";

export function CalendarPermissionsCard() {
  const { toast } = useToast();
  const [editingPermission, setEditingPermission] = useState<CalendarPermission | null>(null);
  
  const {
    receivedRequests,
    receivedRequestsLoading,
    deletePermission,
    deletingPermission,
    updateViewFromDate,
    updatingViewFromDate,
  } = useCalendarPermissions();

  // Only show accepted permissions (people who can view my calendar)
  const acceptedPermissions = receivedRequests.filter(
    (p) => p.status === "accepted"
  );

  const handleRevoke = async (permission: CalendarPermission) => {
    try {
      await deletePermission(permission.id);
      toast({
        title: "Access revoked",
        description: `${permission.profile?.name || "User"} can no longer view your calendar.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to revoke access",
        description: error.message || "Something went wrong",
      });
    }
  };

  const handleUpdateViewFromDate = async (permissionId: string, viewFromDate: string | null) => {
    try {
      await updateViewFromDate({ permissionId, viewFromDate });
      toast({
        title: "Access updated",
        description: viewFromDate 
          ? `They can now view your calendar from ${format(new Date(viewFromDate), "MMM d, yyyy")}.`
          : "They now have full access to your calendar.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to update access",
        description: error.message || "Something went wrong",
      });
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Who Can View My Calendar
          </CardTitle>
          <CardDescription>
            Manage friends who have access to view your calendar
          </CardDescription>
        </CardHeader>
        <CardContent>
          {receivedRequestsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : acceptedPermissions.length > 0 ? (
            <div className="space-y-3">
              {acceptedPermissions.map((permission) => (
                <div
                  key={permission.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {permission.profile?.name?.charAt(0).toUpperCase() || "?"}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">
                        {permission.profile?.name || "Unknown"}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {permission.view_from_date ? (
                          <span>
                            From {format(new Date(permission.view_from_date), "MMM d, yyyy")}
                          </span>
                        ) : (
                          <span>Full access</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingPermission(permission)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={deletingPermission}
                        >
                          {deletingPermission ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <X className="h-4 w-4 mr-1" />
                              Revoke
                            </>
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Revoke Calendar Access</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to revoke calendar access for{" "}
                            <strong>{permission.profile?.name || "this user"}</strong>?
                            They will no longer be able to view your calendar.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRevoke(permission)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Revoke Access
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center mb-3">
                <Users className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                No one has access to view your calendar yet
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Friends can request access from the Friends page
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {editingPermission && (
        <EditViewFromDateDialog
          open={!!editingPermission}
          onOpenChange={(open) => !open && setEditingPermission(null)}
          permission={editingPermission}
          onSave={handleUpdateViewFromDate}
          isSaving={updatingViewFromDate}
        />
      )}
    </>
  );
}
