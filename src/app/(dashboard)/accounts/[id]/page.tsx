import { auth } from "@/lib/auth";
import { db } from "@/db";
import { accounts, transactions, categories } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Receipt } from "lucide-react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const accountTypeLabels: Record<string, string> = {
  cash: "现金",
  bank: "银行卡",
  credit: "信用卡",
  savings: "储蓄",
  wallet: "电子钱包",
  advance: "提前消费",
};

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id!;

  const account = await db
    .select()
    .from(accounts)
    .where(eq(accounts.id, id))
    .get();

  if (!account || account.userId !== userId) redirect("/accounts");

  // 该账户的交易
  const txList = await db
    .select({
      id: transactions.id,
      amount: transactions.amount,
      type: transactions.type,
      description: transactions.description,
      date: transactions.date,
      categoryName: categories.name,
      categoryIcon: categories.icon,
      categoryColor: categories.color,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.accountId, id))
    .orderBy(sql`${transactions.date} DESC`)
    .all();

  // 统计数据
  const totalIncome = txList
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = txList
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 头部 */}
      <div className="flex items-center gap-4">
        <Link href="/accounts">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold">{account.name}</h1>
          <p className="text-sm text-muted-foreground">
            {accountTypeLabels[account.type] || account.type}
          </p>
        </div>
      </div>

      {/* 账户余额 / 负债 */}
      <GlassCard className="p-6 text-center">
        <p className="text-sm text-muted-foreground mb-1">
          {account.type === "advance" ? "当前负债" : "当前余额"}
        </p>
        <p className={`text-3xl font-bold ${account.type === "advance" ? "text-destructive" : "text-primary"}`}>
          {account.type === "advance" ? `¥${Math.abs(account.balance).toFixed(2)}` : `¥${account.balance.toFixed(2)}`}
        </p>
      </GlassCard>

      {/* 统计摘要 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-green-500/15 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4 text-green-500" />
            </div>
            <span className="text-sm text-muted-foreground">总收入</span>
          </div>
          <p className="text-xl font-semibold text-green-500">
            ¥{totalIncome.toFixed(2)}
          </p>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-sm text-muted-foreground">总支出</span>
          </div>
          <p className="text-xl font-semibold text-red-500">
            ¥{totalExpense.toFixed(2)}
          </p>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <Receipt className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">交易笔数</span>
          </div>
          <p className="text-xl font-semibold">{txList.length} 笔</p>
        </GlassCard>
      </div>

      {/* 交易流水 */}
      <GlassCard className="p-6">
        <h2 className="font-semibold mb-4">交易流水</h2>

        {txList.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>该账户暂无交易记录</p>
            <Link href="/transactions?new=true">
              <Button variant="outline" className="mt-3">
                记一笔
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {txList.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-accent/50 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                  style={{ backgroundColor: `${tx.categoryColor}20` }}
                >
                  {tx.categoryIcon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{tx.categoryName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {tx.description || "无备注"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={cn(
                      "text-sm font-semibold",
                      tx.type === "income" ? "text-green-500" : "text-red-500"
                    )}
                  >
                    {tx.type === "income" ? "+" : "-"}¥{tx.amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.date).toLocaleDateString("zh-CN")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
