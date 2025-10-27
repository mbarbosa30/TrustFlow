import { RecentActivity } from '../RecentActivity'

export default function RecentActivityExample() {
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
  ];

  return (
    <div className="max-w-2xl">
      <RecentActivity activities={mockActivities} />
    </div>
  )
}
