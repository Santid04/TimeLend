"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, LayoutDashboard, PlusCircle, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const navigationItems = [
  {
    href: "/",
    icon: Home,
    label: "Home",
  },
  {
    href: "/create",
    icon: PlusCircle,
    label: "Create",
  },
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
  },
] as const;

export function SiteNavigation() {
  const pathname = usePathname();

  return (
    <header className="sticky top-4 z-50">
      <div className="glass-noise mx-auto mt-4 flex w-full max-w-7xl items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 shadow-[0_20px_60px_-28px_rgba(2,6,23,0.95)] backdrop-blur-xl sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 shrink-0 items-center">
            <Image
              alt="TimeLend logo"
              className="h-8 w-auto object-contain drop-shadow-[0_10px_24px_rgba(76,214,255,0.18)] sm:h-9"
              height={36}
              priority
              src="/logo.png"
              width={144}
            />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate font-display text-sm font-semibold tracking-tight text-white">
                TimeLend
              </p>
              <Badge className="hidden sm:inline-flex" variant="secondary">
                <Sparkles className="mr-1 size-3" />
                Fuji demo
              </Badge>
            </div>
            <p className="hidden truncate text-xs text-slate-400 md:block">
              Commitment escrow and AI verification for Web3 accountability.
            </p>
          </div>
        </div>

        <nav aria-label="Primary navigation" className="flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.04] p-1.5">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                className={cn(
                  "relative flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:text-white",
                  isActive ? "text-white" : "",
                )}
                href={item.href}
                key={item.href}
              >
                {isActive ? (
                  <motion.span
                    className="absolute inset-0 -z-10 rounded-lg border border-cyan-300/14 bg-[linear-gradient(135deg,rgba(76,214,255,0.16),rgba(99,102,241,0.18))] shadow-[0_12px_30px_-18px_rgba(76,214,255,0.75)]"
                    layoutId="site-nav-active-pill"
                    transition={{ duration: 0.22, ease: "easeOut" }}
                  />
                ) : null}
                <Icon className="size-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
