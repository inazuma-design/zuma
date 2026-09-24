"use client";

import { useActionState } from "react";
import { createClub, updateClub } from "@/lib/actions";
import { CATEGORIES, THEMES } from "@/lib/format";
import type { Club } from "@/lib/types";

export function ClubForm({ club }: { club?: Club }) {
  const [state, action, pending] = useActionState(club ? updateClub : createClub, undefined);
  return (
    <form action={action} className="card space-y-4 p-6">
      <div>
        <label className="label" htmlFor="name">ファンクラブ名</label>
        <input id="name" name="name" className="input" defaultValue={club?.name} required maxLength={60} />
      </div>
      {!club && (
        <div>
          <label className="label" htmlFor="slug">URL</label>
          <div className="flex items-center gap-1 text-sm text-zinc-500">
            <span>/c/</span>
            <input id="slug" name="slug" className="input" placeholder="my-fanclub" required pattern="[a-z0-9][a-z0-9-]{2,30}" />
          </div>
        </div>
      )}
      <div>
        <label className="label" htmlFor="tagline">キャッチコピー</label>
        <input id="tagline" name="tagline" className="input" defaultValue={club?.tagline} maxLength={80} />
      </div>
      <div>
        <label className="label" htmlFor="description">紹介文</label>
        <textarea id="description" name="description" className="input min-h-28" defaultValue={club?.description} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="category">カテゴリ</label>
          <select id="category" name="category" className="input" defaultValue={club?.category ?? "その他"}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <span className="label">テーマカラー</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(THEMES).map(([key, t]) => (
              <label key={key} className="cursor-pointer" title={t.label}>
                <input type="radio" name="theme" value={key} defaultChecked={(club?.theme ?? "pink") === key} className="peer sr-only" />
                <span className={`block h-8 w-8 rounded-full bg-gradient-to-br ring-offset-2 peer-checked:ring-2 peer-checked:ring-zinc-800 ${t.gradient}`} />
              </label>
            ))}
          </div>
        </div>
      </div>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{state.ok}</p>}
      <button className="btn-primary" disabled={pending}>{club ? "保存する" : "ファンクラブを開設する"}</button>
    </form>
  );
}
