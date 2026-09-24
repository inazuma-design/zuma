"use client";

import { useActionState, useState } from "react";
import { purchaseProduct } from "@/lib/actions";

export function PurchaseForm({ productId, price, maxQty }: { productId: number; price: number; maxQty: number }) {
  const [state, action, pending] = useActionState(purchaseProduct, undefined);
  const [qty, setQty] = useState(1);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="productId" value={productId} />
      <div>
        <label className="label" htmlFor="quantity">数量</label>
        <select id="quantity" name="quantity" className="input w-24" value={qty} onChange={(e) => setQty(Number(e.target.value))}>
          {Array.from({ length: maxQty }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="address">お届け先（住所・氏名）</label>
        <textarea id="address" name="address" className="input min-h-20" required placeholder="〒000-0000 東京都… 山田 太郎" />
      </div>
      <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700">デモ環境のため実際の決済は行われません。</p>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        ¥{(price * qty).toLocaleString("ja-JP")} で購入する
      </button>
    </form>
  );
}
