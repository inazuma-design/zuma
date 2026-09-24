import { ClubForm } from "@/components/club-form";
import { requireUser } from "@/lib/auth";
import { formatDate, yen } from "@/lib/format";
import { getClubByOwner, getDashboardStats, isMembershipValid, listPlans, processRenewals } from "@/lib/queries";

export default async function Dashboard() {
  const user = await requireUser("/dashboard");
  const club = getClubByOwner(user.id);
  if (!club) {
    return (
      <div className="max-w-xl">
        <p className="mb-4 text-zinc-600">まずはあなたのファンクラブを開設しましょう。開設は無料です。</p>
        <ClubForm />
      </div>
    );
  }

  processRenewals();
  const stats = getDashboardStats(club.id);
  const plans = listPlans(club.id, true);
  const byPlan = plans.map((p) => ({
    ...p,
    count: stats.members.filter((m) => m.plan_id === p.id && isMembershipValid(m)).length,
  }));

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="会員数" value={`${stats.activeCount}人`} sub={stats.trialCount ? `うち無料体験 ${stats.trialCount}人` : undefined} />
        <Stat label="月間定期収入（MRR）" value={yen(stats.mrr)} />
        <Stat label="今月の売上" value={yen(stats.revenueThisMonth)} />
        <Stat label="累計売上" value={yen(stats.revenueTotal)} sub={`うちショップ ${yen(stats.shopTotal)}`} />
      </div>

      <section>
        <h2 className="font-black">プラン別会員数</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {byPlan.map((p) => (
            <div key={p.id} className="card p-4">
              <p className="text-sm font-bold">{p.name} {!p.is_active && <span className="text-xs text-zinc-400">（停止中）</span>}</p>
              <p className="text-xs text-zinc-500">{yen(p.price)}/月</p>
              <p className="mt-2 text-2xl font-black">{p.count}<span className="text-sm font-normal">人</span></p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-black">会員一覧</h2>
        <div className="card mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500">
              <tr>
                <th className="px-4 py-2">ニックネーム</th>
                <th className="px-4 py-2">プラン</th>
                <th className="px-4 py-2">入会日</th>
                <th className="px-4 py-2">状態</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {stats.members.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-6 text-center text-zinc-500">まだ会員はいません</td></tr>
              )}
              {stats.members.map((m, i) => {
                const valid = isMembershipValid(m);
                return (
                  <tr key={i}>
                    <td className="px-4 py-2 font-bold">{m.user_name}</td>
                    <td className="px-4 py-2">{m.plan_name}</td>
                    <td className="px-4 py-2">{formatDate(m.started_at)}</td>
                    <td className="px-4 py-2">
                      {m.status === "active" && m.is_trial ? (
                        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs font-bold text-sky-700">
                          無料体験中（{formatDate(m.current_period_end)}まで）
                        </span>
                      ) : m.status === "active" ? (
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">継続中</span>
                      ) : valid ? (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">
                          退会予定（{formatDate(m.current_period_end)}）
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-bold text-zinc-500">退会済み</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="text-xs font-bold text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-black">{value}</p>
      {sub && <p className="text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}
