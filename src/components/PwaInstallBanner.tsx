import { usePwaInstall } from "@/hooks/usePwaInstall";
import { Button } from "@/components/ui/button";
import { Download, X } from "lucide-react";

export function PwaInstallBanner() {
  const { showBanner, install, dismiss } = usePwaInstall();

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 pb-safe">
      <div className="max-w-md mx-auto bg-gray-900 dark:bg-gray-800 border border-gray-700 rounded-xl shadow-2xl flex items-center gap-3 px-4 py-3">
        <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-green-600 shrink-0">
          <Download className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-tight">Install SyncMates</p>
          <p className="text-xs text-gray-400 leading-tight mt-0.5">Add to home screen for the best experience</p>
        </div>
        <Button
          size="sm"
          onClick={install}
          className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold shrink-0 h-8 px-3"
        >
          Install
        </Button>
        <button
          onClick={dismiss}
          className="text-gray-500 hover:text-gray-300 transition-colors shrink-0 p-1"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
