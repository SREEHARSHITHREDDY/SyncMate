import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { usePlanLifecycle } from "@/hooks/usePlanLifecycle";
import { Lock, AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

interface FreezePlanButtonProps {
  eventId: string;
  isFrozen: boolean;
  isCreator: boolean;
}

export function FreezePlanButton({ eventId, isFrozen, isCreator }: FreezePlanButtonProps) {
  const { freezePlan } = usePlanLifecycle(eventId);
  const [open, setOpen] = useState(false);

  if (!isCreator) {
    if (isFrozen) {
      return (
        <div className="flex items-center gap-2 p-3 rounded-lg border bg-primary/5 text-sm">
          <Lock className="h-4 w-4 text-primary" />
          <span className="font-medium text-primary">Plan is frozen</span>
          <span className="text-muted-foreground">— Changes require majority approval</span>
        </div>
      );
    }
    return null;
  }

  if (isFrozen) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg border bg-primary/5 text-sm">
        <Lock className="h-4 w-4 text-primary" />
        <span className="font-medium text-primary">Plan is frozen</span>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 w-full">
          <Lock className="h-4 w-4" />
          Freeze Plan
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Freeze Plan
          </DialogTitle>
          <DialogDescription>
            Once frozen, any changes to this plan will require majority approval from all participants. This action can't be easily undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              freezePlan.mutate();
              setOpen(false);
            }}
            disabled={freezePlan.isPending}
            className="gap-2"
          >
            {freezePlan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
            Freeze
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
