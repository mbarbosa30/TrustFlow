import { sql } from "drizzle-orm";
import { pgTable, text, varchar, bigint, integer, timestamp, bigserial, smallint, boolean, doublePrecision } from "drizzle-orm/pg-core";
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

export const publicEndorsements = pgTable("public_endorsements", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  endorser: text("endorser").notNull(),
  endorsee: text("endorsee").notNull(),
  epoch: bigint("epoch", { mode: "number" }).notNull(),
  nonce: bigint("nonce", { mode: "number" }).notNull(),
  sig: text("sig").notNull(),
  leafHash: text("leaf_hash").notNull(),
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
  id: bigint("id", { mode: "number" }).primaryKey(),
  graphRoot: text("graph_root"),
  seedRoot: text("seed_root"),
  paramsHash: text("params_hash"),
  scoresHash: text("scores_hash"),
  signature: text("signature"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEpochSchema = createInsertSchema(epochs).omit({
  createdAt: true,
});

export type InsertEpoch = z.infer<typeof insertEpochSchema>;
export type Epoch = typeof epochs.$inferSelect;

export const epochHealth = pgTable("epoch_health", {
  epochId: bigint("epoch_id", { mode: "number" }).primaryKey(),
  ghi: integer("ghi").notNull(),
  sizeN: integer("size_n").notNull(),
  cutN: integer("cut_n").notNull(),
  churnN: integer("churn_n").notNull(),
  rawAcceptedCount: integer("raw_accepted_count").notNull(),
  rawAvgMinCut: doublePrecision("raw_avg_min_cut").notNull(),
  rawChurnStability: doublePrecision("raw_churn_stability").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertEpochHealthSchema = createInsertSchema(epochHealth).omit({
  createdAt: true,
});

export type InsertEpochHealth = z.infer<typeof insertEpochHealthSchema>;
export type EpochHealth = typeof epochHealth.$inferSelect;

export const seeds = pgTable("seeds", {
  address: text("address").primaryKey(),
  addedBy: text("added_by"),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSeedSchema = createInsertSchema(seeds).omit({
  createdAt: true,
});

export type InsertSeed = z.infer<typeof insertSeedSchema>;
export type Seed = typeof seeds.$inferSelect;

export const scores = pgTable("scores", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  address: text("address").notNull(),
  epochId: bigint("epoch_id", { mode: "number" }).notNull(),
  sts: doublePrecision("sts").notNull(),
  flow: doublePrecision("flow").notNull(),
  minCut: doublePrecision("min_cut").notNull(),
  stability: doublePrecision("stability").notNull(),
  depth: doublePrecision("depth").notNull(),
  tier: text("tier"),
  percentile: doublePrecision("percentile").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertScoreSchema = createInsertSchema(scores).omit({
  id: true,
  createdAt: true,
});

export type InsertScore = z.infer<typeof insertScoreSchema>;
export type Score = typeof scores.$inferSelect;
