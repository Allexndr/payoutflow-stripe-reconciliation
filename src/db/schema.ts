import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  date,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  stripeAccountId: text("stripe_account_id"),
  plaidAccessToken: text("plaid_access_token"),
  plaidItemId: text("plaid_item_id"),
  /** Plaid `transactions/sync` cursor */
  plaidTxnCursor: text("plaid_txn_cursor"),
  /** free | pro | scale */
  subTier: text("sub_tier").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const payoutsCache = pgTable(
  "payouts_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    payoutId: text("payout_id").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    data: jsonb("data").notNull(),
  },
  (t) => [uniqueIndex("payouts_cache_user_payout").on(t.userId, t.payoutId)],
);

export const bankTransactions = pgTable(
  "bank_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    plaidTxnId: text("plaid_txn_id").notNull(),
    amountCents: integer("amount_cents").notNull(),
    txnDate: date("txn_date").notNull(),
    name: text("name"),
    matchedPayoutId: text("matched_payout_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("bank_txns_user_plaid").on(t.userId, t.plaidTxnId)],
);

export const stripeWebhookEvents = pgTable("stripe_webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: text("event_id").notNull().unique(),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/** Pro: one email per payout when discrepancy > threshold */
export const discrepancyAlerts = pgTable(
  "discrepancy_alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    payoutId: text("payout_id").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("discrepancy_alerts_user_payout").on(t.userId, t.payoutId)],
);

/**
 * Manually confirmed payout ↔ bank txn links.
 * Overrides heuristic match for a given payout.
 */
export const payoutMatches = pgTable(
  "payout_matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    payoutId: text("payout_id").notNull(),
    bankTxnId: text("bank_txn_id").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("payout_matches_user_payout").on(t.userId, t.payoutId)],
);

/** Free-form notes attached to a specific payout (accounting trail). */
export const payoutComments = pgTable("payout_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  payoutId: text("payout_id").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Audit log. Records who did what on which entity.
 * Foundation for SOC2 / evidence of controls.
 */
export const payoutEvents = pgTable("payout_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  entity: text("entity").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
