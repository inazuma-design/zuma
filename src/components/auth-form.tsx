"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup } from "@/lib/actions";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next: string }) {
  const [state, action, pending] = useActionState(mode === "login" ? login : signup, undefined);
  const qs = next ? `?next=${encodeURIComponent(next)}` : "";
  return (
    <form action={action} className="card mx-auto mt-12 max-w-sm space-y-4 p-8">
      <h1 className="text-center text-xl font-black">{mode === "login" ? "ログイン" : "新規会員登録"}</h1>
      <input type="hidden" name="next" value={next} />
      {mode === "signup" && (
        <div>
          <label className="label" htmlFor="name">ニックネーム</label>
          <input id="name" name="name" className="input" required maxLength={40} />
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">メールアドレス</label>
        <input id="email" name="email" type="email" className="input" required autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="password">パスワード</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
        />
      </div>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {mode === "login" ? "ログイン" : "登録する（無料）"}
      </button>
      <p className="text-center text-sm text-zinc-500">
        {mode === "login" ? (
          <>アカウントをお持ちでない方は <Link href={`/signup${qs}`} className="font-bold text-pink-600">新規登録</Link></>
        ) : (
          <>登録済みの方は <Link href={`/login${qs}`} className="font-bold text-pink-600">ログイン</Link></>
        )}
      </p>
      {mode === "login" && (
        <p className="rounded-lg bg-zinc-50 p-3 text-xs text-zinc-500">
          デモ: fan@example.com（ファン） / hana@example.com（クリエイター）、パスワードは password
        </p>
      )}
    </form>
  );
}
