import Link from "next/link";
import { timeAgo, yen } from "@/lib/format";
import type { PostWithStats } from "@/lib/queries";

export function PostCard({
  post,
  href,
  unlocked,
  clubName,
}: {
  post: PostWithStats;
  href: string;
  unlocked: boolean;
  clubName?: string;
}) {
  return (
    <Link href={href} className="card block p-5 transition hover:shadow-md">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        {clubName && <span className="font-bold text-zinc-700">{clubName}</span>}
        <span>{timeAgo(post.created_at)}</span>
        {post.min_price === 0 ? (
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-bold">全体公開</span>
        ) : (
          <span className="rounded-full bg-pink-50 px-2 py-0.5 font-bold text-pink-600">
            🔒 {yen(post.min_price)}以上のプラン限定
          </span>
        )}
      </div>
      <h3 className="mt-2 text-lg font-bold">{post.video_url && "▶ "}{post.title}</h3>
      {unlocked ? (
        <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-sm text-zinc-600">{post.body}</p>
      ) : (
        <div className="relative mt-2 overflow-hidden rounded-lg">
          <p className="select-none text-sm text-zinc-600 blur-sm" aria-hidden>
            この投稿は会員限定です。プランに加入すると続きを読むことができます。ここに本文が入ります。
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="rounded-full bg-zinc-900/80 px-4 py-1.5 text-xs font-bold text-white">
              プランに加入して読む
            </span>
          </div>
        </div>
      )}
      <div className="mt-3 flex gap-4 text-xs text-zinc-500">
        <span>♡ {post.like_count}</span>
        <span>💬 {post.comment_count}</span>
      </div>
    </Link>
  );
}
