import { sql } from "drizzle-orm";
import { pgTable, text, varchar, bigint, integer, timestamp, bigserial, smallint, boolean, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Communities table - each community is an isolated trust graph
export const communities = pgTable("communities", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  promptText: text("prompt_text").notNull(),
  promptHash: text("prompt_hash").notNull(),
  policyId: text("policy_id").notNull(),
  policyJson: jsonb("policy_json").notNull(), // JSONB for proper policy storage
  visibility: text("visibility").notNull().default("public"), // 'public' | 'invite'
  creator: text("creator").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCommunitySchema = createInsertSchema(communities).omit({
  id: true,
  createdAt: true,
});

export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type Community = typeof communities.$inferSelect;

export const publicEndorsements = pgTable("public_endorsements", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  communityId: bigint("community_id", { mode: "number" }).notNull().default(0), // 0 = global graph
  endorser: text("endorser").notNull(),
  endorsee: text("endorsee").notNull(),
  epoch: bigint("epoch", { mode: "number" }).notNull(),
  nonce: bigint("nonce", { mode: "number" }).notNull(),
  sig: text("sig").notNull(),
  leafHash: text("leaf_hash").notNull(),
  promptHash: text("prompt_hash"), // keccak256(prompt_text) for verification
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPublicEndorsementSchema = createInsertSchema(publicEndorsements).omit({
  id: true,
  createdAt: true,
});

export type InsertPublicEndorsement = z.infer<typeof insertPublicEndorsementSchema>;
export type PublicEndorsement = typeof publicEndorsements.$inferSelect;

export const endorsementTombstones = pgTable("endorsement_tombstones", {
  endorsementId: bigint("endorsement_id", { mode: "number" }).primaryKey().references(() => publicEndorsements.id),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEndorsementTombstoneSchema = createInsertSchema(endorsementTombstones).omit({
  createdAt: true,
});

export type InsertEndorsementTombstone = z.infer<typeof insertEndorsementTombstoneSchema>;
export type EndorsementTombstone = typeof endorsementTombstones.$inferSelect;

export const treeHeads = pgTable("tree_heads", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  treeSize: bigint("tree_size", { mode: "number" }).notNull(),
  root: text("root").notNull(),
  timestamp: bigint("timestamp", { mode: "number" }).notNull(),
  sig: text("sig").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTreeHeadSchema = createInsertSchema(treeHeads).omit({
  id: true,
  createdAt: true,
});

export type InsertTreeHead = z.infer<typeof insertTreeHeadSchema>;
export type TreeHead = typeof treeHeads.$inferSelect;

export const epochs = pgTable("epochs", {
  id: bigint("id", { mode: "number" }).notNull(),
  communityId: bigint("community_id", { mode: "number" }).notNull().default(0), // 0 = global graph
  status: text("status").notNull().default("active"), // 'active' or 'closed'
  graphRoot: text("graph_root"),
  seedRoot: text("seed_root"),
  paramsHash: text("params_hash"),
  scoresHash: text("scores_hash"),
  signature: text("signature"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  pk: { primaryKey: [table.communityId, table.id] },
}));

export const insertEpochSchema = createInsertSchema(epochs).omit({
  createdAt: true,
});

export type InsertEpoch = z.infer<typeof insertEpochSchema>;
export type Epoch = typeof epochs.$inferSelect;

export const epochHealth = pgTable("epoch_health", {
  epochId: bigint("epoch_id", { mode: "number" }).notNull(),
  communityId: bigint("community_id", { mode: "number" }).notNull().default(0),
  ghi: integer("ghi").notNull(),
  sizeN: integer("size_n").notNull(),
  cutN: integer("cut_n").notNull(),
  churnN: integer("churn_n").notNull(),
  rawAcceptedCount: integer("raw_accepted_count").notNull(),
  rawAvgMinCut: doublePrecision("raw_avg_min_cut").notNull(),
  rawChurnStability: doublePrecision("raw_churn_stability").notNull(),
  maxSeedShare: doublePrecision("max_seed_share"),
  maxSeedAddress: text("max_seed_address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  pk: { primaryKey: [table.communityId, table.epochId] },
}));

export const insertEpochHealthSchema = createInsertSchema(epochHealth).omit({
  createdAt: true,
});

export type InsertEpochHealth = z.infer<typeof insertEpochHealthSchema>;
export type EpochHealth = typeof epochHealth.$inferSelect;

export const seeds = pgTable("seeds", {
  address: text("address").notNull(),
  communityId: bigint("community_id", { mode: "number" }).notNull().default(0),
  addedBy: text("added_by"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  pk: { primaryKey: [table.communityId, table.address] },
}));

export const insertSeedSchema = createInsertSchema(seeds).omit({
  createdAt: true,
});

export type InsertSeed = z.infer<typeof insertSeedSchema>;
export type Seed = typeof seeds.$inferSelect;

export const scores = pgTable("scores", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  communityId: bigint("community_id", { mode: "number" }).notNull().default(0),
  address: text("address").notNull(),
  epochId: bigint("epoch_id", { mode: "number" }).notNull(),
  sts: doublePrecision("sts").notNull(),
  flow: doublePrecision("flow").notNull(),
  minCut: doublePrecision("min_cut").notNull(),
  stability: doublePrecision("stability").notNull(),
  depth: doublePrecision("depth").notNull(),
  pageRank: doublePrecision("page_rank").default(0).notNull(),
  // Normalized components (0-1) for UI display
  normalizedFlow: doublePrecision("normalized_flow"),
  normalizedMinCut: doublePrecision("normalized_min_cut"),
  normalizedStability: doublePrecision("normalized_stability"),
  normalizedDepth: doublePrecision("normalized_depth"),
  normalizedPageRank: doublePrecision("normalized_page_rank"),
  tier: text("tier"),
  percentile: doublePrecision("percentile").notNull(),
  isAccepted: boolean("is_accepted").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScoreSchema = createInsertSchema(scores).omit({
  id: true,
  createdAt: true,
});

export type InsertScore = z.infer<typeof insertScoreSchema>;
export type Score = typeof scores.$inferSelect;
