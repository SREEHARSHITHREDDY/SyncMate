import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { AIAssistantButton } from "@/components/AIAssistantButton";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="animate-fade-in">
        {children}
      </main>
      <AIAssistantButton />
    </div>
  );
}
