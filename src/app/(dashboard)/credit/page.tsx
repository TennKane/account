"use client";

import { useEffect, useState, useCallback } from "react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, CreditCard, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CreditBill {
  id: string;
  amount: number;
  remainingAmount: number;
  description: string | null;
  source: string;
  date: string | number | Date;
  categoryId: string;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
}

interface Account {
  id: string;
  name: string;
}

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  icon: string;
  color: string;
}

export default function CreditPage() {
  const [bills, setBills] = useState<CreditBill[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"unpaid" | "paid">("unpaid");

  // New bill dialog
  const [newOpen, setNewOpen] = useState(false);
  const [newLoading, setNewLoading] = useState(false);
  const [newForm, setNewForm] = useState({
    amount: "",
    source: "花呗",
    description: "",
    date: new Date().toISOString().split("T")[0],
    categoryId: "",
  });

  // Repay dialog
  const [repayBill, setRepayBill] = useState<CreditBill | null>(null);
  const [repayOpen, setRepayOpen] = useState(false);
  const [repayLoading, setRepayLoading] = useState(false);
  const [repayForm, setRepayForm] = useState({
    amount: "",
    accountId: "",
  });

  const fetchBills = useCallback(async () => {
    const res = await fetch("/api/credit-bills");
    const data = await res.json();
    setBills(data);
    setLoading(false);
  }, []);

  const fetchAccounts = useCallback(async () => {
    const res = await fetch("/api/accounts");
    const data = await res.json();
    setAccounts(data);
  }, []);

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(data.filter((c: Category) => c.type === "expense"));
  }, []);

  useEffect(() => {
    fetchBills();
    fetchAccounts();
    fetchCategories();
  }, [fetchBills, fetchAccounts, fetchCategories]);

  const unpaid = bills.filter((b) => b.remainingAmount > 0);
  const paid = bills.filter((b) => b.remainingAmount <= 0);

  async function handleNewSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNewLoading(true);

    const res = await fetch("/api/credit-bills", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newForm,
        amount: Number(newForm.amount),
        date: new Date(newForm.date),
      }),
    });

    if (res.ok) {
      toast.success("创建成功");
      setNewOpen(false);
      setNewForm({
        amount: "",
        source: "花呗",
        description: "",
        date: new Date().toISOString().split("T")[0],
        categoryId: "",
      });
      fetchBills();
    } else {
      const data = await res.json();
      toast.error(data.error || "创建失败");
    }
    setNewLoading(false);
  }

  function openRepay(bill: CreditBill) {
    setRepayBill(bill);
    setRepayForm({
      amount: String(bill.remainingAmount),
      accountId: accounts[0]?.id || "",
    });
    setRepayOpen(true);
  }

  async function handleRepaySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!repayBill) return;
    setRepayLoading(true);

    const res = await fetch("/api/credit-bills/repay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        billId: repayBill.id,
        amount: Number(repayForm.amount),
        accountId: repayForm.accountId,
      }),
    });

    if (res.ok) {
      toast.success("还款成功");
      setRepayOpen(false);
      setRepayBill(null);
      fetchBills();
    } else {
      const data = await res.json();
      toast.error(data.error || "还款失败");
    }
    setRepayLoading(false);
  }

  const expenseCategories = categories.filter((c) => c.type === "expense");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">提前消费</h1>
        <Button onClick={() => setNewOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          新建账单
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted w-fit">
        <button
          onClick={() => setTab("unpaid")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            tab === "unpaid"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          未还 ({unpaid.length})
        </button>
        <button
          onClick={() => setTab("paid")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            tab === "paid"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          已还 ({paid.length})
        </button>
      </div>

      {/* Bill List */}
      {loading ? (
        <GlassCard className="p-6 text-center text-muted-foreground">
          加载中...
        </GlassCard>
      ) : (tab === "unpaid" ? unpaid : paid).length === 0 ? (
        <GlassCard className="p-12 text-center text-muted-foreground">
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>{tab === "unpaid" ? "没有未还的提前消费账单" : "没有已还清的账单"}</p>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(tab === "unpaid" ? unpaid : paid).map((bill) => {
            const progress = bill.remainingAmount > 0
              ? ((bill.amount - bill.remainingAmount) / bill.amount) * 100
              : 100;

            return (
              <GlassCard key={bill.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: `${bill.categoryColor}20` }}
                    >
                      {bill.categoryIcon}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{bill.categoryName}</p>
                      <p className="text-xs text-muted-foreground">
                        {bill.source}
                      </p>
                    </div>
                  </div>
                  {bill.remainingAmount <= 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-amber-500 shrink-0" />
                  )}
                </div>

                {bill.description && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {bill.description}
                  </p>
                )}

                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-lg font-semibold">
                      ¥{bill.amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(bill.date).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                  {bill.remainingAmount > 0 && (
                    <div className="text-right">
                      <p className="text-sm text-amber-500 font-medium">
                        待还 ¥{bill.remainingAmount.toFixed(2)}
                      </p>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-muted mb-3">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all",
                      progress >= 100
                        ? "bg-green-500"
                        : progress > 50
                        ? "bg-primary"
                        : "bg-amber-400"
                    )}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>

                {bill.remainingAmount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => openRepay(bill)}
                  >
                    还款
                  </Button>
                )}
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* New Bill Dialog */}
      <Dialog open={newOpen} onOpenChange={setNewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建提前消费账单</DialogTitle>
            <DialogDescription>
              记录一笔花呗、白条等提前消费
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleNewSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>金额</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={newForm.amount}
                onChange={(e) => setNewForm((prev) => ({ ...prev, amount: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>来源</Label>
              <Select
                value={newForm.source}
                onValueChange={(v) => v && setNewForm((prev) => ({ ...prev, source: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="花呗">花呗</SelectItem>
                  <SelectItem value="京东白条">京东白条</SelectItem>
                  <SelectItem value="信用卡">信用卡</SelectItem>
                  <SelectItem value="其他">其他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>分类</Label>
              <Select
                value={newForm.categoryId}
                onValueChange={(v) => v && setNewForm((prev) => ({ ...prev, categoryId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择分类" />
                </SelectTrigger>
                <SelectContent>
                  {expenseCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>备注</Label>
              <Input
                placeholder="买的什么"
                value={newForm.description}
                onChange={(e) => setNewForm((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>消费日期</Label>
              <Input
                type="date"
                value={newForm.date}
                onChange={(e) => setNewForm((prev) => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={newLoading}>
              {newLoading ? "创建中..." : "创建"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Repay Dialog */}
      <Dialog open={repayOpen} onOpenChange={(open) => { setRepayOpen(open); if (!open) setRepayBill(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>还款</DialogTitle>
            <DialogDescription>
              {repayBill && (
                <span>
                  账单金额 ¥{repayBill.amount.toFixed(2)}，剩余 ¥{repayBill.remainingAmount.toFixed(2)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRepaySubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>还款金额</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={repayBill?.remainingAmount || 0}
                placeholder="0.00"
                value={repayForm.amount}
                onChange={(e) => setRepayForm((prev) => ({ ...prev, amount: e.target.value }))}
                required
              />
              {repayBill && (
                <p className="text-xs text-muted-foreground">
                  最多可还 ¥{repayBill.remainingAmount.toFixed(2)}，还一部分则剩余部分下次再还
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>还款账户</Label>
              <Select
                value={repayForm.accountId}
                onValueChange={(v) => v && setRepayForm((prev) => ({ ...prev, accountId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择账户" />
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

            <Button type="submit" className="w-full" disabled={repayLoading}>
              {repayLoading ? "还款中..." : "确认还款"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
