import type { Plan } from "@/lib/types";

/** "Who can access this" selector shared by posts, talk rooms, events and products. */
export function GateSelect({ plans, defaultValue, publicLabel = "全体公開（誰でも）" }: { plans: Plan[]; defaultValue?: number; publicLabel?: string }) {
  return (
    <div>
      <label className="label" htmlFor="minPrice">公開範囲</label>
      <select id="minPrice" name="minPrice" className="input" defaultValue={defaultValue ?? plans[0]?.price ?? 0}>
        <option value={0}>{publicLabel}</option>
        {plans.map((p) => (
          <option key={p.id} value={p.price}>
            {p.name}（¥{p.price.toLocaleString()}）以上の会員
          </option>
        ))}
      </select>
    </div>
  );
}
