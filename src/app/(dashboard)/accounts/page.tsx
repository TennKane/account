"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
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
import { Wallet, Plus, Trash2, Edit3, Loader2, Star, ArrowLeftRight, CreditCard, Handshake } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const accountTypeLabels: Record<string, string> = {
  cash: "现金",
  bank: "银行卡",
  credit: "信用卡",
  savings: "储蓄",
  wallet: "电子钱包",
  advance: "提前消费",
};

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  isDefault: number;
  isDefaultTx: number;
  isDefaultRepay: number;
  isDefaultReceive: number;
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [editAccount, setEditAccount] = useState<Account | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "cash",
    balance: "",
  });

  const fetchAccounts = useCallback(async () => {
    const res = await fetch("/api/accounts");
    const data = await res.json();
    setAccounts(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  function openCreate() {
    setEditAccount(null);
    setFormData({ name: "", type: "cash", balance: "" });
    setDialogOpen(true);
  }

  function openEdit(account: Account) {
    setEditAccount(account);
    setFormData({
      name: account.name,
      type: account.type,
      balance: String(account.balance),
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);

    if (editAccount) {
      const res = await fetch("/api/accounts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editAccount.id, name: formData.name, type: formData.type }),
      });
      if (res.ok) {
        toast.success("更新成功");
        setDialogOpen(false);
        fetchAccounts();
      } else {
        toast.error("更新失败");
      }
    } else {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast.success("创建成功");
        setDialogOpen(false);
        fetchAccounts();
      } else {
        const data = await res.json();
        toast.error(data.error || "创建失败");
      }
    }
    setFormLoading(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`确定删除账户「${name}」？相关的交易记录也会被删除。`)) return;
    setDeleting(true);
    const res = await fetch(`/api/accounts?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("已删除");
      fetchAccounts();
    } else {
      toast.error("删除失败");
    }
    setDeleting(false);
  }

  async function handleSetDefault(id: string, field: string) {
    const res = await fetch("/api/accounts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, [field]: true }),
    });
    if (res.ok) {
      const labels: Record<string, string> = {
        isDefaultTx: "账单默认账户",
        isDefaultRepay: "还款默认账户",
        isDefaultReceive: "收款默认账户",
      };
      toast.success(`已设为${labels[field] || "默认"}`);
      fetchAccounts();
    } else {
      toast.error("设置失败");
    }
  }

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
  const totalAssets = accounts.filter((a) => a.type !== "advance").reduce((sum, a) => sum + a.balance, 0);
  const totalDebt = accounts.filter((a) => a.type === "advance").reduce((sum, a) => sum + a.balance, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">账户</h1>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          添加账户
        </Button>
      </div>

      {/* 总资产 / 总提前消费 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <GlassCard className="p-6 text-center">
          <p className="text-sm text-muted-foreground mb-1">总资产</p>
          <p className="text-3xl font-bold text-primary">
            ¥{totalAssets.toFixed(2)}
          </p>
        </GlassCard>
        <GlassCard className="p-6 text-center">
          <p className="text-sm text-muted-foreground mb-1">总提前消费</p>
          <p className="text-3xl font-bold text-destructive">
            ¥{Math.abs(totalDebt).toFixed(2)}
          </p>
        </GlassCard>
      </div>

      {/* 账户列表 */}
      {loading ? (
        <GlassCard className="p-6 text-center text-muted-foreground">加载中...</GlassCard>
      ) : accounts.length === 0 ? (
        <GlassCard className="p-12 text-center text-muted-foreground">
          <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>还没有账户</p>
          <Button variant="outline" className="mt-3" onClick={openCreate}>
            添加第一个账户
          </Button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {accounts.map((account) => (
            <GlassCard key={account.id} className="p-5">
              <div className="flex items-start justify-between">
                <Link href={`/accounts/${account.id}`} className="flex-1 active:scale-[0.98] transition-transform">
                  <div className="pointer-events-none">
                    <p className="font-semibold">{account.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {accountTypeLabels[account.type] || account.type}
                    </p>
                  </div>
                  <p className={cn("text-xl font-semibold mt-3 pointer-events-none", account.type === "advance" && "text-destructive")}>
                    {account.type === "advance" ? `-¥${Math.abs(account.balance).toFixed(2)}` : `¥${account.balance.toFixed(2)}`}
                  </p>
                </Link>
                <div className="flex flex-col gap-0.5 shrink-0 ml-4">
                  <div className="flex gap-0.5 justify-end">
                    <button
                      onClick={() => handleSetDefault(account.id, "isDefaultTx")}
                      className={`p-1.5 rounded-md transition-colors ${account.isDefaultTx ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`}
                      type="button"
                      title={account.isDefaultTx ? "账单默认" : "设为账单默认"}
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleSetDefault(account.id, "isDefaultRepay")}
                      className={`p-1.5 rounded-md transition-colors ${account.isDefaultRepay ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`}
                      type="button"
                      title={account.isDefaultRepay ? "还款默认" : "设为还款默认"}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleSetDefault(account.id, "isDefaultReceive")}
                      className={`p-1.5 rounded-md transition-colors ${account.isDefaultReceive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-primary hover:bg-primary/10'}`}
                      type="button"
                      title={account.isDefaultReceive ? "收款默认" : "设为收款默认"}
                    >
                      <Handshake className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex gap-0.5 justify-end">
                    <button
                      onClick={() => openEdit(account)}
                      className="p-1.5 rounded-md hover:text-primary hover:bg-primary/10 transition-colors text-muted-foreground"
                      type="button"
                      title="编辑"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(account.id, account.name)}
                      disabled={deleting}
                      className="p-1.5 rounded-md hover:text-destructive hover:bg-destructive/10 transition-colors text-muted-foreground disabled:opacity-50"
                      type="button"
                      title="删除"
                    >
                      {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* 创建/编辑对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editAccount ? "编辑账户" : "添加账户"}</DialogTitle>
            <DialogDescription>
              {editAccount ? "修改账户信息" : "创建一个新的账户"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>账户名称</Label>
              <Input
                placeholder="例如：工资卡"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>类型</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => v && setFormData((prev) => ({ ...prev, type: v }))}
              >
                <SelectTrigger>
                  <SelectValue>
                    {(value: string | null) => value ? (accountTypeLabels[value] || value) : "选择类型"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(accountTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!editAccount && (
              <div className="space-y-2">
                <Label>初始余额</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.balance}
                  onChange={(e) => setFormData((prev) => ({ ...prev, balance: e.target.value }))}
                />
              </div>
            )}

            <Button type="submit" className="w-full" disabled={formLoading}>
              {formLoading ? "保存中..." : editAccount ? "保存" : "创建"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
