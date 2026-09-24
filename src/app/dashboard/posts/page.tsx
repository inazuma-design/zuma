import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { deletePost } from "@/lib/actions";
import { formatDate, yen } from "@/lib/format";
import { getClubByOwner, listPosts } from "@/lib/queries";

export default async function Posts() {
  const club = getClubByOwner((await requireUser("/dashboard")).id);
  if (!club) redirect("/dashboard");
  const posts = listPosts(club.id);
  return (
    <div>
      <Link href="/dashboard/posts/new" className="btn-primary">＋ 新規投稿</Link>
      <div className="card mt-4 divide-y divide-zinc-100">
        {posts.length === 0 && <p className="p-6 text-center text-sm text-zinc-500">まだ投稿はありません</p>}
        {posts.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <Link href={`/c/${club.slug}/posts/${p.id}`} className="font-bold hover:underline">{p.title}</Link>
              <p className="text-xs text-zinc-500">
                {formatDate(p.created_at)} ・ {p.min_price === 0 ? "全体公開" : `${yen(p.min_price)}以上`} ・ ♡ {p.like_count} ・ 💬 {p.comment_count}
              </p>
            </div>
            <Link href={`/dashboard/posts/${p.id}`} className="btn-outline text-xs">編集</Link>
            <form action={deletePost}>
              <input type="hidden" name="postId" value={p.id} />
              <button className="btn text-xs text-red-500 hover:bg-red-50">削除</button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
