import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Endorsement {
  id: string;
  endorsee: string;
  date: string;
  commitment: string;
  note?: string;
}

interface EndorsementsListProps {
  endorsements: Endorsement[];
  onRevoke?: (id: string) => void;
  title?: string;
  emptyMessage?: string;
  showRevokeButton?: boolean;
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
              className="p-4 rounded-lg border flex items-center justify-between gap-4"
              data-testid={`endorsement-${endorsement.id}`}
            >
              <div className="flex-1 min-w-0">
                <div className="font-mono text-sm mb-2 truncate" data-testid={`text-endorsee-${endorsement.id}`}>
                  {endorsement.endorsee}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Vouched</span>
                  </Badge>
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
              {showRevokeButton && (
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
