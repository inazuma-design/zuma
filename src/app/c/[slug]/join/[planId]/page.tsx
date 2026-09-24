import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { joinPlan } from "@/lib/actions";
import { yen } from "@/lib/format";
import { getClubBySlug, getMembership, getPlan, isMembershipValid } from "@/lib/queries";

export const metadata = { title: "入会手続き" };

export default async function JoinPage({ params }: PageProps<"/c/[slug]/join/[planId]">) {
  const { slug, planId } = await params;
  const club = getClubBySlug(slug);
  const plan = getPlan(Number(planId));
  if (!club || !plan || plan.club_id !== club.id || !plan.is_active) notFound();
  const user = await requireUser(`/c/${slug}/join/${planId}`);
  if (club.owner_id === user.id) redirect(`/c/${slug}`);
  const membership = getMembership(user.id, club.id);
  const isChange = isMembershipValid(membership) && membership!.status === "active";

  return (
    <div className="mx-auto mt-8 max-w-lg">
      <h1 className="text-xl font-black">{isChange ? "プラン変更の確認" : "入会手続き"}</h1>
      <div className="card mt-4 divide-y divide-zinc-100">
        <div className="p-5">
          <p className="text-xs text-zinc-500">{club.name}</p>
          <p className="mt-1 font-bold">{plan.name}</p>
          {plan.description && <p className="mt-1 text-sm text-zinc-600">{plan.description}</p>}
        </div>
        {isChange && (
          <div className="p-5 text-sm text-zinc-600">
            現在のプラン: {membership!.plan_name}（{yen(membership!.plan_price)}/月）
          </div>
        )}
        <div className="flex items-center justify-between p-5">
          <span className="text-sm">お支払い金額（毎月自動更新）</span>
          <span className="text-2xl font-black">{yen(plan.price)}</span>
        </div>
      </div>

      <form action={joinPlan} className="card mt-4 space-y-3 p-5">
        <input type="hidden" name="planId" value={plan.id} />
        <p className="text-sm font-bold">お支払い方法</p>
        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
          デモ環境のため実際の決済は行われません。本番では Stripe 等の決済サービスに接続します。
        </p>
        <input className="input" placeholder="4242 4242 4242 4242" defaultValue="4242 4242 4242 4242" readOnly />
        <ul className="list-disc space-y-1 pl-5 text-xs text-zinc-500">
          <li>入会日から1ヶ月ごとに自動で更新・課金されます。</li>
          <li>マイページからいつでも退会できます。退会後も期間終了日までは閲覧可能です。</li>
        </ul>
        <button className="btn-primary w-full">{isChange ? "プランを変更する" : `${yen(plan.price)}/月 で入会する`}</button>
      </form>
      <Link href={`/c/${slug}`} className="mt-4 block text-center text-sm text-zinc-500">キャンセル</Link>
    </div>
  );
}
