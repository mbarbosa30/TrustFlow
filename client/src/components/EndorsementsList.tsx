import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrustLevelBadge, type TrustLevel } from "./TrustLevelBadge";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface Endorsement {
  id: string;
  endorsee: string;
  level: TrustLevel;
  date: string;
  commitment: string;
}

interface EndorsementsListProps {
  endorsements: Endorsement[];
  onRevoke?: (id: string) => void;
}

export function EndorsementsList({ endorsements, onRevoke }: EndorsementsListProps) {
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
    <Card data-testid="card-endorsements-list">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Your Endorsements</CardTitle>
        <p className="text-sm text-muted-foreground">
          {endorsements.length} active endorsement{endorsements.length !== 1 ? "s" : ""}
        </p>
      </CardHeader>
      <CardContent>
        {endorsements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No endorsements yet</p>
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
                    <TrustLevelBadge level={endorsement.level} showIcon={false} />
                    <span className="text-xs text-muted-foreground">
                      {new Date(endorsement.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 font-mono truncate">
                    {endorsement.commitment.substring(0, 20)}...
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRevoke(endorsement.id, endorsement.endorsee)}
                  data-testid={`button-revoke-${endorsement.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
