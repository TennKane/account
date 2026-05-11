import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transactions, accounts } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id!;

  // 本月收支统计
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const incomeResult = await db
    .select({
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "income"),
        gte(transactions.date, startOfMonth)
      )
    )
    .get();

  const expenseResult = await db
    .select({
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        gte(transactions.date, startOfMonth)
      )
    )
    .get();

  // 总资产
  const accountsResult = await db
    .select({
      total: sql<number>`COALESCE(SUM(${accounts.balance}), 0)`,
    })
    .from(accounts)
    .where(eq(accounts.userId, userId))
    .get();

  // 最近交易
  const recentTransactions = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, userId))
    .orderBy(sql`${transactions.date} DESC`)
    .limit(5)
    .all();

  return (
    <DashboardClient
      income={Number(incomeResult?.total || 0)}
      expense={Number(expenseResult?.total || 0)}
      totalAssets={Number(accountsResult?.total || 0)}
      recentTransactions={recentTransactions}
    />
  );
}
