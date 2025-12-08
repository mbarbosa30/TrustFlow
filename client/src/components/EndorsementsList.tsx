import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ExpirationStatus {
  isValid: boolean;
  isRevoked: boolean;
  isExpired: boolean;
  expiresAt: string | null;
  daysUntilExpiration: number | null;
}

interface Endorsement {
  id: string;
  endorsee: string;
  date: string;
  commitment: string;
  note?: string;
  expirationStatus?: ExpirationStatus;
}

interface EndorsementsListProps {
  endorsements: Endorsement[];
  onRevoke?: (id: string) => void;
  title?: string;
  emptyMessage?: string;
  showRevokeButton?: boolean;
}

function ExpirationBadge({ status }: { status?: ExpirationStatus }) {
  if (!status) {
    return (
      <Badge variant="secondary" className="inline-flex items-center gap-1.5">
        <CheckCircle2 className="w-3 h-3" />
        <span>Vouched</span>
      </Badge>
    );
  }

  if (status.isRevoked) {
    return (
      <Badge variant="destructive" className="inline-flex items-center gap-1.5">
        <XCircle className="w-3 h-3" />
        <span>Revoked</span>
      </Badge>
    );
  }

  if (status.isExpired) {
    return (
      <Badge variant="destructive" className="inline-flex items-center gap-1.5">
        <AlertTriangle className="w-3 h-3" />
        <span>Expired</span>
      </Badge>
    );
  }

  const daysLeft = status.daysUntilExpiration;
  
  if (daysLeft !== null && daysLeft <= 14) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="inline-flex items-center gap-1.5 border-yellow-500 text-yellow-600 dark:text-yellow-400">
            <Clock className="w-3 h-3" />
            <span>{daysLeft}d left</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>This vouch expires in {daysLeft} days unless the recipient stays active</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (daysLeft !== null && daysLeft <= 30) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="inline-flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>{daysLeft}d</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Expires in {daysLeft} days unless recipient vouches for someone</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Badge variant="secondary" className="inline-flex items-center gap-1.5 bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20">
      <CheckCircle2 className="w-3 h-3" />
      <span>Active</span>
    </Badge>
  );
}

export function EndorsementsList({ 
  endorsements, 
  onRevoke,
  title = "Your Endorsements",
  emptyMessage = "No endorsements yet",
  showRevokeButton = true
}: EndorsementsListProps) {
  const { toast } = useToast();

  const handleRevoke = (id: string, endorsee: string) => {
    if (onRevoke) {
      onRevoke(id);
    }
    toast({
      title: "Endorsement Revoked",
      description: `Revoked endorsement for ${endorsee}`,
      variant: "destructive",
    });
  };

  return (
    <div data-testid="card-endorsements-list">
      {endorsements.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {endorsements.map((endorsement) => (
            <div
              key={endorsement.id}
              className={`p-4 rounded-lg border flex items-center justify-between gap-4 ${
                endorsement.expirationStatus?.isExpired || endorsement.expirationStatus?.isRevoked
                  ? 'opacity-60 bg-muted/30'
                  : ''
              }`}
              data-testid={`endorsement-${endorsement.id}`}
            >
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm mb-2 truncate" data-testid={`text-endorsee-${endorsement.id}`}>
                  {endorsement.endorsee}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <ExpirationBadge status={endorsement.expirationStatus} />
                  <span className="text-xs text-muted-foreground">
                    {new Date(endorsement.date).toLocaleDateString()}
                  </span>
                </div>
                {endorsement.note && (
                  <div className="text-sm text-foreground mt-2 p-2 rounded bg-muted/50" data-testid={`text-note-${endorsement.id}`}>
                    {endorsement.note}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-1 font-mono truncate">
                  {endorsement.commitment.substring(0, 20)}...
                </div>
              </div>
              {showRevokeButton && !endorsement.expirationStatus?.isRevoked && !endorsement.expirationStatus?.isExpired && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRevoke(endorsement.id, endorsement.endorsee)}
                  data-testid={`button-revoke-${endorsement.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
