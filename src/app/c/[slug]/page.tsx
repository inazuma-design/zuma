import { notFound } from "next/navigation";
import { PlanList } from "@/components/plan-list";
import { PostCard } from "@/components/post-card";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import {
  accessLevel,
  canView,
  getClubBySlug,
  getMembership,
  isMembershipValid,
  listPlans,
  listPosts,
} from "@/lib/queries";

export default async function ClubPage({ params, searchParams }: PageProps<"/c/[slug]">) {
  const club = getClubBySlug((await params).slug);
  if (!club) notFound();
  const { joined } = await searchParams;
  const user = await getCurrentUser();
  const level = accessLevel(user?.id, club);
  const membership = user ? getMembership(user.id, club.id) : undefined;
  const valid = isMembershipValid(membership);
  const plans = listPlans(club.id);
  const posts = listPosts(club.id);
  const isOwner = user?.id === club.owner_id;

  return (
    <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0">
        {joined && (
          <div className="mb-5 rounded-2xl bg-gradient-to-r from-pink-500 to-fuchsia-500 p-5 text-white">
            <p className="text-lg font-black">🎉 ご入会ありがとうございます！</p>
            <p className="text-sm">会員限定の投稿をお楽しみください。</p>
          </div>
        )}
        {club.tagline && <p className="font-bold text-zinc-700">{club.tagline}</p>}
        <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-600">{club.description}</p>

        <h2 className="mt-10 text-lg font-black">投稿 <span className="text-sm text-zinc-400">{posts.length}件</span></h2>
        <div className="mt-4 space-y-4">
          {posts.length === 0 && <p className="text-sm text-zinc-500">まだ投稿はありません</p>}
          {posts.map((p) => (
            <PostCard key={p.id} post={p} href={`/c/${club.slug}/posts/${p.id}`} unlocked={canView(p, level)} />
          ))}
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        {membership && valid && (
          <div className="card p-4 text-sm">
            <p className="font-bold">加入中: {membership.plan_name}</p>
            <p className="mt-1 text-zinc-500">
              {membership.status === "active"
                ? `次回更新日: ${formatDate(membership.current_period_end)}`
                : `退会済み（${formatDate(membership.current_period_end)}まで閲覧可）`}
            </p>
          </div>
        )}
        <h2 className="text-lg font-black">プラン</h2>
        <PlanList
          plans={plans}
          slug={club.slug}
          currentPlanId={valid && membership?.status === "active" ? membership.plan_id : undefined}
          isOwner={isOwner}
        />
      </aside>
    </div>
  );
}
