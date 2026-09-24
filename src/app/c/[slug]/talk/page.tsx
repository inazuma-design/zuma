import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { gateLabel, timeAgo } from "@/lib/format";
import { accessLevel, canView, getClubBySlug, listTalkRooms } from "@/lib/queries";

export default async function TalkRooms({ params }: PageProps<"/c/[slug]/talk">) {
  const club = getClubBySlug((await params).slug);
  if (!club) notFound();
  const user = await getCurrentUser();
  const level = accessLevel(user?.id, club);
  const rooms = listTalkRooms(club.id);
  return (
    <div className="mt-6 max-w-3xl">
      <p className="text-sm text-zinc-500">テーマごとのトークルームで、クリエイターや会員同士で交流できます。</p>
      <div className="mt-4 space-y-3">
        {rooms.length === 0 && <p className="text-sm text-zinc-500">トークルームはまだありません</p>}
        {rooms.map((r) => {
          const open = canView(r, level);
          return (
            <Link key={r.id} href={`/c/${club.slug}/talk/${r.id}`} className="card flex items-center gap-4 p-4 hover:shadow-md">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-2xl">
                {open ? "💬" : "🔒"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-bold">{r.name}</p>
                <p className="truncate text-sm text-zinc-500">{r.description}</p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  {gateLabel(r.min_price)} ・ {r.message_count}件
                  {r.last_at && ` ・ 最終投稿 ${timeAgo(r.last_at)}`}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
