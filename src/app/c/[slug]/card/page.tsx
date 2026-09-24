import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { formatDate, theme } from "@/lib/format";
import { getClubBySlug, getMembership, getPoints, isMembershipValid, memberNumber } from "@/lib/queries";

export const metadata = { title: "デジタル会員証" };

export default async function MemberCard({ params }: PageProps<"/c/[slug]/card">) {
  const { slug } = await params;
  const club = getClubBySlug(slug);
  if (!club) notFound();
  const user = await requireUser(`/c/${slug}/card`);
  const m = getMembership(user.id, club.id);

  if (!m || !isMembershipValid(m)) {
    return (
      <div className="mt-10 text-center">
        <p className="font-bold">会員証は会員の方のみ表示できます</p>
        <Link href={`/c/${slug}#plans`} className="btn-primary mt-4">プランを見る</Link>
      </div>
    );
  }
  const no = String(memberNumber(m.id, club.id)).padStart(6, "0");
  return (
    <div className="mx-auto mt-8 max-w-md">
      <div className={`relative aspect-[1.586] overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-xl ${theme(club.theme).gradient}`}>
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15" />
        <div className="absolute -bottom-16 -left-6 h-44 w-44 rounded-full bg-white/10" />
        <div className="relative flex h-full flex-col">
          <p className="text-xs font-bold tracking-widest opacity-80">OFFICIAL MEMBER CARD</p>
          <p className="mt-1 text-lg font-black leading-tight">{club.name}</p>
          <div className="mt-auto">
            <p className="font-mono text-2xl font-bold tracking-widest">No. {no}</p>
            <div className="mt-2 flex items-end justify-between text-sm">
              <div>
                <p className="text-xl font-black">{user.name}</p>
                <p className="opacity-90">{m.plan_name}</p>
              </div>
              <div className="text-right text-xs opacity-90">
                <p>入会日 {formatDate(m.started_at)}</p>
                <p className="text-base font-black">{getPoints(user.id, club.id).toLocaleString()} pt</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-xs text-zinc-500">
        {m.is_trial ? `無料体験中（${formatDate(m.current_period_end)}まで）` : m.status === "active" ? `有効期限 ${formatDate(m.current_period_end)}（自動更新）` : `有効期限 ${formatDate(m.current_period_end)}`}
      </p>
    </div>
  );
}
