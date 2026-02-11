import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCommitmentStatus, CommitmentStatus } from "@/hooks/useCommitmentStatus";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, HelpCircle, XCircle, Loader2, ShieldCheck } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface CommitmentPanelProps {
  eventId: string;
  isParticipant: boolean;
}

const STATUS_CONFIG: Record<CommitmentStatus, { label: string; icon: typeof CheckCircle2; className: string }> = {
  confirmed: { label: "Confirmed", icon: CheckCircle2, className: "border-primary bg-primary/10 text-primary" },
  tentative: { label: "Tentative", icon: HelpCircle, className: "border-warning bg-warning/10 text-warning" },
  not_available: { label: "Not Available", icon: XCircle, className: "border-destructive bg-destructive/10 text-destructive" },
  pending: { label: "Pending", icon: HelpCircle, className: "border-muted bg-muted text-muted-foreground" },
};

export function CommitmentPanel({ eventId, isParticipant }: CommitmentPanelProps) {
  const { commitments, myCommitment, strengthScore, confirmed, tentative, total, isLoading, updateCommitment } = useCommitmentStatus(eventId);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (total === 0) {
    return null;
  }

  const getScoreColor = () => {
    if (strengthScore >= 75) return "text-primary";
    if (strengthScore >= 50) return "text-warning";
    return "text-destructive";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Commitment Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Plan Strength Score */}
        <div className="p-3 rounded-lg border bg-secondary/30 text-center">
          <p className="text-xs text-muted-foreground mb-1">Plan Strength Score</p>
          <p className={cn("text-3xl font-bold", getScoreColor())}>{strengthScore}%</p>
          <Progress value={strengthScore} className="h-2 mt-2" />
          <p className="text-xs text-muted-foreground mt-1.5">
            {confirmed} confirmed · {tentative} tentative · {total} total
          </p>
        </div>

        {/* My commitment controls */}
        {isParticipant && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground font-medium">Your status</p>
            <div className="grid grid-cols-3 gap-2">
              {(["confirmed", "tentative", "not_available"] as CommitmentStatus[]).map((status) => {
                const config = STATUS_CONFIG[status];
                const Icon = config.icon;
                const isActive = myCommitment?.commitment_status === status;
                return (
                  <Button
                    key={status}
                    variant="outline"
                    size="sm"
                    className={cn("flex-col h-auto py-2 gap-1", isActive && config.className)}
                    onClick={() => updateCommitment.mutate(status)}
                    disabled={updateCommitment.isPending}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs">{config.label}</span>
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {/* Member list */}
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">Members</p>
          {commitments.map((c) => {
            const config = STATUS_CONFIG[c.commitment_status];
            return (
              <div key={c.user_id} className="flex items-center justify-between p-2 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {c.profile?.name?.charAt(0).toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{c.profile?.name || "Unknown"}</span>
                </div>
                <Badge variant="outline" className={cn("text-xs", config.className)}>
                  {config.label}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
