"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2, CreditCard } from "lucide-react";
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
import { toast } from "sonner";

interface Bill {
  id: string;
  amount: number;
  remainingAmount: number;
  description: string | null;
  date: string | number | Date;
  source: string;
  categoryId: string | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

function getTodayLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const sources = ["花呗", "京东白条", "拼多多", "美团", "信用卡", "其他"];

export function CreditBillList({ bills, categories }: { bills: Bill[]; categories: Category[] }) {
  const router = useRouter();
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [form, setForm] = useState({
    amount: "",
    source: "",
    description: "",
    date: "",
    categoryId: "",
  });

  function openEdit(bill: Bill) {
    setEditingBill(bill);
    setForm({
      amount: String(bill.amount),
      source: bill.source,
      description: bill.description || "",
      date: bill.date instanceof Date
        ? bill.date.toISOString().split("T")[0]
        : typeof bill.date === "string"
          ? bill.date.split("T")[0]
          : new Date(bill.date).toISOString().split("T")[0],
      categoryId: bill.categoryId || "",
    });
    setFormOpen(true);
  }

  async function handleEditBill(billId: string) {
    setFormLoading(true);
    const res = await fetch("/api/credit-bills", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: billId,
        amount: Number(form.amount),
        source: form.source,
        description: form.description,
        categoryId: form.categoryId,
      }),
    });
    if (res.ok) {
      toast.success("已更新");
      setFormOpen(false);
      setEditingBill(null);
      router.refresh();
    } else {
      const data = await res.json();
      toast.error(data.error || "更新失败");
    }
    setFormLoading(false);
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除这条账单？")) return;
    const res = await fetch(`/api/credit-bills?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("已删除");
      router.refresh();
    } else {
      toast.error("删除失败");
    }
  }

  if (bills.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>该账户暂无消费账单</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-1">
        {bills.map((b) => (
          <div
            key={b.id}
            className="flex items-center gap-4 p-3 rounded-xl hover:bg-accent/50 transition-colors group"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
              style={{ backgroundColor: `${b.categoryColor}20` }}
            >
              {b.categoryIcon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{b.categoryName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {b.description || "无备注"}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-red-500">
                -¥{b.amount.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground">
                {new Date(b.date).toLocaleDateString("zh-CN")}
              </p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => openEdit(b)}
                className="p-1.5 rounded-md hover:text-primary hover:bg-primary/10 text-muted-foreground"
                type="button"
                title="编辑"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDelete(b.id)}
                className="p-1.5 rounded-md hover:text-destructive hover:bg-destructive/10 text-muted-foreground"
                type="button"
                title="删除"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) setEditingBill(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑账单</DialogTitle>
            <DialogDescription>修改消费记录</DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => { e.preventDefault(); editingBill && handleEditBill(editingBill.id); }} className="space-y-4">
            <div className="space-y-2">
              <Label>金额</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>来源</Label>
              <Select value={form.source} onValueChange={(v) => v && setForm((p) => ({ ...p, source: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sources.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>分类</Label>
              <Select value={form.categoryId} onValueChange={(v) => v && setForm((p) => ({ ...p, categoryId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="选择分类">
                    {(value: string | null) => {
                      if (!value) return "选择分类";
                      const cat = categories.find((c) => c.id === value);
                      return cat ? `${cat.icon} ${cat.name}` : "选择分类";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>备注</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              />
            </div>

            <Button type="submit" className="w-full" disabled={formLoading}>
              {formLoading ? "保存中..." : "保存修改"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
