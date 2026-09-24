"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  GitBranch,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === "/"
      ? pathname === href
      : pathname.startsWith(`${href}/`) || pathname === href;

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 z-30 hidden h-screen w-[72px] shrink-0 flex-col border-r border-border bg-zinc-50 px-2.5 py-4 sm:flex min-[901px]:w-[252px] min-[901px]:px-3">
        <Link
          href="/"
          className="flex h-[42px] items-center justify-center gap-2.5 px-2.5 font-semibold tracking-[-0.01em] min-[901px]:justify-start"
          aria-label="Decision Trail home"
        >
          <span className="grid size-[30px] shrink-0 place-items-center rounded-lg bg-primary text-white">
            <GitBranch size={17} />
          </span>
          <span className="hidden min-[901px]:inline">Decision Trail</span>
        </Link>
        <nav
          className="mt-[26px] grid gap-[3px]"
          aria-label="Primary navigation"
        >
          <p className="mb-1.5 hidden px-2.5 text-[11px] font-medium text-muted-foreground min-[901px]:block">
            Workspace
          </p>
          {[
            ["/", "Overview", LayoutDashboard],
            ["/entities", "Decision memory", BookOpen],
            ["/meetings", "Meetings", CalendarDays],
            ["/search", "Ask across meetings", Search],
          ].map(([href, label, Icon]) => (
            <Link
              href={href as string}
              key={href as string}
              aria-current={isActive(href as string) ? "page" : undefined}
              className={cn(
                "flex min-h-9 items-center justify-center gap-2.5 rounded-md px-0 text-[0] text-zinc-700 transition-colors hover:bg-muted min-[901px]:justify-start min-[901px]:px-2.5 min-[901px]:text-[13px] [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-zinc-500",
                isActive(href as string) &&
                  "bg-muted font-medium text-foreground",
              )}
            >
              <Icon />
              {label as string}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-h-screen min-w-0 flex-1">
        <main>{children}</main>
      </div>
    </div>
  );
}
