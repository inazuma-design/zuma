import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { timeAgo } from "@/lib/format";
import { POINT_RULES, getClubBySlug, getPoints, getRanking, listPointHistory } from "@/lib/queries";

const MEDALS = ["🥇", "🥈", "🥉"];

export default async function Ranking({ params }: PageProps<"/c/[slug]/ranking">) {
  const club = getClubBySlug((await params).slug);
  if (!club) notFound();
  const user = await getCurrentUser();
  const ranking = getRanking(club.id);
  const myPoints = user ? getPoints(user.id, club.id) : 0;
  const history = user ? listPointHistory(user.id, club.id, 10) : [];

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
      <section>
        <h2 className="font-black">ファンランキング</h2>
        <p className="text-sm text-zinc-500">応援ポイントが多いファンのランキングです。</p>
        <ol className="card mt-3 divide-y divide-zinc-100">
          {ranking.length === 0 && <li className="p-6 text-center text-sm text-zinc-500">まだポイントを獲得した会員はいません</li>}
          {ranking.map((r, i) => (
            <li key={r.user_id} className={`flex items-center gap-3 px-5 py-3 ${r.user_id === user?.id ? "bg-pink-50" : ""}`}>
              <span className="w-8 text-center text-lg font-black text-zinc-400">{MEDALS[i] ?? i + 1}</span>
              <span className="flex-1 font-bold">{r.user_name}</span>
              <span className="font-black">{r.total.toLocaleString()}<span className="text-xs font-normal text-zinc-500"> pt</span></span>
            </li>
          ))}
        </ol>
      </section>
      <aside className="space-y-4">
        {user && (
          <div className="card p-5">
            <p className="text-xs font-bold text-zinc-500">あなたの応援ポイント</p>
            <p className="text-3xl font-black">{myPoints.toLocaleString()}<span className="text-sm font-normal"> pt</span></p>
            <Link href={`/c/${club.slug}/card`} className="mt-2 inline-block text-sm font-bold text-pink-600">会員証を見る →</Link>
            {history.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-zinc-100 pt-3 text-xs text-zinc-600">
                {history.map((h, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{h.reason.replace(/ #\d+$/, "")} <span className="text-zinc-400">{timeAgo(h.created_at)}</span></span>
                    <span className="font-bold text-pink-600">+{h.amount}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="card p-5 text-sm">
          <p className="font-bold">ポイントの貯め方</p>
          <ul className="mt-2 space-y-1 text-zinc-600">
            <li>月額会費のお支払い：100円ごとに1pt</li>
            <li>ショップでのお買い物：100円ごとに1pt</li>
            <li>イベント参加登録：{POINT_RULES.event}pt</li>
            <li>コメント：{POINT_RULES.comment}pt</li>
            <li>トーク投稿：{POINT_RULES.talk}pt</li>
            <li>いいね：{POINT_RULES.like}pt</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
