import { GlobalStats } from "@/components/GlobalStats";
import { RecentActivity } from "@/components/RecentActivity";
import { TrustDistribution } from "@/components/TrustDistribution";
import { AcceptedUsersChart } from "@/components/AcceptedUsersChart";
import { STSHistogram } from "@/components/STSHistogram";
import { EndorsementMixChart } from "@/components/EndorsementMixChart";
import { PathDiversityChart } from "@/components/PathDiversityChart";

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

  const mockAcceptedUsers = [
    { epoch: "Oct 20", apprentice: 4200, journeyer: 2100, master: 800 },
    { epoch: "Oct 21", apprentice: 4400, journeyer: 2250, master: 850 },
    { epoch: "Oct 22", apprentice: 4650, journeyer: 2400, master: 920 },
    { epoch: "Oct 23", apprentice: 4900, journeyer: 2550, master: 980 },
    { epoch: "Oct 24", apprentice: 5150, journeyer: 2700, master: 1050 },
    { epoch: "Oct 25", apprentice: 5400, journeyer: 2850, master: 1120 },
    { epoch: "Oct 26", apprentice: 5700, journeyer: 3000, master: 1200 },
    { epoch: "Oct 27", apprentice: 6250, journeyer: 4361, master: 1842 },
  ];

  const mockSTSDistribution = [
    { bin: "0-10", count: 120 },
    { bin: "10-20", count: 340 },
    { bin: "20-30", count: 820 },
    { bin: "30-40", count: 1450 },
    { bin: "40-50", count: 2100 },
    { bin: "50-60", count: 2600 },
    { bin: "60-70", count: 2200 },
    { bin: "70-80", count: 1500 },
    { bin: "80-90", count: 780 },
    { bin: "90-100", count: 543 },
  ];

  const mockEndorsementMix = [
    { epoch: "Oct 20", human: 8200, known: 5400, trusted: 2800 },
    { epoch: "Oct 21", human: 8500, known: 5600, trusted: 2950 },
    { epoch: "Oct 22", human: 8900, known: 5850, trusted: 3100 },
    { epoch: "Oct 23", human: 9300, known: 6100, trusted: 3280 },
    { epoch: "Oct 24", human: 9700, known: 6400, trusted: 3450 },
    { epoch: "Oct 25", human: 10200, known: 6700, trusted: 3650 },
    { epoch: "Oct 26", human: 10800, known: 7050, trusted: 3870 },
    { epoch: "Oct 27", human: 14500, known: 9600, trusted: 4817 },
  ];

  const mockPathDiversity = [
    { epoch: "Oct 20", min: 0.35, p25: 0.52, median: 0.68, p75: 0.81, max: 0.95 },
    { epoch: "Oct 21", min: 0.38, p25: 0.54, median: 0.69, p75: 0.82, max: 0.96 },
    { epoch: "Oct 22", min: 0.40, p25: 0.56, median: 0.71, p75: 0.83, max: 0.96 },
    { epoch: "Oct 23", min: 0.42, p25: 0.58, median: 0.72, p75: 0.84, max: 0.97 },
    { epoch: "Oct 24", min: 0.43, p25: 0.59, median: 0.73, p75: 0.85, max: 0.97 },
    { epoch: "Oct 25", min: 0.45, p25: 0.61, median: 0.74, p75: 0.86, max: 0.98 },
    { epoch: "Oct 26", min: 0.47, p25: 0.63, median: 0.76, p75: 0.87, max: 0.98 },
    { epoch: "Oct 27", min: 0.48, p25: 0.64, median: 0.77, p75: 0.88, max: 0.99 },
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
          <AcceptedUsersChart data={mockAcceptedUsers} />
          <STSHistogram 
            distribution={mockSTSDistribution}
            percentiles={{ p25: 42, p50: 58, p75: 74, p95: 89 }}
          />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <EndorsementMixChart data={mockEndorsementMix} />
          <PathDiversityChart data={mockPathDiversity} />
        </div>
        
        <div className="grid lg:grid-cols-2 gap-6">
          <RecentActivity activities={mockActivities} />
          <TrustDistribution distribution={mockDistribution} />
        </div>
      </div>
    </div>
  );
}
