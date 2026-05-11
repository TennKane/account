"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { User, Lock, Save } from "lucide-react";

export default function SettingsPage() {
  const { data: session, update } = useSession();

  // 名称修改
  const [name, setName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);

  // 密码修改
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [session]);

  async function handleNameUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;

    setNameLoading(true);
    const res = await fetch("/api/auth/update-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });

    if (res.ok) {
      toast.success("名称已更新");
      await update();
    } else {
      toast.error("更新失败");
    }
    setNameLoading(false);
  }

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("两次密码不一致");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("新密码至少需要 6 位");
      return;
    }

    setPasswordLoading(true);
    const res = await fetch("/api/auth/update-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword,
        newPassword,
      }),
    });

    if (res.ok) {
      toast.success("密码已更新");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      const data = await res.json();
      toast.error(data.error || "修改失败");
    }
    setPasswordLoading(false);
  }

  const avatarLetter = session?.user?.name?.[0] || "U";

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">设置</h1>

      {/* 个人信息 */}
      <GlassCard className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-primary text-2xl font-semibold">
            {avatarLetter}
          </div>
          <div>
            <p className="font-medium text-lg">{session?.user?.name}</p>
            <p className="text-sm text-muted-foreground">{session?.user?.email}</p>
          </div>
        </div>

        <Separator className="mb-6" />

        <form onSubmit={handleNameUpdate} className="space-y-4">
          <div className="space-y-2">
            <Label>昵称</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="你的昵称"
                />
              </div>
              <Button type="submit" disabled={nameLoading || !name.trim()}>
                {nameLoading ? "保存中..." : "保存"}
              </Button>
            </div>
          </div>
        </form>
      </GlassCard>

      {/* 修改密码 */}
      <GlassCard className="p-6">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Lock className="w-4 h-4" />
          修改密码
        </h2>

        <form onSubmit={handlePasswordUpdate} className="space-y-4">
          <div className="space-y-2">
            <Label>当前密码</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="输入当前密码"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>新密码</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="至少 6 位"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>确认新密码</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入新密码"
              required
            />
          </div>

          <Button type="submit" disabled={passwordLoading}>
            {passwordLoading ? "修改中..." : "修改密码"}
          </Button>
        </form>
      </GlassCard>
    </div>
  );
}
