import { GlobalStats } from '../GlobalStats'

export default function GlobalStatsExample() {
  return (
    <GlobalStats
      stats={{
        totalUsers: 12453,
        totalEndorsements: 28917,
        totalEndorsers: 8734,
        totalEndorsees: 9821,
        trustedUsers: 1842,
        avgScore: 0.87,
      }}
    />
  )
}
