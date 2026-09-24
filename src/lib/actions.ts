"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSession, destroySession, getCurrentUser, requireUser } from "./auth";
import { getDb } from "./db";
import { CATEGORIES, THEMES } from "./format";
import { hashPassword, verifyPassword } from "./password";
import { getClubById, getClubByOwner, getMembership, getPlan, getPost, accessLevel, canView } from "./queries";

export type FormState = { error?: string; ok?: string } | undefined;

function str(form: FormData, key: string): string {
  return String(form.get(key) ?? "").trim();
}

/** Only allow same-site relative redirects. */
function safeNext(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/mypage";
}

// ---- auth -------------------------------------------------------------------

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const name = str(form, "name");
  const email = str(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  if (!name || !email || !password) return { error: "すべての項目を入力してください" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "メールアドレスの形式が正しくありません" };
  if (password.length < 8) return { error: "パスワードは8文字以上にしてください" };

  const db = getDb();
  if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(email)) {
    return { error: "このメールアドレスは既に登録されています" };
  }
  const id = db
    .prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)")
    .run(email, name, hashPassword(password)).lastInsertRowid;
  await createSession(Number(id));
  redirect(safeNext(str(form, "next")));
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const email = str(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = getDb().prepare("SELECT id, password_hash FROM users WHERE email = ?").get(email) as
    | { id: number; password_hash: string }
    | undefined;
  if (!user || !verifyPassword(password, user.password_hash)) {
    return { error: "メールアドレスまたはパスワードが違います" };
  }
  await createSession(user.id);
  redirect(safeNext(str(form, "next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}

// ---- membership -------------------------------------------------------------

export async function joinPlan(form: FormData) {
  const plan = getPlan(Number(form.get("planId")));
  if (!plan || !plan.is_active) redirect("/explore");
  const club = getClubById(plan.club_id)!;
  const user = await requireUser(`/c/${club.slug}/join/${plan.id}`);
  if (club.owner_id === user.id) redirect(`/c/${club.slug}`);

  const db = getDb();
  const existing = getMembership(user.id, club.id);
  if (existing?.status === "active" && existing.plan_id === plan.id) redirect(`/c/${club.slug}`);
  db.transaction(() => {
    let membershipId: number;
    if (existing) {
      // Plan change or re-join: switch plan, restart the billing period and charge now.
      db.prepare(
        `UPDATE memberships SET plan_id = ?, status = 'active', canceled_at = NULL,
           started_at = CASE WHEN status = 'active' THEN started_at ELSE datetime('now') END,
           current_period_end = datetime('now', '+1 month')
         WHERE id = ?`,
      ).run(plan.id, existing.id);
      membershipId = existing.id;
    } else {
      membershipId = Number(
        db
          .prepare(
            `INSERT INTO memberships (user_id, club_id, plan_id, current_period_end)
             VALUES (?, ?, ?, datetime('now', '+1 month'))`,
          )
          .run(user.id, club.id, plan.id).lastInsertRowid,
      );
    }
    db.prepare("INSERT INTO payments (membership_id, club_id, amount) VALUES (?, ?, ?)").run(
      membershipId,
      club.id,
      plan.price,
    );
  })();

  revalidatePath(`/c/${club.slug}`);
  redirect(`/c/${club.slug}?joined=1`);
}

export async function cancelMembership(form: FormData) {
  const user = await requireUser();
  const clubId = Number(form.get("clubId"));
  getDb()
    .prepare(
      "UPDATE memberships SET status = 'canceled', canceled_at = datetime('now') WHERE user_id = ? AND club_id = ? AND status = 'active'",
    )
    .run(user.id, clubId);
  revalidatePath("/mypage");
}

// ---- engagement -------------------------------------------------------------

async function requireViewablePost(postId: number) {
  const user = await requireUser();
  const post = getPost(postId);
  if (!post) throw new Error("投稿が見つかりません");
  const club = getClubById(post.club_id)!;
  if (!canView(post, accessLevel(user.id, club))) throw new Error("この投稿を閲覧する権限がありません");
  return { user, post, club };
}

export async function toggleLike(form: FormData) {
  const { user, post, club } = await requireViewablePost(Number(form.get("postId")));
  const db = getDb();
  const removed = db.prepare("DELETE FROM likes WHERE post_id = ? AND user_id = ?").run(post.id, user.id);
  if (removed.changes === 0) db.prepare("INSERT INTO likes (post_id, user_id) VALUES (?, ?)").run(post.id, user.id);
  revalidatePath(`/c/${club.slug}/posts/${post.id}`);
}

export async function addComment(form: FormData) {
  const { user, post, club } = await requireViewablePost(Number(form.get("postId")));
  const body = str(form, "body");
  if (!body) return;
  getDb()
    .prepare("INSERT INTO comments (post_id, user_id, body) VALUES (?, ?, ?)")
    .run(post.id, user.id, body.slice(0, 1000));
  revalidatePath(`/c/${club.slug}/posts/${post.id}`);
}

// ---- creator ----------------------------------------------------------------

async function requireOwnClub() {
  const user = await requireUser("/dashboard");
  const club = getClubByOwner(user.id);
  if (!club) redirect("/dashboard");
  return { user, club };
}

function readClubFields(form: FormData) {
  const name = str(form, "name");
  const tagline = str(form, "tagline");
  const description = str(form, "description");
  const category = CATEGORIES.includes(str(form, "category")) ? str(form, "category") : "その他";
  const themeKey = str(form, "theme") in THEMES ? str(form, "theme") : "pink";
  return { name, tagline, description, category, themeKey };
}

export async function createClub(_: FormState, form: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard");
  if (getClubByOwner(user.id)) redirect("/dashboard");

  const slug = str(form, "slug").toLowerCase();
  const f = readClubFields(form);
  if (!f.name) return { error: "ファンクラブ名を入力してください" };
  if (!/^[a-z0-9][a-z0-9-]{2,30}$/.test(slug)) {
    return { error: "URLは半角英小文字・数字・ハイフンで3〜31文字にしてください" };
  }
  const db = getDb();
  if (db.prepare("SELECT 1 FROM clubs WHERE slug = ?").get(slug)) return { error: "このURLは既に使われています" };

  db.transaction(() => {
    const clubId = db
      .prepare(
        "INSERT INTO clubs (owner_id, slug, name, tagline, description, category, theme) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(user.id, slug, f.name, f.tagline, f.description, f.category, f.themeKey).lastInsertRowid;
    db.prepare("INSERT INTO plans (club_id, name, price, description) VALUES (?, ?, ?, ?)").run(
      clubId,
      "スタンダードプラン",
      500,
      "会員限定の投稿が読めます",
    );
  })();
  redirect("/dashboard");
}

export async function updateClub(_: FormState, form: FormData): Promise<FormState> {
  const { club } = await requireOwnClub();
  const f = readClubFields(form);
  if (!f.name) return { error: "ファンクラブ名を入力してください" };
  getDb()
    .prepare("UPDATE clubs SET name = ?, tagline = ?, description = ?, category = ?, theme = ? WHERE id = ?")
    .run(f.name, f.tagline, f.description, f.category, f.themeKey, club.id);
  revalidatePath("/", "layout");
  return { ok: "保存しました" };
}

function readPrice(form: FormData): number | null {
  const price = Number(form.get("price"));
  return Number.isInteger(price) && price >= 100 && price <= 100000 ? price : null;
}

export async function createPlan(_: FormState, form: FormData): Promise<FormState> {
  const { club } = await requireOwnClub();
  const name = str(form, "name");
  const price = readPrice(form);
  if (!name) return { error: "プラン名を入力してください" };
  if (price === null) return { error: "月額は100〜100,000円の整数で入力してください" };
  getDb()
    .prepare("INSERT INTO plans (club_id, name, price, description) VALUES (?, ?, ?, ?)")
    .run(club.id, name, price, str(form, "description"));
  revalidatePath("/dashboard/plans");
  return { ok: "プランを追加しました" };
}

export async function togglePlan(form: FormData) {
  const { club } = await requireOwnClub();
  getDb()
    .prepare("UPDATE plans SET is_active = 1 - is_active WHERE id = ? AND club_id = ?")
    .run(Number(form.get("planId")), club.id);
  revalidatePath("/dashboard/plans");
}

export async function savePost(_: FormState, form: FormData): Promise<FormState> {
  const { club } = await requireOwnClub();
  const title = str(form, "title");
  const body = str(form, "body");
  const minPrice = Math.max(0, Number(form.get("minPrice")) || 0);
  if (!title || !body) return { error: "タイトルと本文を入力してください" };

  const db = getDb();
  const postId = Number(form.get("postId")) || 0;
  if (postId) {
    db.prepare("UPDATE posts SET title = ?, body = ?, min_price = ? WHERE id = ? AND club_id = ?").run(
      title,
      body,
      minPrice,
      postId,
      club.id,
    );
  } else {
    db.prepare("INSERT INTO posts (club_id, title, body, min_price) VALUES (?, ?, ?, ?)").run(
      club.id,
      title,
      body,
      minPrice,
    );
  }
  revalidatePath(`/c/${club.slug}`);
  redirect("/dashboard/posts");
}

export async function deletePost(form: FormData) {
  const { club } = await requireOwnClub();
  getDb().prepare("DELETE FROM posts WHERE id = ? AND club_id = ?").run(Number(form.get("postId")), club.id);
  revalidatePath("/dashboard/posts");
  revalidatePath(`/c/${club.slug}`);
}
