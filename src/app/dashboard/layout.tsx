import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getClubByOwner } from "@/lib/queries";

export const metadata = { title: "クリエイター管理" };

export default async function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  const user = await requireUser("/dashboard");
  const club = getClubByOwner(user.id);
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black">クリエイター管理</h1>
        {club && (
          <Link href={`/c/${club.slug}`} className="text-sm font-bold text-pink-600">ファンクラブを表示 →</Link>
        )}
      </div>
      {club && (
        <nav className="mt-5 flex gap-1 overflow-x-auto border-b border-zinc-200 text-sm font-bold">
          {[
            ["/dashboard", "概要・会員"],
            ["/dashboard/posts", "投稿"],
            ["/dashboard/talk", "トーク"],
            ["/dashboard/events", "イベント"],
            ["/dashboard/shop", "ショップ"],
            ["/dashboard/plans", "プラン"],
            ["/dashboard/settings", "設定"],
          ].map(([href, label]) => (
            <Link key={href} href={href} className="whitespace-nowrap px-4 py-2 text-zinc-600 hover:text-pink-600">
              {label}
            </Link>
          ))}
        </nav>
      )}
      <div className="mt-6">{children}</div>
    </div>
  );
}
