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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Pencil, ArrowUpRight, ArrowDownRight } from "lucide-react";
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
  const [filterMonth, setFilterMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // New transaction form
  const [open, setOpen] = useState(showNew);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    amount: "",
    type: "expense" as "income" | "expense",
    description: "",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
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

  function openNew() {
    setEditingTx(null);
    setFormData({
      amount: "",
      type: "expense",
      description: "",
      date: new Date().toISOString().split("T")[0],
      time: new Date().toTimeString().slice(0, 5),
      accountId: accounts[0]?.id || "",
      categoryId: "",
    });
    setOpen(true);
  }

  function openEdit(tx: Transaction) {
    setEditingTx(tx);
    const d = new Date(tx.date);
    const dateStr = d.toISOString().split("T")[0];
    const timeStr = d.toTimeString().slice(0, 5);
    setFormData({
      amount: String(tx.amount),
      type: tx.type,
      description: tx.description || "",
      date: dateStr,
      time: timeStr,
      accountId: tx.accountId,
      categoryId: tx.categoryId,
    });
    setOpen(true);
  }

  function handleSheetClose(open: boolean) {
    setOpen(open);
    if (!open) setEditingTx(null);
  }

  function handleDateChange(newDate: string) {
    const today = new Date().toISOString().split("T")[0];
    const newTime = newDate < today ? "00:00" : new Date().toTimeString().slice(0, 5);
    setFormData((prev) => ({ ...prev, date: newDate, time: newTime }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);

    try {
      const dateTime = new Date(formData.date);
      const [hours, minutes] = (formData.time || "00:00").split(":");
      dateTime.setHours(Number(hours), Number(minutes));

      const isEdit = !!editingTx;
      const res = await fetch("/api/transactions", {
        method: isEdit ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEdit ? { id: editingTx.id } : {}),
          amount: Number(formData.amount),
          type: formData.type,
          description: formData.description,
          date: dateTime,
          accountId: formData.accountId,
          categoryId: formData.categoryId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || (isEdit ? "更新失败" : "创建失败"));
        setFormLoading(false);
        return;
      }

      toast.success(isEdit ? "已更新" : "记账成功");
      setEditingTx(null);
      setOpen(false);
      fetchTransactions();
    } catch {
      toast.error("网络错误");
    }
    setFormLoading(false);
  }

  async function handleDelete() {
    if (!deleteTarget || deleteConfirmText !== "确认删除") return;
    const res = await fetch(`/api/transactions?id=${deleteTarget}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("已删除");
      setDeleteTarget(null);
      setDeleteConfirmText("");
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
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" />
          记一笔
        </Button>
      </div>

      {/* 筛选 */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-3">
          <Select value={filterType} onValueChange={(v) => v && setFilterType(v)}>
            <SelectTrigger className="w-28">
              <SelectValue placeholder="全部">
                {(v: string | null) =>
                  v === "all" ? "全部" : v === "expense" ? "支出" : v === "income" ? "收入" : "全部"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="expense">支出</SelectItem>
              <SelectItem value="income">收入</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterAccount} onValueChange={(v) => v && setFilterAccount(v)}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="全部账户">
                {(v: string | null) => {
                  if (!v || v === "all") return "全部账户";
                  const acct = accounts.find((a) => a.id === v);
                  return acct ? acct.name : "全部账户";
                }}
              </SelectValue>
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
            className="w-44"
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
                    {new Date(tx.date).toLocaleDateString("zh-CN")}{" "}
                    {(() => {
                      const d = new Date(tx.date);
                      return d.getHours() || d.getMinutes()
                        ? d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
                        : "";
                    })()}
                  </p>
                </div>
                <button
                  onClick={() => openEdit(tx)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:text-primary"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setDeleteTarget(tx.id); setDeleteConfirmText(""); }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* 删除确认 Dialog */}
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
                disabled={deleteConfirmText !== "确认删除"}
                onClick={handleDelete}
              >
                删除
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 记账 / 编辑 Sheet */}
      <Sheet open={open} onOpenChange={handleSheetClose}>
        <SheetContent className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editingTx ? "编辑账单" : "记一笔"}</SheetTitle>
            <SheetDescription>
              {editingTx ? "修改收支明细（日期不可变更）" : "记录你的收支明细"}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-6 px-4">
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
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleDateChange(e.target.value)}
                  required
                  className="flex-1"
                  disabled={!!editingTx}
                />
                <Input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData((prev) => ({ ...prev, time: e.target.value }))}
                  className="w-32"
                  disabled={!!editingTx}
                />
              </div>
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
              {formLoading ? "保存中..." : editingTx ? "保存修改" : "保存"}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
