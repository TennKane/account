import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { type HTMLAttributes } from "react";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  strong?: boolean;
}

export function GlassCard({ className, strong = false, ...props }: GlassCardProps) {
  return (
    <Card
      className={cn(
        strong ? "glass-strong" : "glass",
        "shadow-lg shadow-black/5",
        className
      )}
      {...props}
    />
  );
}
