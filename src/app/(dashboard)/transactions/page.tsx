"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Filter, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Transaction {
  id: string;
  amount: number;
  type: "income" | "expense";
  description: string | null;
  date: string | number | Date;
  accountId: string;
  categoryId: string;
  accountName: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
}

interface Account {
  id: string;
  name: string;
  type: string;
}

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  icon: string;
  color: string;
}

export default function TransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showNew = searchParams.get("new") === "true";

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterAccount, setFilterAccount] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>("");

  // New transaction form
  const [open, setOpen] = useState(showNew);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    type: "expense" as "income" | "expense",
    description: "",
    date: new Date().toISOString().split("T")[0],
    accountId: "",
    categoryId: "",
  });

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterType !== "all") params.set("type", filterType);
    if (filterAccount !== "all") params.set("accountId", filterAccount);
    if (filterMonth) params.set("month", filterMonth);

    const res = await fetch(`/api/transactions?${params}`);
    const data = await res.json();
    setTransactions(data);
    setLoading(false);
  }, [filterType, filterAccount, filterMonth]);

  const fetchAccounts = useCallback(async () => {
    const res = await fetch("/api/accounts");
    const data = await res.json();
    setAccounts(data);
    if (data.length > 0 && !formData.accountId) {
      setFormData((prev) => ({ ...prev, accountId: data[0].id }));
    }
  }, [formData.accountId]);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(data);
  }, []);

  useEffect(() => {
    fetchTransactions();
    fetchAccounts();
    fetchCategories();
  }, [fetchTransactions, fetchAccounts, fetchCategories]);

  // 当类型切换时自动选择对应分类
  useEffect(() => {
    const filtered = categories.filter((c) => c.type === formData.type);
    if (filtered.length > 0) {
      const isCurrentValid = filtered.some((c) => c.id === formData.categoryId);
      if (!isCurrentValid) {
        setFormData((prev) => ({ ...prev, categoryId: filtered[0].id }));
      }
    }
  }, [formData.type, categories, formData.categoryId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);

    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          amount: Number(formData.amount),
          date: new Date(formData.date),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "创建失败");
        setFormLoading(false);
        return;
      }

      toast.success("记账成功");
      setOpen(false);
      setFormData({
        amount: "",
        type: "expense",
        description: "",
        date: new Date().toISOString().split("T")[0],
        accountId: formData.accountId,
        categoryId: "",
      });
      fetchTransactions();
    } catch {
      toast.error("网络错误");
    }
    setFormLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除这条记录？")) return;
    const res = await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("已删除");
      fetchTransactions();
    } else {
      toast.error("删除失败");
    }
  }

  const filteredCategories = categories.filter((c) => c.type === formData.type);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">账单</h1>
        <Button onClick={() => setOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          记一笔
        </Button>
      </div>

      {/* 筛选 */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
          <Filter className="w-4 h-4" />
          筛选
        </div>
        <div className="flex flex-wrap gap-3">
          <Select value={filterType} onValueChange={(v) => v && setFilterType(v)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="income">收入</SelectItem>
              <SelectItem value="expense">支出</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterAccount} onValueChange={(v) => v && setFilterAccount(v)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="账户" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部账户</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-40"
          />
        </div>
      </GlassCard>

      {/* 交易列表 */}
      <GlassCard className="p-6">
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">加载中...</div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>暂无交易记录</p>
          </div>
        ) : (
          <div className="space-y-1">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-accent/50 transition-colors group"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                  style={{ backgroundColor: `${tx.categoryColor}20` }}
                >
                  {tx.categoryIcon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{tx.categoryName}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {tx.description || "无备注"} · {tx.accountName}
                  </p>
                </div>
                <div className="text-right">
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
                <button
                  onClick={() => handleDelete(tx.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* 记账 Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>记一笔</SheetTitle>
            <SheetDescription>记录你的收支明细</SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-6">
            {/* 类型选择 */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={formData.type === "expense" ? "default" : "outline"}
                className={cn(
                  "flex-1",
                  formData.type === "expense" && "bg-red-500 hover:bg-red-600"
                )}
                onClick={() => setFormData((prev) => ({ ...prev, type: "expense" }))}
              >
                <ArrowUpRight className="w-4 h-4 mr-1" />
                支出
              </Button>
              <Button
                type="button"
                variant={formData.type === "income" ? "default" : "outline"}
                className={cn(
                  "flex-1",
                  formData.type === "income" && "bg-green-500 hover:bg-green-600"
                )}
                onClick={() => setFormData((prev) => ({ ...prev, type: "income" }))}
              >
                <ArrowDownRight className="w-4 h-4 mr-1" />
                收入
              </Button>
            </div>

            {/* 金额 */}
            <div className="space-y-2">
              <Label>金额</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">
                  ¥
                </span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  className="pl-8 text-lg h-12"
                  value={formData.amount}
                  onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                  required
                />
              </div>
            </div>

            {/* 分类 */}
            <div className="space-y-2">
              <Label>分类</Label>
              <Select
                value={formData.categoryId}
                onValueChange={(v) => v && setFormData((prev) => ({ ...prev, categoryId: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择分类">
                    {(value: string | null) => {
                      if (!value) return "选择分类";
                      const cat = filteredCategories.find((c) => c.id === value);
                      return cat ? `${cat.icon} ${cat.name}` : "选择分类";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {filteredCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 账户 */}
            <div className="space-y-2">
              <Label>账户</Label>
              <Select
                value={formData.accountId}
                onValueChange={(v) => v && setFormData((prev) => ({ ...prev, accountId: v }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="选择账户">
                    {(value: string | null) => {
                      if (!value) return "选择账户";
                      const acct = accounts.find((a) => a.id === value);
                      return acct ? acct.name : "选择账户";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 日期 */}
            <div className="space-y-2">
              <Label>日期</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>

            {/* 备注 */}
            <div className="space-y-2">
              <Label>备注</Label>
              <Input
                placeholder="可选"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <Button type="submit" className="w-full h-12" disabled={formLoading}>
              {formLoading ? "保存中..." : "保存"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
