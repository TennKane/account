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
import { Tags, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  icon: string;
  color: string;
}

const defaultIcons = [
  "🍽️", "🚗", "🛒", "🏠", "🎮", "🏥", "📚", "💊",
  "☕", "🎬", "✈️", "👕", "📱", "💻", "🎂", "🏋️",
  "💰", "💼", "🧧", "📦", "🎁", "🏫", "🐱", "🌿",
];

const defaultColors = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "expense" as "income" | "expense",
    icon: "📦",
    color: "#6b7280",
  });

  const fetchCategories = useCallback(async () => {
    const res = await fetch("/api/categories");
    const data = await res.json();
    setCategories(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  function openCreate() {
    setFormData({ name: "", type: "expense", icon: "📦", color: "#6b7280" });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);

    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      toast.success("创建成功");
      setDialogOpen(false);
      fetchCategories();
    } else {
      const data = await res.json();
      toast.error(data.error || "创建失败");
    }
    setFormLoading(false);
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`确定删除分类「${name}」？`)) return;
    setDeleting(true);
    const res = await fetch(`/api/categories?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("已删除");
      fetchCategories();
    } else {
      toast.error("删除失败");
    }
    setDeleting(false);
  }

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">分类</h1>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          添加分类
        </Button>
      </div>

      {loading ? (
        <GlassCard className="p-6 text-center text-muted-foreground">加载中...</GlassCard>
      ) : (
        <>
          {/* 支出分类 */}
          <GlassCard className="p-6">
            <h2 className="font-semibold mb-4 text-red-500">支出分类</h2>
            {expenseCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无支出分类</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {expenseCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors group"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                      style={{ backgroundColor: `${cat.color}20` }}
                    >
                      {cat.icon}
                    </div>
                    <span className="text-sm font-medium flex-1">{cat.name}</span>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      disabled={deleting}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive disabled:opacity-50"
                    >
                      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* 收入分类 */}
          <GlassCard className="p-6">
            <h2 className="font-semibold mb-4 text-green-500">收入分类</h2>
            {incomeCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">暂无收入分类</p>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {incomeCategories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-accent/50 transition-colors group"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                      style={{ backgroundColor: `${cat.color}20` }}
                    >
                      {cat.icon}
                    </div>
                    <span className="text-sm font-medium flex-1">{cat.name}</span>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      disabled={deleting}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive disabled:opacity-50"
                    >
                      {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </>
      )}

      {/* 创建分类对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加分类</DialogTitle>
            <DialogDescription>创建新的收支分类</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>分类名称</Label>
              <Input
                placeholder="例如：外卖"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>类型</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => v && setFormData((prev) => ({ ...prev, type: v as "income" | "expense" }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="expense">支出</SelectItem>
                  <SelectItem value="income">收入</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>图标</Label>
              <div className="flex flex-wrap gap-2">
                {defaultIcons.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, icon }))}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-all ${
                      formData.icon === icon
                        ? "ring-2 ring-primary bg-primary/10 scale-110"
                        : "hover:bg-accent"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>颜色</Label>
              <div className="flex gap-2">
                {defaultColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, color }))}
                    className={`w-8 h-8 rounded-full transition-all ${
                      formData.color === color ? "ring-2 ring-offset-2 ring-primary scale-110" : ""
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={formLoading}>
              {formLoading ? "创建中..." : "创建"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
