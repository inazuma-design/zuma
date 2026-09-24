import Link from "next/link";
import { theme, yen } from "@/lib/format";
import type { ClubSummary } from "@/lib/queries";

export function ClubCard({ club }: { club: ClubSummary }) {
  const t = theme(club.theme);
  return (
    <Link href={`/c/${club.slug}`} className="card group overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className={`h-24 bg-gradient-to-br ${t.gradient}`} />
      <div className="relative px-4 pb-4">
        <Avatar name={club.owner_name} themeKey={club.theme} className="-mt-8 h-16 w-16 border-4 border-white text-2xl" />
        <p className="mt-2 text-xs text-zinc-500">{club.owner_name}</p>
        <h3 className="font-bold leading-snug group-hover:text-pink-600">{club.name}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-zinc-600">{club.tagline}</p>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className={`rounded-full px-2 py-0.5 font-bold ${t.soft}`}>{club.category}</span>
          <span className="text-zinc-500">
            {club.min_price !== null ? `月額 ${yen(club.min_price)}〜` : "プラン準備中"} ・ 会員 {club.member_count}人
          </span>
        </div>
      </div>
    </Link>
  );
}

export function Avatar({ name, themeKey, className = "" }: { name: string; themeKey: string; className?: string }) {
  return (
    <div
      className={`flex items-center justify-center rounded-full bg-gradient-to-br font-black text-white ${theme(themeKey).gradient} ${className}`}
    >
      {name.slice(0, 1)}
    </div>
  );
}
