import Link from "next/link";
import { ClubCard } from "@/components/club-card";
import { listClubs, listRecentPublicPosts } from "@/lib/queries";
import { theme, timeAgo } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function Home() {
  const clubs = listClubs().slice(0, 6);
  const posts = listRecentPublicPosts(6);
  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-pink-500 via-fuchsia-500 to-violet-600 text-white">
        <div className="mx-auto max-w-5xl px-4 py-20 sm:py-28">
          <p className="text-sm font-bold tracking-widest text-pink-100">FAN COMMUNITY PLATFORM</p>
          <h1 className="mt-3 text-4xl font-black leading-tight sm:text-5xl">
            ファンとつながる、
            <br />
            あなただけの会員サイトを。
          </h1>
          <p className="mt-5 max-w-xl text-pink-50">
            ZUMAなら、月額制のファンクラブを無料ですぐに開設。限定投稿・複数プラン・会員管理まで、ファンコミュニティ運営に必要な機能がそろっています。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/dashboard" className="btn bg-white text-pink-600 hover:bg-pink-50">
              ファンクラブを開設する
            </Link>
            <Link href="/explore" className="btn border border-white/60 text-white hover:bg-white/10">
              ファンクラブをさがす
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            ["💳", "月額課金", "複数の料金プランを自由に設定。毎月自動で継続課金されます。"],
            ["🔒", "限定コンテンツ", "投稿ごとに公開範囲をプラン単位で指定できます。"],
            ["📊", "会員管理", "会員数・売上・プラン別の内訳をダッシュボードで確認。"],
          ].map(([icon, title, text]) => (
            <div key={title} className="card p-6">
              <div className="text-3xl">{icon}</div>
              <h3 className="mt-3 font-bold">{title}</h3>
              <p className="mt-1 text-sm text-zinc-600">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-black">人気のファンクラブ</h2>
          <Link href="/explore" className="text-sm font-bold text-pink-600">すべて見る →</Link>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((c) => (
            <ClubCard key={c.id} club={c} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 pt-14">
        <h2 className="text-2xl font-black">新着投稿</h2>
        <ul className="mt-5 divide-y divide-zinc-200 card">
          {posts.map((p) => (
            <li key={p.id}>
              <Link href={`/c/${p.club_slug}/posts/${p.id}`} className="flex items-center gap-3 px-5 py-4 hover:bg-zinc-50">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br ${theme(p.club_theme).gradient}`} />
                <span className="flex-1 truncate">
                  <span className="font-bold">{p.title}</span>
                  <span className="ml-2 text-xs text-zinc-500">{p.club_name}</span>
                </span>
                {p.min_price > 0 && <span className="text-xs">🔒</span>}
                <span className="text-xs text-zinc-400">{timeAgo(p.created_at)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
