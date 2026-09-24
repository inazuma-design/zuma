import Link from "next/link";
import { Avatar } from "@/components/club-card";
import { requireUser } from "@/lib/auth";
import { cancelMembership } from "@/lib/actions";
import { formatDate, formatDateTime, yen } from "@/lib/format";
import { isMembershipValid, listMyEvents, listMyMemberships, listMyOrders, processRenewals } from "@/lib/queries";

export const metadata = { title: "マイページ" };

export default async function MyPage() {
  const user = await requireUser("/mypage");
  processRenewals();
  const memberships = listMyMemberships(user.id);
  const current = memberships.filter((m) => isMembershipValid(m));
  const past = memberships.filter((m) => !isMembershipValid(m));
  const events = listMyEvents(user.id);
  const orders = listMyOrders(user.id);
  const monthly = current.filter((m) => m.status === "active").reduce((s, m) => s + m.plan_price, 0);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-black">マイページ</h1>
      <div className="card mt-5 flex flex-wrap items-center gap-4 p-5">
        <Avatar name={user.name} themeKey="purple" className="h-14 w-14 text-xl" />
        <div className="flex-1">
          <p className="font-bold">{user.name}</p>
          <p className="text-sm text-zinc-500">{user.email}</p>
        </div>
        <div className="text-right text-sm">
          <p className="text-zinc-500">毎月のお支払い</p>
          <p className="text-xl font-black">{yen(monthly)}</p>
        </div>
      </div>

      <h2 className="mt-10 text-lg font-black">加入中のファンクラブ</h2>
      {current.length === 0 && (
        <p className="mt-3 text-sm text-zinc-500">
          まだ加入していません。<Link href="/explore" className="font-bold text-pink-600">ファンクラブをさがす</Link>
        </p>
      )}
      <div className="mt-3 space-y-3">
        {current.map((m) => (
          <div key={m.id} className="card flex flex-wrap items-center gap-4 p-4">
            <Avatar name={m.club_name} themeKey={m.club_theme} className="h-12 w-12 text-lg" />
            <div className="min-w-0 flex-1">
              <Link href={`/c/${m.club_slug}`} className="font-bold hover:underline">{m.club_name}</Link>
              <p className="text-sm text-zinc-500">
                {m.plan_name}（{yen(m.plan_price)}/月）・{formatDate(m.started_at)}から
              </p>
              <p className="text-xs text-zinc-500">
                {m.status !== "active"
                  ? `退会手続き済み・${formatDate(m.current_period_end)}まで閲覧できます`
                  : m.is_trial
                    ? `無料体験中・${formatDate(m.current_period_end)}から${yen(m.plan_price)}/月`
                    : `次回更新日: ${formatDate(m.current_period_end)}`}
              </p>
            </div>
            <Link href={`/c/${m.club_slug}/card`} className="btn-outline text-xs">🪪 会員証</Link>
            {m.status === "active" ? (
              <form action={cancelMembership}>
                <input type="hidden" name="clubId" value={m.club_id} />
                <button className="btn-outline text-xs">退会する</button>
              </form>
            ) : (
              <Link href={`/c/${m.club_slug}/join/${m.plan_id}`} className="btn-primary text-xs">再入会</Link>
            )}
          </div>
        ))}
      </div>

      {events.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-black">参加予定のイベント</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {events.map((e) => (
              <li key={e.id}>
                <Link href={`/c/${e.club_slug}/events/${e.id}`} className="card flex flex-wrap items-center gap-2 px-4 py-3 hover:shadow-md">
                  <span className="font-bold">{e.kind === "online" ? "🎥" : "📍"} {e.title}</span>
                  <span className="text-xs text-zinc-500">{e.club_name}</span>
                  <span className="ml-auto text-xs font-bold text-pink-600">{formatDateTime(e.starts_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {orders.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-black">購入履歴</h2>
          <ul className="card mt-3 divide-y divide-zinc-100 text-sm">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                <span className="font-bold">{o.product_name} × {o.quantity}</span>
                <span className="text-xs text-zinc-500">{o.club_name} ・ {formatDate(o.created_at)}</span>
                <span className="ml-auto font-bold">{yen(o.amount)}</span>
                <span className={`text-xs font-bold ${o.status === "shipped" ? "text-emerald-600" : "text-amber-600"}`}>
                  {o.status === "shipped" ? "発送済み" : "発送準備中"}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {past.length > 0 && (
        <>
          <h2 className="mt-10 text-lg font-black text-zinc-500">過去に加入したファンクラブ</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {past.map((m) => (
              <li key={m.id} className="flex items-center justify-between rounded-lg bg-white px-4 py-3 ring-1 ring-zinc-200">
                <Link href={`/c/${m.club_slug}`} className="font-bold">{m.club_name}</Link>
                <span className="text-zinc-400">{formatDate(m.current_period_end)} 終了</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
