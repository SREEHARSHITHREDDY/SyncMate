import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Friends() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

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
            placeholder="Search by email or username..." 
            className="pl-10 h-12"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Friend Requests */}
          <Card className="animate-fade-in" style={{ animationDelay: '0.15s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-accent" />
                Friend Requests
              </CardTitle>
              <CardDescription>People who want to connect with you</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                  <UserPlus className="h-6 w-6 text-accent" />
                </div>
                <p className="text-sm text-muted-foreground">No pending requests</p>
              </div>
            </CardContent>
          </Card>

          {/* Your Friends */}
          <Card className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <CardHeader>
              <CardTitle>Your Friends</CardTitle>
              <CardDescription>People you can plan events with</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">You haven't added any friends yet</p>
                <Button variant="outline" size="sm">
                  Find Friends
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
