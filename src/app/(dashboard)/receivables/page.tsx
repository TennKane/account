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
import { Plus, Handshake, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function getTodayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface Receivable {
  id: string;
  amount: number;
  remainingAmount: number;
  person: string;
  description: string | null;
  date: string | number | Date;
  settledDate: string | number | Date | null;
}

interface Account {
  id: string;
  name: string;
  isDefault?: number;
}

export default function ReceivablesPage() {
  const [items, setItems] = useState<Receivable[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    amount: "",
    person: "",
    description: "",
    date: getTodayLocal(),
  });

  // Repay dialog
  const [repayItem, setRepayItem] = useState<Receivable | null>(null);
  const [repayOpen, setRepayOpen] = useState(false);
  const [repayLoading, setRepayLoading] = useState(false);
  const [repayForm, setRepayForm] = useState({
    amount: "",
    date: getTodayLocal(),
    accountId: "",
  });

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/receivables");
    const data = await res.json();
    setItems(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  const fetchAccounts = useCallback(async () => {
    const res = await fetch("/api/accounts");
    const data = await res.json();
    if (Array.isArray(data)) setAccounts(data);
  }, []);

  useEffect(() => {
    fetchItems();
    fetchAccounts();
  }, [fetchItems, fetchAccounts]);

  const unpaid = items.filter((i) => i.remainingAmount > 0);
  const settled = items.filter((i) => i.remainingAmount <= 0);

  function openCreate() {
    setCreateForm({ amount: "", person: "", description: "", date: getTodayLocal() });
    setCreateOpen(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);
    const res = await fetch("/api/receivables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    });
    if (res.ok) {
      toast.success("创建成功");
      setCreateOpen(false);
      fetchItems();
    } else {
      const data = await res.json();
      toast.error(data.error || "创建失败");
    }
    setFormLoading(false);
  }

  function openRepay(item: Receivable) {
    setRepayItem(item);
    setRepayForm({
      amount: String(item.remainingAmount),
      date: getTodayLocal(),
      accountId: accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || "",
    });
    setRepayOpen(true);
  }

  async function handleRepay(e: React.FormEvent) {
    e.preventDefault();
    if (!repayItem) return;
    setRepayLoading(true);

    const res = await fetch("/api/receivables/repay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: repayItem.id,
        ...repayForm,
        amount: Number(repayForm.amount),
      }),
    });

    if (res.ok) {
      toast.success("收款成功");
      setRepayOpen(false);
      setRepayItem(null);
      fetchItems();
      fetchAccounts();
    } else {
      const data = await res.json();
      toast.error(data.error || "收款失败");
    }
    setRepayLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除这条记录？")) return;
    const res = await fetch(`/api/receivables?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("已删除");
      fetchItems();
    } else {
      toast.error("删除失败");
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">应收款</h1>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          新建欠款
        </Button>
      </div>

      {/* 汇总 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="p-5 text-center">
          <p className="text-sm text-muted-foreground mb-1">总应收</p>
          <p className="text-2xl font-bold text-primary">
            ¥{items.reduce((s, i) => s + i.amount, 0).toFixed(2)}
          </p>
        </GlassCard>
        <GlassCard className="p-5 text-center">
          <p className="text-sm text-muted-foreground mb-1">待收回</p>
          <p className="text-2xl font-bold text-amber-500">
            ¥{unpaid.reduce((s, i) => s + i.remainingAmount, 0).toFixed(2)}
          </p>
        </GlassCard>
        <GlassCard className="p-5 text-center">
          <p className="text-sm text-muted-foreground mb-1">已收回</p>
          <p className="text-2xl font-bold text-green-500">
            ¥{(items.reduce((s, i) => s + i.amount, 0) - items.reduce((s, i) => s + i.remainingAmount, 0)).toFixed(2)}
          </p>
        </GlassCard>
      </div>

      {/* 列表 */}
      {loading ? (
        <GlassCard className="p-6 text-center text-muted-foreground">加载中...</GlassCard>
      ) : items.length === 0 ? (
        <GlassCard className="p-12 text-center text-muted-foreground">
          <Handshake className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>还没有欠款记录</p>
          <Button variant="outline" className="mt-3" onClick={openCreate}>
            新建欠款
          </Button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((item) => {
            const progress = item.remainingAmount > 0
              ? ((item.amount - item.remainingAmount) / item.amount) * 100
              : 100;

            return (
              <GlassCard key={item.id} className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold">{item.person}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.date).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                  {item.remainingAmount <= 0 ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-amber-500 shrink-0" />
                  )}
                </div>

                {item.description && (
                  <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                )}

                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-lg font-semibold">¥{item.amount.toFixed(2)}</p>
                    {item.settledDate && (
                      <p className="text-xs text-green-500">
                        还清于 {new Date(item.settledDate).toLocaleDateString("zh-CN")}
                      </p>
                    )}
                  </div>
                  {item.remainingAmount > 0 && (
                    <p className="text-sm text-amber-500 font-medium">
                      待还 ¥{item.remainingAmount.toFixed(2)}
                    </p>
                  )}
                </div>

                {/* 进度条 */}
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
                  {item.remainingAmount > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openRepay(item)}
                    >
                      收款
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className={item.remainingAmount > 0 ? "px-3" : "flex-1"}
                    onClick={() => handleDelete(item.id)}
                  >
                    删除
                  </Button>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* 新建对话框 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新建欠款记录</DialogTitle>
            <DialogDescription>记录别人欠你的钱</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>欠款人</Label>
              <Input
                placeholder="例如：张三"
                value={createForm.person}
                onChange={(e) => setCreateForm((p) => ({ ...p, person: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>金额</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={createForm.amount}
                onChange={(e) => setCreateForm((p) => ({ ...p, amount: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>欠款日期</Label>
              <Input
                type="date"
                value={createForm.date}
                onChange={(e) => setCreateForm((p) => ({ ...p, date: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>备注</Label>
              <Input
                placeholder="借款原因等"
                value={createForm.description}
                onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <Button type="submit" className="w-full" disabled={formLoading}>
              {formLoading ? "创建中..." : "创建"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* 收款对话框 */}
      <Dialog open={repayOpen} onOpenChange={(o) => { setRepayOpen(o); if (!o) setRepayItem(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>收款登记</DialogTitle>
            <DialogDescription>
              {repayItem && (
                <span>
                  {repayItem.person} 共欠 ¥{repayItem.amount.toFixed(2)}，剩余 ¥{repayItem.remainingAmount.toFixed(2)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRepay} className="space-y-4">
            <div className="space-y-2">
              <Label>收款金额</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={repayItem?.remainingAmount || 0}
                placeholder="0.00"
                value={repayForm.amount}
                onChange={(e) => setRepayForm((p) => ({ ...p, amount: e.target.value }))}
                required
              />
              {repayItem && (
                <p className="text-xs text-muted-foreground">
                  最多可收 ¥{repayItem.remainingAmount.toFixed(2)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>入款账户</Label>
              <Select
                value={repayForm.accountId}
                onValueChange={(v) => v && setRepayForm((p) => ({ ...p, accountId: v }))}
              >
                <SelectTrigger>
                  <SelectValue>
                    {(v: string | null) => {
                      if (!v) return "选择账户";
                      const a = accounts.find((a) => a.id === v);
                      return a ? a.name : "选择账户";
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

            <div className="space-y-2">
              <Label>收款日期</Label>
              <Input
                type="date"
                value={repayForm.date}
                onChange={(e) => setRepayForm((p) => ({ ...p, date: e.target.value }))}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={repayLoading}>
              {repayLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {repayLoading ? "登记中..." : "确认收款"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
