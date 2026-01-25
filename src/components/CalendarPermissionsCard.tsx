import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCalendarPermissions, CalendarPermissionWithProfile } from "@/hooks/useCalendarPermissions";
import { Check, X, Calendar, Loader2, UserMinus, Shield, Settings, Clock, CalendarRange } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { GrantAccessDialog } from "./GrantAccessDialog";
import { EditPermissionDialog } from "./EditPermissionDialog";
import { format } from "date-fns";

export function CalendarPermissionsCard() {
  const { toast } = useToast();
  const {
    pendingReceivedRequests,
    grantedAccess,
    receivedRequestsLoading,
    grantAccess,
    grantingAccess,
    updatePermission,
    updatingPermission,
    rejectAccess,
    rejectingAccess,
    revokeAccess,
    revokingAccess,
  } = useCalendarPermissions();

  // Dialog states
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CalendarPermissionWithProfile | null>(null);
  const [selectedPermission, setSelectedPermission] = useState<CalendarPermissionWithProfile | null>(null);

  const handleOpenGrantDialog = (request: CalendarPermissionWithProfile) => {
    setSelectedRequest(request);
    setGrantDialogOpen(true);
  };

  const handleGrantAccess = async (params: { permissionId: string; viewFromDate?: string | null; expiresAt?: string | null }) => {
    try {
      await grantAccess(params);
      toast({
        title: "Access granted",
        description: `${selectedRequest?.profile?.name || "User"} can now view your calendar.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to grant access",
        description: error.message || "Something went wrong",
      });
    }
  };

  const handleRejectAccess = async (permissionId: string) => {
    try {
      await rejectAccess(permissionId);
      toast({
        title: "Request declined",
        description: "The calendar access request has been declined.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to decline request",
        description: error.message || "Something went wrong",
      });
    }
  };

  const handleOpenEditDialog = (permission: CalendarPermissionWithProfile) => {
    setSelectedPermission(permission);
    setEditDialogOpen(true);
  };

  const handleUpdatePermission = async (params: { permissionId: string; viewFromDate?: string | null; expiresAt?: string | null }) => {
    try {
      await updatePermission(params);
      toast({
        title: "Restrictions updated",
        description: "Access restrictions have been updated.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to update",
        description: error.message || "Something went wrong",
      });
    }
  };

  const handleRevokeAccess = async (permissionId: string, name: string) => {
    try {
      await revokeAccess(permissionId);
      toast({
        title: "Access revoked",
        description: `${name} can no longer view your calendar.`,
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to revoke access",
        description: error.message || "Something went wrong",
      });
    }
  };

  const formatRestrictions = (permission: CalendarPermissionWithProfile) => {
    const restrictions: string[] = [];
    if (permission.view_from_date) {
      restrictions.push(`From ${format(new Date(permission.view_from_date), "MMM d, yyyy")}`);
    }
    if (permission.expires_at) {
      restrictions.push(`Expires ${format(new Date(permission.expires_at), "MMM d, yyyy")}`);
    }
    return restrictions;
  };

  const isLoading = receivedRequestsLoading;
  const hasPending = pendingReceivedRequests.length > 0;
  const hasGranted = grantedAccess.length > 0;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Calendar Sharing
            {hasPending && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-accent text-accent-foreground">
                {pendingReceivedRequests.length} pending
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Manage who can view your calendar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Pending Requests Section */}
              {hasPending && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-accent" />
                    Pending Requests
                  </h4>
                  {pendingReceivedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium text-primary">
                            {request.profile?.name?.charAt(0).toUpperCase() || "?"}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{request.profile?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">
                            Wants to view your calendar
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                          onClick={() => handleOpenGrantDialog(request)}
                          disabled={grantingAccess}
                        >
                          {grantingAccess ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRejectAccess(request.id)}
                          disabled={rejectingAccess}
                        >
                          {rejectingAccess ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Separator between sections */}
              {hasPending && hasGranted && <Separator />}

              {/* Granted Access Section */}
              {hasGranted && (
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Who can view my calendar</h4>
                  {grantedAccess.map((permission) => {
                    const restrictions = formatRestrictions(permission);
                    return (
                      <div
                        key={permission.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-success">
                              {permission.profile?.name?.charAt(0).toUpperCase() || "?"}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{permission.profile?.name || "Unknown"}</p>
                            {restrictions.length > 0 ? (
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {restrictions.map((r, i) => (
                                  <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-1">
                                    {r.startsWith("From") ? <CalendarRange className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                                    {r}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Check className="h-3 w-3 text-success" />
                                Full access
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={() => handleOpenEditDialog(permission)}
                            disabled={updatingPermission}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleRevokeAccess(permission.id, permission.profile?.name || "User")}
                            disabled={revokingAccess}
                          >
                            {revokingAccess ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <UserMinus className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Empty state */}
              {!hasPending && !hasGranted && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No one has requested access to your calendar yet
                  </p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Grant Access Dialog */}
      <GrantAccessDialog
        open={grantDialogOpen}
        onOpenChange={setGrantDialogOpen}
        userName={selectedRequest?.profile?.name || "Unknown"}
        permissionId={selectedRequest?.id || ""}
        onGrant={handleGrantAccess}
        isGranting={grantingAccess}
      />

      {/* Edit Permission Dialog */}
      <EditPermissionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        userName={selectedPermission?.profile?.name || "Unknown"}
        permissionId={selectedPermission?.id || ""}
        currentViewFromDate={selectedPermission?.view_from_date || null}
        currentExpiresAt={selectedPermission?.expires_at || null}
        onUpdate={handleUpdatePermission}
        isUpdating={updatingPermission}
      />
    </>
  );
}
