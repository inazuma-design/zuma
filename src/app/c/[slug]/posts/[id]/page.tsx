import Link from "next/link";
import { notFound } from "next/navigation";
import { PlanList } from "@/components/plan-list";
import { getCurrentUser } from "@/lib/auth";
import { addComment, toggleLike } from "@/lib/actions";
import { formatDate, timeAgo, yen } from "@/lib/format";
import {
  accessLevel,
  canView,
  getClubBySlug,
  getMembership,
  getPost,
  hasLiked,
  isMembershipValid,
  listComments,
  listPlans,
} from "@/lib/queries";

export default async function PostPage({ params }: PageProps<"/c/[slug]/posts/[id]">) {
  const { slug, id } = await params;
  const club = getClubBySlug(slug);
  const post = getPost(Number(id));
  if (!club || !post || post.club_id !== club.id) notFound();

  const user = await getCurrentUser();
  const unlocked = canView(post, accessLevel(user?.id, club));
  const membership = user ? getMembership(user.id, club.id) : undefined;

  return (
    <div className="mx-auto mt-8 max-w-2xl">
      <Link href={`/c/${club.slug}`} className="text-sm text-zinc-500 hover:text-pink-600">← {club.name}</Link>
      <article className="card mt-3 p-6 sm:p-8">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span>{formatDate(post.created_at)}</span>
          {post.min_price === 0 ? (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 font-bold">全体公開</span>
          ) : (
            <span className="rounded-full bg-pink-50 px-2 py-0.5 font-bold text-pink-600">
              🔒 {yen(post.min_price)}以上のプラン限定
            </span>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-black">{post.title}</h1>

        {unlocked ? (
          <>
            <div className="mt-6 whitespace-pre-wrap leading-relaxed">{post.body}</div>
            <div className="mt-8 flex items-center gap-4 border-t border-zinc-100 pt-4 text-sm">
              {user ? (
                <form action={toggleLike}>
                  <input type="hidden" name="postId" value={post.id} />
                  <button className="font-bold text-pink-600">
                    {hasLiked(user.id, post.id) ? "♥" : "♡"} いいね {post.like_count}
                  </button>
                </form>
              ) : (
                <span className="text-zinc-500">♡ {post.like_count}</span>
              )}
              <span className="text-zinc-500">💬 {post.comment_count}</span>
            </div>
          </>
        ) : (
          <div className="mt-6 rounded-2xl bg-zinc-50 p-6 text-center">
            <p className="text-3xl">🔒</p>
            <p className="mt-2 font-bold">この投稿は {yen(post.min_price)} 以上のプラン会員限定です</p>
            <p className="mt-1 text-sm text-zinc-500">
              {isMembershipValid(membership)
                ? "プランを変更すると閲覧できます"
                : user
                  ? "プランに入会すると閲覧できます"
                  : "ログインして、プランに入会すると閲覧できます"}
            </p>
            <div className="mt-6 text-left">
              <PlanList
                plans={listPlans(club.id).filter((p) => p.price >= post.min_price)}
                slug={club.slug}
                currentPlanId={membership?.status === "active" ? membership.plan_id : undefined}
              />
            </div>
          </div>
        )}
      </article>

      {unlocked && <Comments postId={post.id} canComment={!!user} />}
    </div>
  );
}

function Comments({ postId, canComment }: { postId: number; canComment: boolean }) {
  const comments = listComments(postId);
  return (
    <section className="mt-6">
      <h2 className="font-black">コメント</h2>
      <ul className="mt-3 space-y-3">
        {comments.map((c) => (
          <li key={c.id} className="card p-4 text-sm">
            <p className="text-xs text-zinc-500">
              <span className="font-bold text-zinc-700">{c.user_name}</span> ・ {timeAgo(c.created_at)}
            </p>
            <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
          </li>
        ))}
        {comments.length === 0 && <li className="text-sm text-zinc-500">まだコメントはありません</li>}
      </ul>
      {canComment && (
        <form action={addComment} className="mt-4 flex gap-2">
          <input type="hidden" name="postId" value={postId} />
          <input name="body" className="input" placeholder="コメントを書く" required maxLength={1000} />
          <button className="btn-primary shrink-0">送信</button>
        </form>
      )}
    </section>
  );
}
