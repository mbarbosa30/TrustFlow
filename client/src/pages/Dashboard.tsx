import { GlobalStats } from "@/components/GlobalStats";
import { RecentActivity } from "@/components/RecentActivity";
import { TrustDistribution } from "@/components/TrustDistribution";

export default function Dashboard() {
  // TODO: remove mock functionality
  const mockStats = {
    totalUsers: 12453,
    totalEndorsements: 28917,
    trustedUsers: 1842,
    avgScore: 0.87,
  };

  const mockActivities = [
    {
      id: "1",
      type: "endorsement" as const,
      endorser: "0x742d...5f0bEb",
      endorsee: "alice.eth",
      level: "Trusted" as const,
      timestamp: "2025-10-27T14:30:00Z",
    },
    {
      id: "2",
      type: "score_update" as const,
      user: "bob.eth",
      newScore: 2.15,
      timestamp: "2025-10-27T14:15:00Z",
    },
    {
      id: "3",
      type: "endorsement" as const,
      endorser: "charlie.eth",
      endorsee: "0x1234...5678",
      level: "Known" as const,
      timestamp: "2025-10-27T14:00:00Z",
    },
    {
      id: "4",
      type: "endorsement" as const,
      endorser: "0xabcd...ef01",
      endorsee: "dave.eth",
      level: "Human" as const,
      timestamp: "2025-10-27T13:45:00Z",
    },
    {
      id: "5",
      type: "score_update" as const,
      user: "emma.eth",
      newScore: 1.42,
      timestamp: "2025-10-27T13:30:00Z",
    },
  ];

  const mockDistribution = [
    { level: "Trusted" as const, count: 1842, percentage: 15 },
    { level: "Known" as const, count: 4361, percentage: 35 },
    { level: "Human" as const, count: 6250, percentage: 50 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Network Dashboard</h1>
        <p className="text-muted-foreground">
          Global statistics and activity across the trust network
        </p>
      </div>

      <div className="space-y-6">
        <GlobalStats stats={mockStats} />
        
        <div className="grid lg:grid-cols-2 gap-6">
          <RecentActivity activities={mockActivities} />
          <TrustDistribution distribution={mockDistribution} />
        </div>
      </div>
    </div>
  );
}
