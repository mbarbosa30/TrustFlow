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
  lendingPolicyJson: jsonb("lending_policy_json"), // Opt-in microcredit configuration
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

// REMOVED: Economic Layer Tables (budget, allowance, payment, pledge)
// Replaced by Assist system - see below

// Auth3009 - EIP-3009 authorization tracking (kept for USDC assists)
export const auth3009 = pgTable("auth_3009", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  communityId: bigint("community_id", { mode: "number" }).notNull(),
  epochId: bigint("epoch_id", { mode: "number" }).notNull(),
  fromAddress: text("from_address").notNull(),
  toAddress: text("to_address").notNull(),
  amount: doublePrecision("amount").notNull(),
  validAfter: bigint("valid_after", { mode: "number" }).notNull(),
  validBefore: bigint("valid_before", { mode: "number" }).notNull(),
  nonce: text("nonce").notNull().unique(),
  signature: text("signature").notNull(), // full EIP-712 signature
  used: boolean("used").notNull().default(false),
  txHash: text("tx_hash"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAuth3009Schema = createInsertSchema(auth3009).omit({
  id: true,
  createdAt: true,
});

export type InsertAuth3009 = z.infer<typeof insertAuth3009Schema>;
export type Auth3009 = typeof auth3009.$inferSelect;

// ===== MICROCREDIT LENDING SYSTEM =====

// Loan - Main loan record
export const loan = pgTable("loan", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  communityId: bigint("community_id", { mode: "number" }).notNull(),
  borrowerAddress: text("borrower_address").notNull(),
  principalUsdc: doublePrecision("principal_usdc").notNull(), // Amount (despite name, can be ARS/USDC/etc)
  currency: text("currency").notNull().default("ARS"), // 'ARS' | 'USDC' | 'USD' | etc
  aprNominal: doublePrecision("apr_nominal").notNull(), // e.g., 0.40 for 40%
  tenorMonths: integer("tenor_months").notNull(),
  status: text("status").notNull(), // 'ACTIVE' | 'PAID' | 'DEFAULTED'
  disbursedAt: timestamp("disbursed_at"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertLoanSchema = createInsertSchema(loan).omit({
  id: true,
  createdAt: true,
});

export type InsertLoan = z.infer<typeof insertLoanSchema>;
export type Loan = typeof loan.$inferSelect;

// Installment - Monthly payment schedule
export const installment = pgTable("installment", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  loanId: bigint("loan_id", { mode: "number" }).notNull().references(() => loan.id),
  idx: integer("idx").notNull(), // 0-based installment number
  dueDate: timestamp("due_date").notNull(),
  principalDue: doublePrecision("principal_due").notNull(),
  interestDue: doublePrecision("interest_due").notNull(),
  totalDue: doublePrecision("total_due").notNull(),
  principalPaid: doublePrecision("principal_paid").notNull().default(0),
  interestPaid: doublePrecision("interest_paid").notNull().default(0),
  totalPaid: doublePrecision("total_paid").notNull().default(0),
  lateFee: doublePrecision("late_fee").notNull().default(0),
  status: text("status").notNull(), // 'PENDING' | 'PAID' | 'LATE' | 'DEFAULTED'
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  loanIdxUnique: { unique: [table.loanId, table.idx] },
}));

export const insertInstallmentSchema = createInsertSchema(installment).omit({
  id: true,
  createdAt: true,
});

export type InsertInstallment = z.infer<typeof insertInstallmentSchema>;
export type Installment = typeof installment.$inferSelect;

// Subsidy Ledger - Track subsidy applications per installment
export const subsidyLedger = pgTable("subsidy_ledger", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  loanId: bigint("loan_id", { mode: "number" }).notNull().references(() => loan.id),
  installmentIdx: integer("installment_idx").notNull(),
  ibdApplied: doublePrecision("ibd_applied").notNull().default(0), // Interest Buy-Down
  voucherApplied: doublePrecision("voucher_applied").notNull().default(0), // Interest Voucher
  assistCovered: doublePrecision("assist_covered").notNull().default(0), // Repay-Assist
  assistPremium: doublePrecision("assist_premium").notNull().default(0), // RA premium owed
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  loanInstallmentUnique: { unique: [table.loanId, table.installmentIdx] },
}));

export const insertSubsidyLedgerSchema = createInsertSchema(subsidyLedger).omit({
  id: true,
  createdAt: true,
});

export type InsertSubsidyLedger = z.infer<typeof insertSubsidyLedgerSchema>;
export type SubsidyLedger = typeof subsidyLedger.$inferSelect;

// ===== ASSIST SYSTEM =====

// Assist - Supporter USDC assists applied to loans
export const assist = pgTable("assist", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  communityId: bigint("community_id", { mode: "number" }).notNull(),
  loanId: bigint("loan_id", { mode: "number" }).notNull().references(() => loan.id),
  supporterAddress: text("supporter_address").notNull(),
  usdcAmount: doublePrecision("usdc_amount").notNull(),
  fxRate: doublePrecision("fx_rate").notNull(), // USD to ARS rate locked
  arsCredit: doublePrecision("ars_credit").notNull(), // ARS credited to loan
  aaveTxHash: text("aave_tx_hash"), // Aave supply transaction
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAssistSchema = createInsertSchema(assist).omit({
  id: true,
  createdAt: true,
});

export type InsertAssist = z.infer<typeof insertAssistSchema>;
export type Assist = typeof assist.$inferSelect;

// FXQuote - FX rate quotes with expiry
export const fxQuote = pgTable("fx_quote", {
  id: text("id").primaryKey(), // UUID
  rate: doublePrecision("rate").notNull(), // USD to ARS
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertFXQuoteSchema = createInsertSchema(fxQuote).omit({
  createdAt: true,
});

export type InsertFXQuote = z.infer<typeof insertFXQuoteSchema>;
export type FXQuote = typeof fxQuote.$inferSelect;

// Guarantee - First-Loss Guarantee pool per community
export const guarantee = pgTable("guarantee", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  communityId: bigint("community_id", { mode: "number" }).notNull().unique(),
  capUsdc: doublePrecision("cap_usdc").notNull(),
  capRemaining: doublePrecision("cap_remaining").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertGuaranteeSchema = createInsertSchema(guarantee).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertGuarantee = z.infer<typeof insertGuaranteeSchema>;
export type Guarantee = typeof guarantee.$inferSelect;

// Trust Events - Verifiable events affecting trust scores
export const trustEvent = pgTable("trust_event", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  communityId: bigint("community_id", { mode: "number" }).notNull(),
  userAddress: text("user_address").notNull(),
  eventType: text("event_type").notNull(), // 'LOAN_ON_TIME' | 'LOAN_LATE' | 'LOAN_DEFAULT' | 'ASSIST_SUCCESS' | 'ASSIST_LOSS'
  delta: doublePrecision("delta").notNull(), // trust score adjustment
  evidenceId: bigint("evidence_id", { mode: "number" }), // loan_id or assist_id
  evidenceType: text("evidence_type"), // 'LOAN' | 'ASSIST'
  appliedInEpoch: bigint("applied_in_epoch", { mode: "number" }), // epoch where delta was applied
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTrustEventSchema = createInsertSchema(trustEvent).omit({
  id: true,
  createdAt: true,
});

export type InsertTrustEvent = z.infer<typeof insertTrustEventSchema>;
export type TrustEvent = typeof trustEvent.$inferSelect;
