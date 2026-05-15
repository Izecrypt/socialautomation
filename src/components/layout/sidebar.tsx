"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Rss,
  Inbox,
  Sparkles,
  ListOrdered,
  Settings,
  ScrollText,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/news-sources", label: "News Sources", icon: Rss },
  { href: "/dashboard/news-inbox", label: "News Inbox", icon: Inbox },
  { href: "/dashboard/generated-content", label: "Generated Content", icon: Sparkles },
  { href: "/dashboard/content-queue", label: "Content Queue", icon: ListOrdered },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/logs", label: "Logs", icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-8 px-2">
        <h1 className="text-lg font-bold text-violet-400">Crypto Pulse</h1>
        <p className="text-xs text-zinc-500">RSS → AI → Social</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                active
                  ? "bg-violet-600/20 text-violet-300"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
