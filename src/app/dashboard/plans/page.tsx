import { redirect } from "next/navigation";
import { PlanForm } from "@/components/plan-form";
import { requireUser } from "@/lib/auth";
import { togglePlan } from "@/lib/actions";
import { yen } from "@/lib/format";
import { getClubByOwner, listPlans } from "@/lib/queries";

export default async function Plans() {
  const club = getClubByOwner((await requireUser("/dashboard")).id);
  if (!club) redirect("/dashboard");
  const plans = listPlans(club.id, true);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-3">
        <p className="text-sm text-zinc-500">
          投稿は「◯円以上のプラン限定」として公開範囲を指定できます。上位プランの会員は下位プランの投稿も閲覧できます。
        </p>
        {plans.map((p) => (
          <div key={p.id} className={`card flex items-center gap-4 p-4 ${p.is_active ? "" : "opacity-60"}`}>
            <div className="flex-1">
              <p className="font-bold">
                {p.name} <span className="ml-1 text-sm font-normal text-zinc-500">{yen(p.price)}/月</span>
                {p.trial_days > 0 && (
                  <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">{p.trial_days}日間無料</span>
                )}
              </p>
              {p.description && <p className="text-sm text-zinc-600">{p.description}</p>}
            </div>
            <form action={togglePlan}>
              <input type="hidden" name="planId" value={p.id} />
              <button className="btn-outline text-xs">{p.is_active ? "募集停止" : "募集再開"}</button>
            </form>
          </div>
        ))}
      </div>
      <PlanForm />
    </div>
  );
}
