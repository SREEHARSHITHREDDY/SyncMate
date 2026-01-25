import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCalendarPermissions } from "@/hooks/useCalendarPermissions";
import { Check, X, Calendar, Loader2, UserMinus, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

export function CalendarPermissionsCard() {
  const { toast } = useToast();
  const {
    pendingReceivedRequests,
    grantedAccess,
    receivedRequestsLoading,
    grantAccess,
    grantingAccess,
    rejectAccess,
    rejectingAccess,
    revokeAccess,
    revokingAccess,
  } = useCalendarPermissions();

  const handleGrantAccess = async (permissionId: string, name: string) => {
    try {
      await grantAccess(permissionId);
      toast({
        title: "Access granted",
        description: `${name} can now view your calendar.`,
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

  const isLoading = receivedRequestsLoading;
  const hasPending = pendingReceivedRequests.length > 0;
  const hasGranted = grantedAccess.length > 0;

  return (
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
                        onClick={() => handleGrantAccess(request.id, request.profile?.name || "User")}
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
                {grantedAccess.map((permission) => (
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
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Check className="h-3 w-3 text-success" />
                          Has access
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleRevokeAccess(permission.id, permission.profile?.name || "User")}
                      disabled={revokingAccess}
                    >
                      {revokingAccess ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserMinus className="h-4 w-4 mr-1" />
                          Revoke
                        </>
                      )}
                    </Button>
                  </div>
                ))}
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
  );
}
