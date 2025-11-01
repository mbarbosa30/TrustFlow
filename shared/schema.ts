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

// Wallet profiles - store names for wallet addresses
export const walletProfiles = pgTable("wallet_profiles", {
  address: text("address").primaryKey(), // Ethereum address (normalized to lowercase)
  name: text("name"), // User's display name
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertWalletProfileSchema = createInsertSchema(walletProfiles).omit({
  createdAt: true,
  updatedAt: true,
});

export const updateWalletProfileSchema = createInsertSchema(walletProfiles).pick({
  name: true,
});

export type InsertWalletProfile = z.infer<typeof insertWalletProfileSchema>;
export type UpdateWalletProfile = z.infer<typeof updateWalletProfileSchema>;
export type WalletProfile = typeof walletProfiles.$inferSelect;

// Communities table - each community is an isolated trust graph
export const communities = pgTable("communities", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  slug: text("slug").unique(), // URL-friendly identifier (e.g., "mujeres2000")
  name: text("name").notNull(),
  description: text("description"),
  location: text("location"), // e.g., "Tigre & Zona Norte, AR"
  logoUrl: text("logo_url"), // Community logo
  coverUrl: text("cover_url"), // Hero/cover image
  promptText: text("prompt_text").notNull(),
  promptHash: text("prompt_hash").notNull(),
  policyId: text("policy_id").notNull(),
  policyJson: jsonb("policy_json").notNull(), // JSONB for proper policy storage
  lendingPolicyJson: jsonb("lending_policy_json"), // Opt-in microcredit configuration
  themeJson: jsonb("theme_json"), // Custom colors: { primary, accent }
  visibility: text("visibility").notNull().default("public"), // 'public' | 'invite' | 'archived'
  creator: text("creator").notNull(),
  currency: text("currency").notNull().default("USD"), // Primary currency (USD, ARS, MXN, etc.)
  apiKey: text("api_key").notNull(), // API key for external integrations (e.g., "mxf_live_xxx")
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCommunitySchema = createInsertSchema(communities).omit({
  id: true,
  apiKey: true,
  createdAt: true,
});

export type InsertCommunity = z.infer<typeof insertCommunitySchema>;
export type Community = typeof communities.$inferSelect;

// Community roles table - defines who has what role in each community
export const communityRoles = pgTable("community_roles", {
  communityId: bigint("community_id", { mode: "number" }).notNull(),
  address: text("address").notNull(),
  role: text("role").notNull(), // 'owner' | 'admin' | 'seed' | 'mentor' | 'sponsor'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  pk: { primaryKey: [table.communityId, table.address, table.role] },
}));

export const insertCommunityRoleSchema = createInsertSchema(communityRoles).omit({
  createdAt: true,
});

export type InsertCommunityRole = z.infer<typeof insertCommunityRoleSchema>;
export type CommunityRole = typeof communityRoles.$inferSelect;

// Posts table - updates and announcements for communities
export const posts = pgTable("posts", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  communityId: bigint("community_id", { mode: "number" }).notNull(),
  authorAddress: text("author_address").notNull(),
  title: text("title").notNull(),
  bodyMarkdown: text("body_markdown").notNull(),
  pinned: boolean("pinned").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPostSchema = createInsertSchema(posts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPost = z.infer<typeof insertPostSchema>;
export type Post = typeof posts.$inferSelect;

// Comments table - threaded discussions on posts
export const comments = pgTable("comments", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  postId: bigint("post_id", { mode: "number" }).notNull(),
  authorAddress: text("author_address").notNull(),
  bodyMarkdown: text("body_markdown").notNull(),
  parentId: bigint("parent_id", { mode: "number" }), // For threaded replies
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

// Community metrics snapshots - track KPIs over time
export const communityMetrics = pgTable("community_metrics", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  communityId: bigint("community_id", { mode: "number" }).notNull(),
  snapshotDate: timestamp("snapshot_date").defaultNow().notNull(),
  // Trust metrics
  acceptedUsers: integer("accepted_users"),
  trustHealthIndex: doublePrecision("trust_health_index"),
  avgMinCut: doublePrecision("avg_min_cut"),
  // Credit metrics  
  activeLoans: integer("active_loans"),
  onTimeRate90d: doublePrecision("on_time_rate_90d"),
  par30: doublePrecision("par30"), // Portfolio at Risk 30 days
  avgTicket: doublePrecision("avg_ticket"),
  // Support metrics
  sponsorsActive: integer("sponsors_active"),
  interestSubsidized30d: doublePrecision("interest_subsidized_30d"),
  firstLossCapRemaining: doublePrecision("first_loss_cap_remaining"),
  // Activity metrics
  vouches7d: integer("vouches_7d"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCommunityMetricSchema = createInsertSchema(communityMetrics).omit({
  id: true,
  createdAt: true,
});

export type InsertCommunityMetric = z.infer<typeof insertCommunityMetricSchema>;
export type CommunityMetric = typeof communityMetrics.$inferSelect;

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

// Pending Payment - Payment submissions awaiting management approval
export const pendingPayment = pgTable("pending_payment", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  communityId: bigint("community_id", { mode: "number" }).notNull(),
  loanId: bigint("loan_id", { mode: "number" }).notNull().references(() => loan.id),
  installmentId: bigint("installment_id", { mode: "number" }).notNull().references(() => installment.id),
  payerAddress: text("payer_address").notNull(), // Borrower making the payment
  amount: doublePrecision("amount").notNull(), // Amount in loan currency
  currency: text("currency").notNull(), // Currency of payment
  proofUrl: text("proof_url"), // Optional: URL to payment proof (receipt, screenshot, etc)
  notes: text("notes"), // Optional: Borrower notes
  status: text("status").notNull().default("PENDING"), // 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewedBy: text("reviewed_by"), // Manager address who approved/rejected
  reviewNotes: text("review_notes"), // Manager notes on approval/rejection
  reviewedAt: timestamp("reviewed_at"),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
});

export const insertPendingPaymentSchema = createInsertSchema(pendingPayment).omit({
  id: true,
  submittedAt: true,
});

export type InsertPendingPayment = z.infer<typeof insertPendingPaymentSchema>;
export type PendingPayment = typeof pendingPayment.$inferSelect;
