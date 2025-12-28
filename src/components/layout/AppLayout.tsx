import { ReactNode } from "react";
import { Navbar } from "./Navbar";

interface AppLayoutProps {
  children: ReactNode;
  isAuthenticated?: boolean;
}

export function AppLayout({ children, isAuthenticated = false }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar isAuthenticated={isAuthenticated} />
      <main className="animate-fade-in">
        {children}
      </main>
    </div>
  );
}
