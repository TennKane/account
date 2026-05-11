import { auth } from "@/lib/auth";
import { db } from "@/db";
import { transactions, accounts, creditBills, categories } from "@/db/schema";
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

  // 提前消费待还
  const unpaidResult = await db
    .select({
      total: sql<number>`COALESCE(SUM(${creditBills.remainingAmount}), 0)`,
      count: sql<number>`COUNT(*)`,
    })
    .from(creditBills)
    .where(
      and(
        eq(creditBills.userId, userId),
        sql`${creditBills.remainingAmount} > 0`
      )
    )
    .get();

  const recentUnpaid = await db
    .select()
    .from(creditBills)
    .where(
      and(
        eq(creditBills.userId, userId),
        sql`${creditBills.remainingAmount} > 0`
      )
    )
    .orderBy(sql`${creditBills.date} DESC`)
    .limit(3)
    .all();

  // 近6月收支趋势 — 用 JS 按月分组，避免 strftime 精度问题
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const allInRange = await db
    .select({
      type: transactions.type,
      amount: transactions.amount,
      date: transactions.date,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, sixMonthsAgo)
      )
    )
    .all();

  const monthMap = new Map<string, { income: number; expense: number }>();
  for (const row of allInRange) {
    const d = new Date(row.date);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const entry = monthMap.get(label) || { income: 0, expense: 0 };
    if (row.type === "income") entry.income += Number(row.amount);
    else entry.expense += Number(row.amount);
    monthMap.set(label, entry);
  }

  const months: string[] = [];
  const trendIncome: number[] = [];
  const trendExpense: number[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push(label);
    const entry = monthMap.get(label);
    trendIncome.push(entry?.income || 0);
    trendExpense.push(entry?.expense || 0);
  }

  // 本月分类支出
  const categoryExpenses = await db
    .select({
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
      total: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        gte(transactions.date, startOfMonth)
      )
    )
    .groupBy(transactions.categoryId)
    .all();

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
      unpaidTotal={Number(unpaidResult?.total || 0)}
      unpaidCount={Number(unpaidResult?.count || 0)}
      recentUnpaid={recentUnpaid}
      recentTransactions={recentTransactions}
      months={months}
      trendIncome={trendIncome}
      trendExpense={trendExpense}
      categoryExpenses={categoryExpenses}
    />
  );
}
