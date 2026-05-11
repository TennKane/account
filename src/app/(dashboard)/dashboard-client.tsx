"use client";

import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowUpRight, ArrowDownRight, Wallet, CreditCard } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
} from "recharts";
import type { Transaction, CreditBill } from "@/db/schema";

interface CategoryExpense {
  categoryId: string;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  total: number;
}

interface DashboardClientProps {
  income: number;
  expense: number;
  totalAssets: number;
  unpaidTotal: number;
  unpaidCount: number;
  recentUnpaid: CreditBill[];
  recentTransactions: Transaction[];
  months: string[];
  trendIncome: number[];
  trendExpense: number[];
  categoryExpenses: CategoryExpense[];
}

export function DashboardClient({
  income,
  expense,
  totalAssets,
  unpaidTotal,
  unpaidCount,
  recentUnpaid,
  recentTransactions,
  months,
  trendIncome,
  trendExpense,
  categoryExpenses,
}: DashboardClientProps) {
  const balance = income - expense;

  const trendData = months.map((m, i) => ({
    month: m.slice(5),
    收入: trendIncome[i],
    支出: trendExpense[i],
  }));

  const pieData = categoryExpenses
    .filter((c) => c.total > 0)
    .map((c) => ({
      name: `${c.categoryIcon || ""} ${c.categoryName || "未知"}`,
      value: c.total,
      color: c.categoryColor || "#6b7280",
    }));

  const hasChartData = trendData.some((d) => d.收入 > 0 || d.支出 > 0);

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

      {/* 图表 */}
      {hasChartData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 收支趋势 */}
          <GlassCard className="p-6">
            <h2 className="font-semibold mb-4">近 6 月收支趋势</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                    formatter={(value: any) => [`¥${Number(value).toFixed(2)}`]}
                  />
                  <Legend />
                  <Bar dataKey="收入" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="支出" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>

          {/* 分类支出 */}
          <GlassCard className="p-6">
            <h2 className="font-semibold mb-4">本月分类支出</h2>
            <div className="h-64">
              {pieData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  暂无支出
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--popover))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "13px",
                      }}
                      formatter={(value: any, name: any) => [`¥${Number(value).toFixed(2)}`, name]}
                    />
                    <Legend
                      formatter={(value: string) => (
                        <span className="text-xs text-muted-foreground">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </GlassCard>
        </div>
      )}

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
