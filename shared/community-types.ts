import { z } from "zod";

// Community policy configuration
export interface CommunityPolicy {
  policyId: string;
  promptHash: string;
  acceptance: {
    minCut: number;
    vertexDisjoint: number;
    seedCoverage: {
      minSeeds: number;
      perSeedMinShare: number;
      minSeedScore: number;
    };
  };
  nodeCap: {
    distance: number[]; // Capacity by distance [400, 160, 64, 32, 16]
    laggedDistances: boolean;
  };
  eigentrust: {
    enabled: boolean;
    alpha: number;
    clip: [number, number]; // [min, max] multiplier
  };
  tiers: string[]; // Tier labels
  visibility: "public" | "invite";
}

export const communityPolicySchema = z.object({
  policyId: z.string(),
  promptHash: z.string(),
  acceptance: z.object({
    minCut: z.number().min(2),
    vertexDisjoint: z.number().min(2),
    seedCoverage: z.object({
      minSeeds: z.number().min(2),
      perSeedMinShare: z.number().min(0).max(1),
      minSeedScore: z.number().min(0).max(1),
    }),
  }),
  nodeCap: z.object({
    distance: z.array(z.number()),
    laggedDistances: z.boolean(),
  }),
  eigentrust: z.object({
    enabled: z.boolean(),
    alpha: z.number(),
    clip: z.tuple([z.number(), z.number()]),
  }),
  tiers: z.array(z.string()),
  visibility: z.enum(["public", "invite"]),
});

// Community template for quick setup
export interface CommunityTemplate {
  id: string;
  name: string;
  description: string;
  defaultPrompt: string;
  policy: CommunityPolicy;
  icon?: string;
}

// Default global policy (Community 0)
export const GLOBAL_POLICY: CommunityPolicy = {
  policyId: "global-v1",
  promptHash: "", // Will be set based on actual prompt
  acceptance: {
    minCut: 2,
    vertexDisjoint: 2,
    seedCoverage: {
      minSeeds: 2,
      perSeedMinShare: 0.30,
      minSeedScore: 0.6,
    },
  },
  nodeCap: {
    distance: [400, 160, 64, 32, 16],
    laggedDistances: true,
  },
  eigentrust: {
    enabled: false,
    alpha: 0.85,
    clip: [0.9, 1.1],
  },
  tiers: ["Connected", "Verified", "Trusted"],
  visibility: "public",
};

// Template: Hiring Circle
export const HIRING_TEMPLATE: CommunityTemplate = {
  id: "hiring-v1",
  name: "Hiring Circle",
  description: "Build a trusted network of professionals for short-term work opportunities",
  defaultPrompt: "I would hire this person for a 1-3 hour task",
  policy: {
    policyId: "hiring-v1",
    promptHash: "",
    acceptance: {
      minCut: 2,
      vertexDisjoint: 2,
      seedCoverage: {
        minSeeds: 2,
        perSeedMinShare: 0.40, // Stricter seed coverage
        minSeedScore: 0.65,
      },
    },
    nodeCap: {
      distance: [300, 120, 48, 24, 12], // Tighter capacity decay
      laggedDistances: true,
    },
    eigentrust: {
      enabled: false,
      alpha: 0.85,
      clip: [0.9, 1.1],
    },
    tiers: ["Candidate", "Qualified", "Recommended"],
    visibility: "public",
  },
  icon: "Briefcase",
};

// Template: Lending Pool
export const LENDING_TEMPLATE: CommunityTemplate = {
  id: "lending-v1",
  name: "Micro-Lending Pool",
  description: "Create a peer-to-peer lending network based on trust and repayment history",
  defaultPrompt: "I would lend this member $50 for 14 days",
  policy: {
    policyId: "lending-v1",
    promptHash: "",
    acceptance: {
      minCut: 2,
      vertexDisjoint: 2,
      seedCoverage: {
        minSeeds: 2,
        perSeedMinShare: 0.35,
        minSeedScore: 0.7, // Higher seed quality requirement
      },
    },
    nodeCap: {
      distance: [400, 160, 64, 32, 16],
      laggedDistances: true,
    },
    eigentrust: {
      enabled: true, // Enable for loan outcome tracking
      alpha: 0.85,
      clip: [0.9, 1.1],
    },
    tiers: ["Bronze", "Silver", "Gold"],
    visibility: "public",
  },
  icon: "Coins",
};

// Template: Marketplace Vendor Guild
export const MARKETPLACE_TEMPLATE: CommunityTemplate = {
  id: "marketplace-v1",
  name: "Marketplace Vendor Guild",
  description: "Establish reputation for sellers and service providers with verified delivery history",
  defaultPrompt: "This vendor fulfilled at least 3 orders dispute-free",
  policy: {
    policyId: "marketplace-v1",
    promptHash: "",
    acceptance: {
      minCut: 3, // Higher min-cut requirement
      vertexDisjoint: 2,
      seedCoverage: {
        minSeeds: 2,
        perSeedMinShare: 0.30,
        minSeedScore: 0.65,
      },
    },
    nodeCap: {
      distance: [400, 160, 64, 32, 16],
      laggedDistances: true,
    },
    eigentrust: {
      enabled: true, // Track delivery outcomes
      alpha: 0.85,
      clip: [0.9, 1.1],
    },
    tiers: ["Merchant", "Trusted Vendor", "Elite Seller"],
    visibility: "public",
  },
  icon: "ShoppingBag",
};

// Custom template - user provides all details
export const CUSTOM_TEMPLATE: CommunityTemplate = {
  id: "custom-v1",
  name: "Custom Community",
  description: "Create your own trust network with fully customizable settings",
  defaultPrompt: "I vouch for this person",
  policy: GLOBAL_POLICY,
  icon: "Settings",
};

// All available templates
export const COMMUNITY_TEMPLATES: CommunityTemplate[] = [
  HIRING_TEMPLATE,
  LENDING_TEMPLATE,
  MARKETPLACE_TEMPLATE,
  CUSTOM_TEMPLATE,
];

// Get template by ID
export function getTemplate(id: string): CommunityTemplate | undefined {
  return COMMUNITY_TEMPLATES.find(t => t.id === id);
}

// Helper to create prompt hash (keccak256)
// This is a placeholder on shared - real implementation is on backend
export function createPromptHash(promptText: string): string {
  // This function should only be called from backend where proper crypto is available
  // Frontend should never call this directly
  throw new Error("createPromptHash must be called from backend with proper keccak256");
}
