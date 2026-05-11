"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { hash } from "bcryptjs";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      toast.error("两次密码输入不一致");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      toast.error("密码至少需要 6 位");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "注册失败");
        setLoading(false);
        return;
      }

      toast.success("注册成功！请登录");
      router.push("/login");
    } catch {
      toast.error("网络错误，请重试");
      setLoading(false);
    }
  }

  return (
    <GlassCard className="w-full max-w-sm p-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">注册</h1>
        <p className="text-sm text-muted-foreground mt-1">创建你的账本账号</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">昵称</Label>
          <Input
            id="name"
            name="name"
            placeholder="你的昵称"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">邮箱</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="name@example.com"
            required
            autoComplete="email"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">密码</Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="至少 6 位"
            required
            autoComplete="new-password"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">确认密码</Label>
          <Input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            placeholder="再次输入密码"
            required
            autoComplete="new-password"
          />
        </div>

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "注册中..." : "注册"}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground mt-6">
        已有账号？{" "}
        <Link href="/login" className="text-primary hover:underline">
          登录
        </Link>
      </p>
    </GlassCard>
  );
}
