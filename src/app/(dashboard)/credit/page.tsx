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
import { Plus, Pencil, Trash2, CreditCard, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function getTodayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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
  isDefaultRepay?: number;
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
  const [filterSource, setFilterSource] = useState<string>("all");
  const [filterMonth, setFilterMonth] = useState<string>(
    getTodayLocal().slice(0, 7)
  );
  const [searchQuery, setSearchQuery] = useState("");

  // New/Edit bill dialog
  const [editingBill, setEditingBill] = useState<CreditBill | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [newForm, setNewForm] = useState({
    amount: "",
    source: "花呗",
    description: "",
    date: getTodayLocal(),
    categoryId: "",
  });

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<CreditBill | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Repay dialog
  const [repayBill, setRepayBill] = useState<CreditBill | null>(null);
  const [repayOpen, setRepayOpen] = useState(false);
  const [repayLoading, setRepayLoading] = useState(false);
  const [repayForm, setRepayForm] = useState({
    amount: "",
    accountId: "",
  });

  const fetchBills = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterSource !== "all") params.set("source", filterSource);
      if (filterMonth) params.set("month", filterMonth);
      if (searchQuery) params.set("q", searchQuery);
      const res = await fetch(`/api/credit-bills?${params}`);
      const data = await res.json();
      setBills(Array.isArray(data) ? data : []);
    } catch {
      setBills([]);
    } finally {
      setLoading(false);
    }
  }, [filterSource, filterMonth, searchQuery]);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (Array.isArray(data)) setAccounts(data);
    } catch {
      // ignore
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (Array.isArray(data)) setCategories(data.filter((c: Category) => c.type === "expense"));
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchBills();
    fetchAccounts();
    fetchCategories();
  }, [fetchBills, fetchAccounts, fetchCategories]);

  const unpaid = bills.filter((b) => b.remainingAmount > 0);
  const paid = bills.filter((b) => b.remainingAmount <= 0);

  function openNew() {
    setEditingBill(null);
    setNewForm({
      amount: "",
      source: "花呗",
      description: "",
      date: getTodayLocal(),
      categoryId: "",
    });
    setFormOpen(true);
  }

  function openEdit(bill: CreditBill) {
    setEditingBill(bill);
    const d = new Date(bill.date);
    setNewForm({
      amount: String(bill.amount),
      source: bill.source,
      description: bill.description || "",
      date: d.toISOString().split("T")[0],
      categoryId: bill.categoryId,
    });
    setFormOpen(true);
  }

  function handleFormClose(open: boolean) {
    setFormOpen(open);
    if (!open) setEditingBill(null);
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);

    const isEdit = !!editingBill;
    const res = await fetch("/api/credit-bills", {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(isEdit ? { id: editingBill.id } : {}),
        ...newForm,
        amount: Number(newForm.amount),
        date: new Date(newForm.date),
      }),
    });

    if (res.ok) {
      toast.success(isEdit ? "已更新" : "创建成功");
      setEditingBill(null);
      setFormOpen(false);
      fetchBills();
    } else {
      const data = await res.json();
      toast.error(data.error || (isEdit ? "更新失败" : "创建失败"));
    }
    setFormLoading(false);
  }

  function openRepay(bill: CreditBill) {
    setRepayBill(bill);
    setRepayForm({
      amount: String(bill.remainingAmount),
      accountId: accounts.find((a) => a.isDefaultRepay)?.id || accounts[0]?.id || "",
    });
    setRepayOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget || deleteConfirmText !== "确认删除") return;
    setDeleteLoading(true);
    const res = await fetch(`/api/credit-bills?id=${deleteTarget.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("已删除");
      setDeleteTarget(null);
      setDeleteConfirmText("");
      fetchBills();
    } else {
      toast.error("删除失败");
    }
    setDeleteLoading(false);
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
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" />
          新建账单
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-muted w-fit">
        <button
          onClick={() => setTab("unpaid")}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all active:bg-accent/70",
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

      {/* Filter */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-3">
          <Select value={filterSource} onValueChange={(v) => v && setFilterSource(v)}>
            <SelectTrigger className="w-28">
              <SelectValue>
                {(v: string | null) =>
                  v === "all" ? "全部来源" : v || "全部来源"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部来源</SelectItem>
              <SelectItem value="花呗">花呗</SelectItem>
              <SelectItem value="京东白条">京东白条</SelectItem>
              <SelectItem value="拼多多">拼多多</SelectItem>
              <SelectItem value="美团">美团</SelectItem>
              <SelectItem value="信用卡">信用卡</SelectItem>
              <SelectItem value="其他">其他</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="w-44"
          />
          <Input
            placeholder="搜索备注..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-40"
          />
        </div>
      </GlassCard>

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
              <GlassCard key={bill.id} className="p-5 active:scale-[0.98] transition-transform">
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

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => openEdit(bill)}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1" />
                    编辑
                  </Button>
                  {bill.remainingAmount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openRepay(bill)}
                    >
                      还款
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="px-2 text-destructive hover:text-destructive"
                    onClick={() => { setDeleteTarget(bill); setDeleteConfirmText(""); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* New / Edit Bill Dialog */}
      <Dialog open={formOpen} onOpenChange={handleFormClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBill ? "编辑账单" : "新建提前消费账单"}</DialogTitle>
            <DialogDescription>
              {editingBill ? "修改账单信息（日期不可变更）" : "记录一笔花呗、白条等提前消费"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
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
                  <SelectItem value="拼多多">拼多多</SelectItem>
                  <SelectItem value="美团">美团</SelectItem>
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
                  <SelectValue>
                    {(value: string | null) => {
                      if (!value) return "选择分类";
                      const cat = expenseCategories.find((c) => c.id === value);
                      return cat ? `${cat.icon} ${cat.name}` : "选择分类";
                    }}
                  </SelectValue>
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
                disabled={!!editingBill}
              />
            </div>

            <Button type="submit" className="w-full" disabled={formLoading}>
              {formLoading ? "保存中..." : editingBill ? "保存修改" : "创建"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteConfirmText(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              删除后无法恢复，请输入 <strong>确认删除</strong> 以继续
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              placeholder="请输入「确认删除」"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => { setDeleteTarget(null); setDeleteConfirmText(""); }}
              >
                取消
              </Button>
              <Button
                variant="destructive"
                disabled={deleteConfirmText !== "确认删除" || deleteLoading}
                onClick={handleDelete}
              >
                {deleteLoading ? "删除中..." : "删除"}
              </Button>
            </div>
          </div>
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
                  <SelectValue>
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

            <Button type="submit" className="w-full" disabled={repayLoading}>
              {repayLoading ? "还款中..." : "确认还款"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
