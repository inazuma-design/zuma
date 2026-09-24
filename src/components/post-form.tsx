"use client";

import { useActionState } from "react";
import { GateSelect } from "@/components/gate-select";
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
        <label className="label" htmlFor="videoUrl">動画URL（任意・YouTube / Vimeo）</label>
        <input id="videoUrl" name="videoUrl" type="url" className="input" defaultValue={post?.video_url} placeholder="https://www.youtube.com/watch?v=..." />
        <p className="mt-1 text-xs text-zinc-500">限定公開の動画URLを設定すると、公開範囲の会員だけが再生できます。</p>
      </div>
      <GateSelect plans={plans} defaultValue={post?.min_price} />
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary" disabled={pending}>{post ? "更新する" : "投稿する"}</button>
    </form>
  );
}
