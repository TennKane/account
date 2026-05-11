"use client";

import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowUpRight, ArrowDownRight, Wallet, CreditCard } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Transaction, CreditBill } from "@/db/schema";

interface DashboardClientProps {
  income: number;
  expense: number;
  totalAssets: number;
  unpaidTotal: number;
  unpaidCount: number;
  recentUnpaid: CreditBill[];
  recentTransactions: Transaction[];
}

export function DashboardClient({
  income,
  expense,
  totalAssets,
  unpaidTotal,
  unpaidCount,
  recentUnpaid,
  recentTransactions,
}: DashboardClientProps) {
  const balance = income - expense;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">仪表盘</h1>
        <Link href="/transactions?new=true">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            记一笔
          </Button>
        </Link>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-green-500" />
            </div>
            <span className="text-sm text-muted-foreground">本月收入</span>
          </div>
          <p className="text-2xl font-semibold">¥{income.toFixed(2)}</p>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5 text-red-500" />
            </div>
            <span className="text-sm text-muted-foreground">本月支出</span>
          </div>
          <p className="text-2xl font-semibold">¥{expense.toFixed(2)}</p>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <span className="text-sm text-muted-foreground">总资产</span>
          </div>
          <p className="text-2xl font-semibold">¥{totalAssets.toFixed(2)}</p>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-sm text-muted-foreground">待还</span>
          </div>
          <p className="text-2xl font-semibold text-amber-500">
            ¥{unpaidTotal.toFixed(2)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {unpaidCount} 笔未还清
          </p>
        </GlassCard>
      </div>

      {/* 月度结余 */}
      <GlassCard className="p-6">
        <p className="text-sm text-muted-foreground mb-1">本月结余</p>
        <p
          className={cn(
            "text-3xl font-bold",
            balance >= 0 ? "text-green-500" : "text-red-500"
          )}
        >
          ¥{balance.toFixed(2)}
        </p>
      </GlassCard>

      {/* 近期待还 */}
      {recentUnpaid.length > 0 && (
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">近期待还</h2>
            <Link
              href="/credit"
              className="text-sm text-primary hover:underline"
            >
              查看全部
            </Link>
          </div>

          <div className="space-y-3">
            {recentUnpaid.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between py-2"
              >
                <div>
                  <p className="text-sm font-medium">{b.description || b.source}</p>
                  <p className="text-xs text-muted-foreground">
                    {b.source} · {new Date(b.date).toLocaleDateString("zh-CN")}
                  </p>
                </div>
                <span className="font-semibold text-amber-500">
                  ¥{b.remainingAmount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* 最近交易 */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">最近交易</h2>
          <Link
            href="/transactions"
            className="text-sm text-primary hover:underline"
          >
            查看全部
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>暂无交易记录</p>
            <Link href="/transactions?new=true">
              <Button variant="outline" className="mt-3 gap-2">
                <Plus className="w-4 h-4" />
                记一笔
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {recentTransactions.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between py-2"
              >
                <div>
                  <p className="text-sm font-medium">{t.description || "无备注"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.date).toLocaleDateString("zh-CN")}
                  </p>
                </div>
                <span
                  className={cn(
                    "font-semibold",
                    t.type === "income" ? "text-green-500" : "text-red-500"
                  )}
                >
                  {t.type === "income" ? "+" : "-"}¥{t.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
