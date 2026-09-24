"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["", "ホーム"],
  ["/talk", "トーク"],
  ["/events", "イベント"],
  ["/shop", "ショップ"],
  ["/ranking", "ランキング"],
] as const;

export function ClubTabs({ slug }: { slug: string }) {
  const pathname = usePathname();
  const base = `/c/${slug}`;
  return (
    <nav className="mt-6 flex gap-1 overflow-x-auto border-b border-zinc-200 text-sm font-bold">
      {TABS.map(([path, label]) => {
        const href = base + path;
        const active = path === "" ? pathname === base || pathname.startsWith(`${base}/posts`) : pathname.startsWith(href);
        return (
          <Link
            key={path}
            href={href}
            className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2 ${active ? "border-pink-500 text-pink-600" : "border-transparent text-zinc-500 hover:text-pink-600"}`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
