"use client";

import { useActionState } from "react";
import { savePost } from "@/lib/actions";
import type { Plan, Post } from "@/lib/types";

export function PostForm({ plans, post }: { plans: Plan[]; post?: Post }) {
  const [state, action, pending] = useActionState(savePost, undefined);
  return (
    <form action={action} className="card space-y-4 p-6">
      {post && <input type="hidden" name="postId" value={post.id} />}
      <div>
        <label className="label" htmlFor="title">タイトル</label>
        <input id="title" name="title" className="input" defaultValue={post?.title} required maxLength={100} />
      </div>
      <div>
        <label className="label" htmlFor="body">本文</label>
        <textarea id="body" name="body" className="input min-h-60" defaultValue={post?.body} required />
      </div>
      <div>
        <label className="label" htmlFor="minPrice">公開範囲</label>
        <select id="minPrice" name="minPrice" className="input" defaultValue={post?.min_price ?? plans[0]?.price ?? 0}>
          <option value={0}>全体公開（誰でも閲覧可）</option>
          {plans.map((p) => (
            <option key={p.id} value={p.price}>
              {p.name}（¥{p.price.toLocaleString()}）以上の会員
            </option>
          ))}
        </select>
      </div>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary" disabled={pending}>{post ? "更新する" : "投稿する"}</button>
    </form>
  );
}
