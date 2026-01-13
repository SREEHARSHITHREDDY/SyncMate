import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, Users, Check, X, Loader2, CalendarDays, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFriends, Profile } from "@/hooks/useFriends";
import { useCalendarPermissions, CalendarPermission } from "@/hooks/useCalendarPermissions";
import { useToast } from "@/hooks/use-toast";
import { FriendCalendarCard } from "@/components/FriendCalendarCard";
import { CalendarPermissionDialog } from "@/components/CalendarPermissionDialog";

export default function Friends() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<CalendarPermission | null>(null);

  const {
    friends,
    friendsLoading,
    pendingRequests,
    pendingRequestsLoading,
    sendRequest,
    sendingRequest,
    acceptRequest,
    acceptingRequest,
    rejectRequest,
    rejectingRequest,
    searchUsers,
  } = useFriends();

  const {
    pendingReceivedRequests,
    receivedRequestsLoading,
    requestPermission,
    requestingPermission,
    acceptPermission,
    acceptingPermission,
    rejectPermission,
    rejectingPermission,
    deletePermission,
    deletingPermission,
    getPermissionStatus,
  } = useCalendarPermissions();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearching(true);
        try {
          const results = await searchUsers(searchQuery);
          // Filter out existing friends and pending requests
          const friendIds = friends.map((f) => f.profile?.user_id);
          const pendingIds = pendingRequests.map((r) => r.requester_id);
          setSearchResults(
            results.filter(
              (r) => !friendIds.includes(r.user_id) && !pendingIds.includes(r.user_id)
            )
          );
        } catch (error) {
          console.error("Search error:", error);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, friends, pendingRequests, searchUsers]);

  const handleSendRequest = async (receiverId: string) => {
    try {
      await sendRequest(receiverId);
      toast({
        title: "Request sent!",
        description: "Your friend request has been sent.",
      });
      setSearchResults((prev) => prev.filter((r) => r.user_id !== receiverId));
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to send request",
        description: error.message || "Something went wrong",
      });
    }
  };

  const handleAcceptRequest = async (friendId: string) => {
    try {
      await acceptRequest(friendId);
      toast({
        title: "Request accepted!",
        description: "You're now connected.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to accept request",
        description: error.message || "Something went wrong",
      });
    }
  };

  const handleRejectRequest = async (friendId: string) => {
    try {
      await rejectRequest(friendId);
      toast({
        title: "Request declined",
        description: "The friend request has been declined.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to decline request",
        description: error.message || "Something went wrong",
      });
    }
  };

  const handleRequestCalendarPermission = async (friendUserId: string) => {
    try {
      await requestPermission(friendUserId);
      toast({
        title: "Request sent!",
        description: "Calendar access request has been sent.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to send request",
        description: error.message || "Something went wrong",
      });
    }
  };

  const handleViewCalendar = (friendUserId: string) => {
    navigate(`/friend-calendar/${friendUserId}`);
  };

  const handleRevokeCalendarRequest = async (permissionId: string) => {
    try {
      await deletePermission(permissionId);
      toast({
        title: "Request removed",
        description: "Calendar access request has been removed.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to remove request",
        description: error.message || "Something went wrong",
      });
    }
  };

  const handleAcceptCalendarPermission = async (
    permissionId: string,
    viewFromDate?: string | null
  ) => {
    try {
      await acceptPermission({ permissionId, viewFromDate });
      toast({
        title: "Access granted!",
        description: "They can now view your calendar.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to grant access",
        description: error.message || "Something went wrong",
      });
    }
  };

  const handleRejectCalendarPermission = async (permissionId: string) => {
    try {
      await rejectPermission(permissionId);
      toast({
        title: "Access declined",
        description: "The calendar access request has been declined.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Failed to decline access",
        description: error.message || "Something went wrong",
      });
    }
  };

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-semibold mb-2">Friends</h1>
          <p className="text-muted-foreground">Connect with your mates to plan together</p>
        </div>

        {/* Search */}
        <div className="relative mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by email..."
            className="pl-10 h-12"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <Card className="mb-6 animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg">Search Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {searchResults.map((profile) => (
                <div
                  key={profile.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">
                        {profile.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{profile.name}</p>
                      <p className="text-sm text-muted-foreground">{profile.email}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleSendRequest(profile.user_id)}
                    disabled={sendingRequest}
                  >
                    {sendingRequest ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Friend
                      </>
                    )}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Calendar Access Requests */}
        {pendingReceivedRequests.length > 0 && (
          <Card className="mb-6 animate-fade-in" style={{ animationDelay: '0.12s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-accent" />
                Calendar Access Requests
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-accent text-accent-foreground">
                  {pendingReceivedRequests.length}
                </span>
              </CardTitle>
              <CardDescription>Friends who want to view your calendar</CardDescription>
            </CardHeader>
            <CardContent>
              {receivedRequestsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingReceivedRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {request.profile?.name?.charAt(0).toUpperCase() || "?"}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{request.profile?.name || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            Wants to view your calendar
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedPermission(request)}
                      >
                        Review
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Friend Requests */}
          <Card className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-accent" />
                Friend Requests
                {pendingRequests.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-accent text-accent-foreground">
                    {pendingRequests.length}
                  </span>
                )}
              </CardTitle>
              <CardDescription>People who want to connect with you</CardDescription>
            </CardHeader>
            <CardContent>
              {pendingRequestsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : pendingRequests.length > 0 ? (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {request.profile?.name?.charAt(0).toUpperCase() || "?"}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{request.profile?.name || "Unknown"}</p>
                          <p className="text-sm text-muted-foreground">
                            {request.profile?.email || ""}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-success hover:text-success hover:bg-success/10"
                          onClick={() => handleAcceptRequest(request.id)}
                          disabled={acceptingRequest}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleRejectRequest(request.id)}
                          disabled={rejectingRequest}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                    <UserPlus className="h-6 w-6 text-accent" />
                  </div>
                  <p className="text-sm text-muted-foreground">No pending requests</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Your Friends */}
          <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader>
              <CardTitle>Your Friends</CardTitle>
              <CardDescription>People you can plan events with</CardDescription>
            </CardHeader>
            <CardContent>
              {friendsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : friends.length > 0 ? (
                <div className="space-y-3">
                  {friends.map((friend) => (
                    <FriendCalendarCard
                      key={friend.id}
                      friend={friend}
                      permission={getPermissionStatus(friend.profile?.user_id || "")}
                      onRequestPermission={handleRequestCalendarPermission}
                      onViewCalendar={handleViewCalendar}
                      onRevokeRequest={handleRevokeCalendarRequest}
                      isRequesting={requestingPermission}
                      isRevoking={deletingPermission}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">
                    You haven't added any friends yet
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Search by email to find friends
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Calendar Permission Dialog */}
      {selectedPermission && (
        <CalendarPermissionDialog
          open={!!selectedPermission}
          onOpenChange={(open) => !open && setSelectedPermission(null)}
          permission={selectedPermission}
          onAccept={handleAcceptCalendarPermission}
          onReject={handleRejectCalendarPermission}
          isAccepting={acceptingPermission}
          isRejecting={rejectingPermission}
        />
      )}
    </AppLayout>
  );
}
