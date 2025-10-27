import { FlowPathVisualization } from '../FlowPathVisualization'

export default function FlowPathVisualizationExample() {
  const mockPaths = [
    {
      nodes: [
        { id: "seed1", label: "Seed", isAnonymous: false },
        { id: "anon1", label: "0x1234", isAnonymous: true },
        { id: "anon2", label: "0x5678", isAnonymous: true },
        { id: "you", label: "You", isAnonymous: false },
      ],
    },
    {
      nodes: [
        { id: "seed2", label: "Seed", isAnonymous: false },
        { id: "anon3", label: "0xabcd", isAnonymous: true },
        { id: "you2", label: "You", isAnonymous: false },
      ],
    },
    {
      nodes: [
        { id: "seed3", label: "Seed", isAnonymous: false },
        { id: "known1", label: "0x9abc", isAnonymous: false },
        { id: "you3", label: "You", isAnonymous: false },
      ],
    },
  ];

  return (
    <div className="max-w-2xl">
      <FlowPathVisualization paths={mockPaths} />
    </div>
  )
}
