import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreLevelBadge, type ScoreLevel } from "./TrustLevelBadge";
import { ArrowRight } from "lucide-react";

interface Activity {
  id: string;
  type: "endorsement" | "score_update";
  endorser?: string;
  endorsee?: string;
  level?: ScoreLevel;
  timestamp: string;
  user?: string;
  newScore?: number;
}

interface RecentActivityProps {
  activities: Activity[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <Card data-testid="card-recent-activity">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
        <p className="text-sm text-muted-foreground">
          Latest endorsements (Human/Known/Trusted) and score updates
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
              data-testid={`activity-${activity.id}`}
            >
              {activity.type === "endorsement" && (
                <>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 text-sm flex-wrap">
                      <span className="font-mono truncate">{activity.endorser}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="font-mono truncate">{activity.endorsee}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      {activity.level && <ScoreLevelBadge level={activity.level} showIcon={false} />}
                      <span className="text-xs text-muted-foreground">
                        {new Date(activity.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </>
              )}
              {activity.type === "score_update" && (
                <div className="flex-1">
                  <div className="text-sm">
                    <span className="font-mono">{activity.user}</span>
                    <span className="text-muted-foreground"> STS updated</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-bold">{activity.newScore}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(activity.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
