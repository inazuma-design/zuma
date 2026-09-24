import Link from "next/link";
import { yen } from "@/lib/format";
import type { Plan } from "@/lib/types";

export function PlanList({
  plans,
  slug,
  currentPlanId,
  isOwner,
}: {
  plans: Plan[];
  slug: string;
  currentPlanId?: number;
  isOwner?: boolean;
}) {
  if (plans.length === 0) return <p className="text-sm text-zinc-500">現在加入できるプランはありません</p>;
  return (
    <div className="space-y-3">
      {plans.map((p) => {
        const current = p.id === currentPlanId;
        return (
          <div key={p.id} className={`card p-4 ${current ? "ring-2 ring-pink-400" : ""}`}>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="font-bold">{p.name}</h3>
              <p className="whitespace-nowrap">
                <span className="text-lg font-black">{yen(p.price)}</span>
                <span className="text-xs text-zinc-500">/月</span>
              </p>
            </div>
            {p.description && <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-600">{p.description}</p>}
            <div className="mt-3">
              {isOwner ? (
                <span className="text-xs text-zinc-400">あなたのファンクラブです</span>
              ) : current ? (
                <span className="btn w-full bg-pink-50 text-pink-600">加入中</span>
              ) : (
                <Link href={`/c/${slug}/join/${p.id}`} className="btn-primary w-full">
                  {currentPlanId ? "このプランに変更" : "このプランに入会する"}
                </Link>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
