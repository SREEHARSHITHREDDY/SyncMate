import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Wraps any page that requires authentication.
 *
 * Without this, every protected page did its redirect inside useEffect which
 * fires AFTER the first render — so the protected page flashed briefly before
 * the redirect happened. This component blocks rendering entirely until auth
 * state is resolved, then either shows the page or redirects to /auth.
 *
 * Usage in App.tsx:
 *   <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // While Supabase is checking the session, show a centered spinner.
  // This prevents both the flash AND the redirect happening on a valid session.
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in — send to /auth and remember where they were trying to go
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}