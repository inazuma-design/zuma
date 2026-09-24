import Link from "next/link";
import { PostCard } from "@/components/post-card";
import { requireUser } from "@/lib/auth";
import { accessLevel, canView, getClubById, listFeedForUser } from "@/lib/queries";

export const metadata = { title: "タイムライン" };

export default async function Feed() {
  const user = await requireUser("/feed");
  const posts = listFeedForUser(user.id);
  const levels = new Map<number, number>();
  const levelFor = (clubId: number) => {
    if (!levels.has(clubId)) {
      levels.set(clubId, accessLevel(user.id, getClubById(clubId)!));
    }
    return levels.get(clubId)!;
  };
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-black">タイムライン</h1>
      <p className="mt-1 text-sm text-zinc-500">加入中のファンクラブの新着投稿</p>
      <div className="mt-6 space-y-4">
        {posts.length === 0 && (
          <p className="text-sm text-zinc-500">
            投稿がありません。<Link href="/explore" className="font-bold text-pink-600">ファンクラブをさがす</Link>
          </p>
        )}
        {posts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            href={`/c/${p.club_slug}/posts/${p.id}`}
            unlocked={canView(p, levelFor(p.club_id))}
            clubName={p.club_name}
          />
        ))}
      </div>
    </div>
  );
}
