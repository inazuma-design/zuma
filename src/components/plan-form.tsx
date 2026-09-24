"use client";

import { useActionState } from "react";
import { createPlan } from "@/lib/actions";

export function PlanForm() {
  const [state, action, pending] = useActionState(createPlan, undefined);
  return (
    <form action={action} className="card space-y-3 p-5">
      <h2 className="font-black">プランを追加</h2>
      <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
        <input name="name" className="input" placeholder="プラン名（例: プレミアムプラン）" required maxLength={40} />
        <div className="flex items-center gap-1">
          <span className="text-sm">¥</span>
          <input name="price" type="number" min={100} max={100000} step={1} className="input" placeholder="月額" required />
        </div>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <label htmlFor="trialDays">無料体験期間</label>
        <input id="trialDays" name="trialDays" type="number" min={0} max={31} defaultValue={0} className="input w-20" />
        <span>日（0でなし）</span>
      </div>
      <textarea name="description" className="input min-h-20" placeholder="特典内容" />
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.ok}</p>}
      <button className="btn-primary" disabled={pending}>追加する</button>
    </form>
  );
}
