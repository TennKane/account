import { sqliteTable, text, real, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  hashedPassword: text("hashed_password").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["cash", "bank", "credit", "savings", "wallet", "advance"] })
    .notNull()
    .default("cash"),
  balance: real("balance").notNull().default(0),
  currency: text("currency").notNull().default("CNY"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const categories = sqliteTable("categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  icon: text("icon").notNull().default("📦"),
  color: text("color").notNull().default("#6b7280"),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  amount: real("amount").notNull(),
  type: text("type", { enum: ["income", "expense"] }).notNull(),
  description: text("description").default(""),
  date: integer("date", { mode: "timestamp" }).notNull(),
  accountId: text("account_id")
    .notNull()
    .references(() => accounts.id, { onDelete: "cascade" }),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export const creditBills = sqliteTable("credit_bills", {
  id: text("id").primaryKey(),
  amount: real("amount").notNull(),
  remainingAmount: real("remaining_amount").notNull(),
  description: text("description").default(""),
  source: text("source").notNull(),
  accountId: text("account_id")
    .references(() => accounts.id, { onDelete: "set null" }),
  date: integer("date", { mode: "timestamp" }).notNull(),
  categoryId: text("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type CreditBill = typeof creditBills.$inferSelect;
export type NewCreditBill = typeof creditBills.$inferInsert;
