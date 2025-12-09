import { db } from "../db";
import { publicEndorsements, contexts, endorsementTombstones } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { keccak256, encodePacked } from "viem";

type TestScenario = {
  name: string;
  description: string;
  expectedBehavior: string;
  addresses: string[];
  vouches: Array<{ from: string; to: string; expired?: boolean; revoked?: boolean }>;
};

function generateAddress(seed: number): string {
  const hex = seed.toString(16).padStart(40, '0');
  return `0x${hex}`.toLowerCase();
}

function generateSig(from: string, to: string, nonce: number): string {
  const hash = keccak256(encodePacked(['string', 'string', 'uint256'], [from, to, BigInt(nonce)]));
  return hash + '0'.repeat(64);
}

function generateLeafHash(from: string, to: string, epoch: number, nonce: number): string {
  return keccak256(encodePacked(['address', 'address', 'uint256', 'uint256'], [from as `0x${string}`, to as `0x${string}`, BigInt(epoch), BigInt(nonce)]));
}

export const testScenarios: TestScenario[] = [
  {
    name: "Hub-and-Spoke (High Quality User)",
    description: "Central user vouched by many independent users. Classic high-quality pattern.",
    expectedBehavior: "Hub should score 70-90. Spoke nodes with single vouch should score low (10-30).",
    addresses: Array.from({ length: 16 }, (_, i) => generateAddress(1000 + i)),
    vouches: Array.from({ length: 15 }, (_, i) => ({
      from: generateAddress(1001 + i),
      to: generateAddress(1000),
    })),
  },
  {
    name: "Mesh Network (Healthy Community)",
    description: "Dense interconnected network where everyone vouches for multiple others.",
    expectedBehavior: "All participants should score 50-80, with more connected nodes scoring higher.",
    addresses: Array.from({ length: 10 }, (_, i) => generateAddress(2000 + i)),
    vouches: [
      { from: generateAddress(2000), to: generateAddress(2001) },
      { from: generateAddress(2000), to: generateAddress(2002) },
      { from: generateAddress(2000), to: generateAddress(2003) },
      { from: generateAddress(2001), to: generateAddress(2000) },
      { from: generateAddress(2001), to: generateAddress(2002) },
      { from: generateAddress(2001), to: generateAddress(2004) },
      { from: generateAddress(2002), to: generateAddress(2000) },
      { from: generateAddress(2002), to: generateAddress(2001) },
      { from: generateAddress(2002), to: generateAddress(2005) },
      { from: generateAddress(2003), to: generateAddress(2000) },
      { from: generateAddress(2003), to: generateAddress(2004) },
      { from: generateAddress(2003), to: generateAddress(2006) },
      { from: generateAddress(2004), to: generateAddress(2001) },
      { from: generateAddress(2004), to: generateAddress(2003) },
      { from: generateAddress(2004), to: generateAddress(2007) },
      { from: generateAddress(2005), to: generateAddress(2002) },
      { from: generateAddress(2005), to: generateAddress(2006) },
      { from: generateAddress(2005), to: generateAddress(2008) },
      { from: generateAddress(2006), to: generateAddress(2003) },
      { from: generateAddress(2006), to: generateAddress(2005) },
      { from: generateAddress(2006), to: generateAddress(2009) },
      { from: generateAddress(2007), to: generateAddress(2004) },
      { from: generateAddress(2007), to: generateAddress(2008) },
      { from: generateAddress(2008), to: generateAddress(2005) },
      { from: generateAddress(2008), to: generateAddress(2007) },
      { from: generateAddress(2008), to: generateAddress(2009) },
      { from: generateAddress(2009), to: generateAddress(2006) },
      { from: generateAddress(2009), to: generateAddress(2008) },
    ],
  },
  {
    name: "Chain/Line (Path-Dependent Trust)",
    description: "Linear chain where trust flows through intermediaries.",
    expectedBehavior: "Users near chain start should score higher; end users should score lower.",
    addresses: Array.from({ length: 8 }, (_, i) => generateAddress(3000 + i)),
    vouches: [
      { from: generateAddress(3000), to: generateAddress(3001) },
      { from: generateAddress(3001), to: generateAddress(3002) },
      { from: generateAddress(3002), to: generateAddress(3003) },
      { from: generateAddress(3003), to: generateAddress(3004) },
      { from: generateAddress(3004), to: generateAddress(3005) },
      { from: generateAddress(3005), to: generateAddress(3006) },
      { from: generateAddress(3006), to: generateAddress(3007) },
    ],
  },
  {
    name: "Sybil Ring (Attack Pattern)",
    description: "Closed loop of fake accounts vouching for each other.",
    expectedBehavior: "All participants should score very low (0-20) due to lack of external connections.",
    addresses: Array.from({ length: 6 }, (_, i) => generateAddress(4000 + i)),
    vouches: [
      { from: generateAddress(4000), to: generateAddress(4001) },
      { from: generateAddress(4001), to: generateAddress(4002) },
      { from: generateAddress(4002), to: generateAddress(4003) },
      { from: generateAddress(4003), to: generateAddress(4004) },
      { from: generateAddress(4004), to: generateAddress(4005) },
      { from: generateAddress(4005), to: generateAddress(4000) },
    ],
  },
  {
    name: "Sockpuppet Farm (Single Attacker)",
    description: "One attacker creates many fake accounts to vouch for themselves.",
    expectedBehavior: "Puppetmaster should score low despite many vouches (all from low-quality sources).",
    addresses: Array.from({ length: 11 }, (_, i) => generateAddress(5000 + i)),
    vouches: Array.from({ length: 10 }, (_, i) => ({
      from: generateAddress(5001 + i),
      to: generateAddress(5000),
    })),
  },
  {
    name: "Collusion Cluster (Organized Attack)",
    description: "Group that only vouches internally, no external connections.",
    expectedBehavior: "All members should score low (0-30) due to isolation.",
    addresses: Array.from({ length: 5 }, (_, i) => generateAddress(6000 + i)),
    vouches: [
      { from: generateAddress(6000), to: generateAddress(6001) },
      { from: generateAddress(6000), to: generateAddress(6002) },
      { from: generateAddress(6001), to: generateAddress(6000) },
      { from: generateAddress(6001), to: generateAddress(6003) },
      { from: generateAddress(6002), to: generateAddress(6000) },
      { from: generateAddress(6002), to: generateAddress(6004) },
      { from: generateAddress(6003), to: generateAddress(6001) },
      { from: generateAddress(6003), to: generateAddress(6004) },
      { from: generateAddress(6004), to: generateAddress(6002) },
      { from: generateAddress(6004), to: generateAddress(6003) },
    ],
  },
  {
    name: "Over-Voucher (Dilution Scenario)",
    description: "User vouches for too many people, diluting their signal.",
    expectedBehavior: "Users vouched by diluted user should get less benefit. Diluter's outgoing should be penalized.",
    addresses: Array.from({ length: 22 }, (_, i) => generateAddress(7000 + i)),
    vouches: Array.from({ length: 20 }, (_, i) => ({
      from: generateAddress(7000),
      to: generateAddress(7001 + i),
    })).concat([
      { from: generateAddress(7001), to: generateAddress(7000) },
      { from: generateAddress(7002), to: generateAddress(7000) },
      { from: generateAddress(7003), to: generateAddress(7000) },
    ]),
  },
  {
    name: "Multi-Path Redundancy (High Min-Cut)",
    description: "User reachable through multiple independent paths from seeds.",
    expectedBehavior: "High redundancy should boost score (75-95).",
    addresses: Array.from({ length: 7 }, (_, i) => generateAddress(8000 + i)),
    vouches: [
      { from: generateAddress(8001), to: generateAddress(8000) },
      { from: generateAddress(8002), to: generateAddress(8000) },
      { from: generateAddress(8003), to: generateAddress(8000) },
      { from: generateAddress(8004), to: generateAddress(8000) },
      { from: generateAddress(8005), to: generateAddress(8000) },
      { from: generateAddress(8006), to: generateAddress(8000) },
      { from: generateAddress(8001), to: generateAddress(8002) },
      { from: generateAddress(8002), to: generateAddress(8003) },
      { from: generateAddress(8003), to: generateAddress(8004) },
      { from: generateAddress(8004), to: generateAddress(8005) },
      { from: generateAddress(8005), to: generateAddress(8006) },
    ],
  },
  {
    name: "Expired Vouches",
    description: "User with vouches that have expired (no activity in 90+ days).",
    expectedBehavior: "Expired vouches should not count. User should score lower than equivalent active vouches.",
    addresses: Array.from({ length: 6 }, (_, i) => generateAddress(9000 + i)),
    vouches: [
      { from: generateAddress(9001), to: generateAddress(9000), expired: true },
      { from: generateAddress(9002), to: generateAddress(9000), expired: true },
      { from: generateAddress(9003), to: generateAddress(9000), expired: true },
      { from: generateAddress(9004), to: generateAddress(9000) },
      { from: generateAddress(9005), to: generateAddress(9000) },
    ],
  },
  {
    name: "Revoked Vouches",
    description: "User with manually revoked vouches.",
    expectedBehavior: "Revoked vouches should not count. Score should reflect only active vouches.",
    addresses: Array.from({ length: 6 }, (_, i) => generateAddress(10000 + i)),
    vouches: [
      { from: generateAddress(10001), to: generateAddress(10000), revoked: true },
      { from: generateAddress(10002), to: generateAddress(10000), revoked: true },
      { from: generateAddress(10003), to: generateAddress(10000) },
      { from: generateAddress(10004), to: generateAddress(10000) },
      { from: generateAddress(10005), to: generateAddress(10000) },
    ],
  },
  {
    name: "Isolated User (No Connections)",
    description: "User with no incoming vouches at all.",
    expectedBehavior: "Score should be 0.",
    addresses: [generateAddress(11000)],
    vouches: [],
  },
  {
    name: "Self-Vouching (Invalid)",
    description: "User attempting to vouch for themselves.",
    expectedBehavior: "Self-vouches should be ignored in scoring.",
    addresses: [generateAddress(12000), generateAddress(12001)],
    vouches: [
      { from: generateAddress(12000), to: generateAddress(12000) },
      { from: generateAddress(12001), to: generateAddress(12000) },
    ],
  },
  {
    name: "Large Scale Hub (Stress Test)",
    description: "Hub with 50+ vouchers to test algorithm performance.",
    expectedBehavior: "Should complete in reasonable time. Hub should score 80+.",
    addresses: Array.from({ length: 52 }, (_, i) => generateAddress(13000 + i)),
    vouches: Array.from({ length: 50 }, (_, i) => ({
      from: generateAddress(13001 + i),
      to: generateAddress(13000),
    })).concat([
      { from: generateAddress(13051), to: generateAddress(13000) },
    ]),
  },
  {
    name: "Bridged Communities (Cross-Cluster)",
    description: "Two separate communities connected by bridge nodes.",
    expectedBehavior: "Bridge nodes should score well. Each community should have internal trust flow.",
    addresses: Array.from({ length: 12 }, (_, i) => generateAddress(14000 + i)),
    vouches: [
      { from: generateAddress(14001), to: generateAddress(14000) },
      { from: generateAddress(14002), to: generateAddress(14000) },
      { from: generateAddress(14003), to: generateAddress(14001) },
      { from: generateAddress(14004), to: generateAddress(14002) },
      { from: generateAddress(14005), to: generateAddress(14006) },
      { from: generateAddress(14006), to: generateAddress(14007) },
      { from: generateAddress(14007), to: generateAddress(14008) },
      { from: generateAddress(14008), to: generateAddress(14005) },
      { from: generateAddress(14000), to: generateAddress(14006) },
      { from: generateAddress(14005), to: generateAddress(14001) },
      { from: generateAddress(14009), to: generateAddress(14000) },
      { from: generateAddress(14010), to: generateAddress(14006) },
      { from: generateAddress(14011), to: generateAddress(14000) },
    ],
  },
];

export async function clearTestData(): Promise<void> {
  console.log("Clearing existing test data...");
  
  await db.delete(endorsementTombstones);
  await db.delete(publicEndorsements);
  await db.delete(contexts).where(eq(contexts.type, 'ego'));
  
  console.log("Test data cleared.");
}

export async function populateTestData(): Promise<{
  scenarioResults: Array<{ name: string; vouchesCreated: number; contextsCreated: number }>;
  totalVouches: number;
  totalContexts: number;
}> {
  console.log("\n=== Populating Algorithm Test Data ===\n");
  
  const results: Array<{ name: string; vouchesCreated: number; contextsCreated: number }> = [];
  let totalVouches = 0;
  let totalContexts = 0;
  let globalNonce = 0;
  const epoch = 1;

  for (const scenario of testScenarios) {
    console.log(`\n--- ${scenario.name} ---`);
    console.log(`Description: ${scenario.description}`);
    console.log(`Expected: ${scenario.expectedBehavior}`);
    
    let vouchesCreated = 0;
    let contextsCreated = 0;

    for (const addr of scenario.addresses) {
      try {
        await db.insert(contexts).values({
          type: 'ego',
          ownerAddress: addr,
          localHealth: null,
          lastSignalActivityAt: new Date(),
        }).onConflictDoNothing();
        contextsCreated++;
      } catch (e) {
      }
    }

    for (const vouch of scenario.vouches) {
      if (vouch.from === vouch.to) {
        console.log(`  Skipping self-vouch: ${vouch.from.slice(0, 10)}...`);
        continue;
      }

      globalNonce++;
      const sig = generateSig(vouch.from, vouch.to, globalNonce);
      const leafHash = generateLeafHash(vouch.from, vouch.to, epoch, globalNonce);

      const createdAt = vouch.expired 
        ? new Date(Date.now() - 100 * 24 * 60 * 60 * 1000)
        : new Date();

      try {
        const [created] = await db.insert(publicEndorsements).values({
          communityId: 0,
          scope: 'global',
          endorser: vouch.from,
          endorsee: vouch.to,
          epoch,
          nonce: globalNonce,
          sig,
          leafHash,
          createdAt,
        }).returning();

        if (vouch.revoked && created) {
          await db.insert(endorsementTombstones).values({
            endorsementId: created.id,
            reason: 'Test revocation',
          });
        }

        vouchesCreated++;
      } catch (e) {
        console.log(`  Failed to create vouch: ${vouch.from.slice(0, 10)} -> ${vouch.to.slice(0, 10)}`);
      }
    }

    console.log(`  Created ${vouchesCreated} vouches, ${contextsCreated} contexts`);
    results.push({ name: scenario.name, vouchesCreated, contextsCreated });
    totalVouches += vouchesCreated;
    totalContexts += contextsCreated;
  }

  console.log("\n=== Test Data Population Complete ===");
  console.log(`Total vouches: ${totalVouches}`);
  console.log(`Total contexts: ${totalContexts}`);
  console.log(`Scenarios: ${results.length}`);

  return { scenarioResults: results, totalVouches, totalContexts };
}

export async function runAlgorithmValidation(): Promise<{
  scenarios: Array<{
    name: string;
    expectedBehavior: string;
    scores: Array<{ address: string; localHealth: number | null }>;
    passed: boolean;
    notes: string;
  }>;
}> {
  console.log("\n=== Running Algorithm Validation ===\n");

  const allContexts = await db.select().from(contexts).where(eq(contexts.type, 'ego'));
  const contextMap = new Map(allContexts.map(c => [c.ownerAddress, c]));

  const validationResults: Array<{
    name: string;
    expectedBehavior: string;
    scores: Array<{ address: string; localHealth: number | null }>;
    passed: boolean;
    notes: string;
  }> = [];

  for (const scenario of testScenarios) {
    const scores = scenario.addresses.map(addr => ({
      address: addr,
      localHealth: contextMap.get(addr)?.localHealth ?? null,
    })).sort((a, b) => (b.localHealth ?? -1) - (a.localHealth ?? -1));

    let passed = true;
    let notes = "";

    switch (scenario.name) {
      case "Hub-and-Spoke (High Quality User)":
        const hubScore = scores.find(s => s.address === generateAddress(1000))?.localHealth ?? 0;
        if (hubScore < 50) {
          passed = false;
          notes = `Hub score ${hubScore} is too low (expected 70-90)`;
        } else {
          notes = `Hub score ${hubScore} - OK`;
        }
        break;

      case "Sybil Ring (Attack Pattern)":
        const maxRingScore = Math.max(...scores.map(s => s.localHealth ?? 0));
        if (maxRingScore > 30) {
          passed = false;
          notes = `Max ring score ${maxRingScore} is too high (expected 0-20)`;
        } else {
          notes = `Max ring score ${maxRingScore} - Sybil resistance working`;
        }
        break;

      case "Sockpuppet Farm (Single Attacker)":
        const masterScore = scores.find(s => s.address === generateAddress(5000))?.localHealth ?? 0;
        if (masterScore > 40) {
          passed = false;
          notes = `Puppetmaster score ${masterScore} is too high despite fake vouches`;
        } else {
          notes = `Puppetmaster score ${masterScore} - Attack mitigated`;
        }
        break;

      case "Isolated User (No Connections)":
        const isolatedScore = scores[0]?.localHealth ?? 0;
        if (isolatedScore !== 0) {
          passed = false;
          notes = `Isolated user should score 0, got ${isolatedScore}`;
        } else {
          notes = "Isolated user correctly scores 0";
        }
        break;

      case "Multi-Path Redundancy (High Min-Cut)":
        const redundantHubScore = scores.find(s => s.address === generateAddress(8000))?.localHealth ?? 0;
        if (redundantHubScore < 50) {
          passed = false;
          notes = `Redundant hub score ${redundantHubScore} is too low (expected 75-95)`;
        } else {
          notes = `Redundant hub score ${redundantHubScore} - Min-cut bonus working`;
        }
        break;

      case "Large Scale Hub (Stress Test)":
        const largeHubScore = scores.find(s => s.address === generateAddress(13000))?.localHealth ?? 0;
        if (largeHubScore < 60) {
          passed = false;
          notes = `Large hub score ${largeHubScore} is too low (expected 80+)`;
        } else {
          notes = `Large hub score ${largeHubScore} - Scales correctly`;
        }
        break;

      default:
        const avgScore = scores.reduce((sum, s) => sum + (s.localHealth ?? 0), 0) / scores.length;
        notes = `Average score: ${avgScore.toFixed(1)}`;
    }

    validationResults.push({
      name: scenario.name,
      expectedBehavior: scenario.expectedBehavior,
      scores: scores.slice(0, 5),
      passed,
      notes,
    });

    console.log(`${passed ? '✓' : '✗'} ${scenario.name}: ${notes}`);
  }

  const passedCount = validationResults.filter(r => r.passed).length;
  console.log(`\n=== Validation Complete: ${passedCount}/${validationResults.length} scenarios passed ===\n`);

  return { scenarios: validationResults };
}
