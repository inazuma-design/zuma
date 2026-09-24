"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSession, destroySession, getCurrentUser, requireUser } from "./auth";
import { getDb } from "./db";
import { CATEGORIES, THEMES } from "./format";
import { hashPassword, verifyPassword } from "./password";
import {
  POINT_RULES,
  accessLevel,
  awardPoints,
  canView,
  getClubById,
  getClubByOwner,
  getEvent,
  getMembership,
  getPlan,
  getPost,
  getProduct,
  getTalkRoom,
  isEntered,
} from "./queries";

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
  // Free trial applies only to a user's first membership in this club.
  const trial = !existing && plan.trial_days > 0;
  db.transaction(() => {
    let membershipId: number;
    if (existing) {
      // Plan change or re-join: switch plan, restart the billing period and charge now.
      db.prepare(
        `UPDATE memberships SET plan_id = ?, status = 'active', canceled_at = NULL, is_trial = 0,
           started_at = CASE WHEN status = 'active' THEN started_at ELSE datetime('now') END,
           current_period_end = datetime('now', '+1 month')
         WHERE id = ?`,
      ).run(plan.id, existing.id);
      membershipId = existing.id;
    } else {
      membershipId = Number(
        db
          .prepare(
            `INSERT INTO memberships (user_id, club_id, plan_id, is_trial, current_period_end)
             VALUES (?, ?, ?, ?, datetime('now', ?))`,
          )
          .run(user.id, club.id, plan.id, trial ? 1 : 0, trial ? `+${plan.trial_days} days` : "+1 month")
          .lastInsertRowid,
      );
    }
    if (!trial) {
      db.prepare("INSERT INTO payments (membership_id, club_id, amount) VALUES (?, ?, ?)").run(
        membershipId,
        club.id,
        plan.price,
      );
      awardPoints(user.id, club.id, Math.floor(plan.price / 100), "月額会費のお支払い");
    }
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
  if (removed.changes === 0) {
    db.prepare("INSERT INTO likes (post_id, user_id) VALUES (?, ?)").run(post.id, user.id);
    // Only the first like on a post earns points, so toggling can't be farmed.
    const earned = db
      .prepare("SELECT 1 FROM points WHERE user_id = ? AND club_id = ? AND reason = ?")
      .get(user.id, club.id, `いいね #${post.id}`);
    if (!earned) awardPoints(user.id, club.id, POINT_RULES.like, `いいね #${post.id}`);
  }
  revalidatePath(`/c/${club.slug}/posts/${post.id}`);
}

export async function addComment(form: FormData) {
  const { user, post, club } = await requireViewablePost(Number(form.get("postId")));
  const body = str(form, "body");
  if (!body) return;
  getDb()
    .prepare("INSERT INTO comments (post_id, user_id, body) VALUES (?, ?, ?)")
    .run(post.id, user.id, body.slice(0, 1000));
  awardPoints(user.id, club.id, POINT_RULES.comment, "コメント");
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
  const trialDays = Number(form.get("trialDays")) || 0;
  if (!Number.isInteger(trialDays) || trialDays < 0 || trialDays > 31) {
    return { error: "無料体験期間は0〜31日で入力してください" };
  }
  getDb()
    .prepare("INSERT INTO plans (club_id, name, price, description, trial_days) VALUES (?, ?, ?, ?, ?)")
    .run(club.id, name, price, str(form, "description"), trialDays);
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
  const videoUrl = str(form, "videoUrl");
  if (!title || !body) return { error: "タイトルと本文を入力してください" };
  if (videoUrl && !/^https:\/\//.test(videoUrl)) return { error: "動画URLは https:// から始まるURLを入力してください" };

  const db = getDb();
  const postId = Number(form.get("postId")) || 0;
  if (postId) {
    db.prepare(
      "UPDATE posts SET title = ?, body = ?, min_price = ?, video_url = ? WHERE id = ? AND club_id = ?",
    ).run(title, body, minPrice, videoUrl, postId, club.id);
  } else {
    db.prepare("INSERT INTO posts (club_id, title, body, min_price, video_url) VALUES (?, ?, ?, ?, ?)").run(
      club.id,
      title,
      body,
      minPrice,
      videoUrl,
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

// ---- talk rooms -------------------------------------------------------------

export async function sendTalkMessage(form: FormData) {
  const room = getTalkRoom(Number(form.get("roomId")));
  if (!room) throw new Error("トークルームが見つかりません");
  const club = getClubById(room.club_id)!;
  const user = await requireUser(`/c/${club.slug}/talk/${room.id}`);
  if (!canView(room, accessLevel(user.id, club))) throw new Error("このトークルームに参加する権限がありません");
  const body = str(form, "body").slice(0, 1000);
  if (!body) return;
  getDb().prepare("INSERT INTO talk_messages (room_id, user_id, body) VALUES (?, ?, ?)").run(room.id, user.id, body);
  if (club.owner_id !== user.id) awardPoints(user.id, club.id, POINT_RULES.talk, "トーク投稿");
  revalidatePath(`/c/${club.slug}/talk/${room.id}`);
}

export async function saveTalkRoom(_: FormState, form: FormData): Promise<FormState> {
  const { club } = await requireOwnClub();
  const name = str(form, "name");
  if (!name) return { error: "ルーム名を入力してください" };
  getDb()
    .prepare("INSERT INTO talk_rooms (club_id, name, description, min_price) VALUES (?, ?, ?, ?)")
    .run(club.id, name, str(form, "description"), Math.max(0, Number(form.get("minPrice")) || 0));
  revalidatePath("/dashboard/talk");
  return { ok: "トークルームを作成しました" };
}

export async function deleteTalkRoom(form: FormData) {
  const { club } = await requireOwnClub();
  getDb().prepare("DELETE FROM talk_rooms WHERE id = ? AND club_id = ?").run(Number(form.get("roomId")), club.id);
  revalidatePath("/dashboard/talk");
}

export async function deleteTalkMessage(form: FormData) {
  const { club } = await requireOwnClub();
  getDb()
    .prepare(
      "DELETE FROM talk_messages WHERE id = ? AND room_id IN (SELECT id FROM talk_rooms WHERE club_id = ?)",
    )
    .run(Number(form.get("messageId")), club.id);
  revalidatePath(`/c/${club.slug}/talk/${Number(form.get("roomId"))}`);
}

// ---- events -----------------------------------------------------------------

export async function toggleEventEntry(form: FormData) {
  const event = getEvent(Number(form.get("eventId")));
  if (!event) throw new Error("イベントが見つかりません");
  const club = getClubById(event.club_id)!;
  const path = `/c/${club.slug}/events/${event.id}`;
  const user = await requireUser(path);
  if (!canView(event, accessLevel(user.id, club))) throw new Error("このイベントに参加する権限がありません");

  const db = getDb();
  if (isEntered(event.id, user.id)) {
    db.prepare("DELETE FROM event_entries WHERE event_id = ? AND user_id = ?").run(event.id, user.id);
  } else {
    db.transaction(() => {
      const count = (
        db.prepare("SELECT COUNT(*) AS n FROM event_entries WHERE event_id = ?").get(event.id) as { n: number }
      ).n;
      if (event.capacity > 0 && count >= event.capacity) throw new Error("定員に達しています");
      db.prepare("INSERT INTO event_entries (event_id, user_id) VALUES (?, ?)").run(event.id, user.id);
      const reason = `イベント参加 #${event.id}`;
      if (!db.prepare("SELECT 1 FROM points WHERE user_id = ? AND reason = ?").get(user.id, reason)) {
        awardPoints(user.id, club.id, POINT_RULES.event, reason);
      }
    })();
  }
  revalidatePath(path);
}

export async function saveEvent(_: FormState, form: FormData): Promise<FormState> {
  const { club } = await requireOwnClub();
  const title = str(form, "title");
  const startsLocal = str(form, "startsAt"); // "YYYY-MM-DDTHH:mm" in JST
  const kind = str(form, "kind") === "online" ? "online" : "offline";
  if (!title) return { error: "イベント名を入力してください" };
  const starts = new Date(`${startsLocal}:00+09:00`);
  if (!startsLocal || Number.isNaN(starts.getTime())) return { error: "開催日時を入力してください" };
  const streamUrl = str(form, "streamUrl");
  if (streamUrl && !/^https:\/\//.test(streamUrl)) return { error: "配信URLは https:// から始まるURLを入力してください" };
  const capacity = Math.max(0, Math.floor(Number(form.get("capacity")) || 0));
  const startsAt = starts.toISOString().slice(0, 19).replace("T", " ");
  const values = [
    title,
    str(form, "description"),
    startsAt,
    kind,
    str(form, "location"),
    streamUrl,
    capacity,
    Math.max(0, Number(form.get("minPrice")) || 0),
  ];
  const db = getDb();
  const eventId = Number(form.get("eventId")) || 0;
  if (eventId) {
    db.prepare(
      `UPDATE events SET title = ?, description = ?, starts_at = ?, kind = ?, location = ?, stream_url = ?,
         capacity = ?, min_price = ? WHERE id = ? AND club_id = ?`,
    ).run(...values, eventId, club.id);
  } else {
    db.prepare(
      `INSERT INTO events (title, description, starts_at, kind, location, stream_url, capacity, min_price, club_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(...values, club.id);
  }
  revalidatePath(`/c/${club.slug}/events`);
  redirect("/dashboard/events");
}

export async function deleteEvent(form: FormData) {
  const { club } = await requireOwnClub();
  getDb().prepare("DELETE FROM events WHERE id = ? AND club_id = ?").run(Number(form.get("eventId")), club.id);
  revalidatePath("/dashboard/events");
}

// ---- shop -------------------------------------------------------------------

export async function purchaseProduct(_: FormState, form: FormData): Promise<FormState> {
  const product = getProduct(Number(form.get("productId")));
  if (!product || !product.is_active) return { error: "この商品は現在購入できません" };
  const club = getClubById(product.club_id)!;
  const user = await requireUser(`/c/${club.slug}/shop/${product.id}`);
  if (!canView(product, accessLevel(user.id, club))) return { error: "この商品は会員限定です" };
  const quantity = Math.floor(Number(form.get("quantity")) || 0);
  if (quantity < 1 || quantity > 10) return { error: "数量は1〜10で指定してください" };
  const address = str(form, "address");
  if (!address) return { error: "お届け先を入力してください" };

  const db = getDb();
  try {
    db.transaction(() => {
      if (product.stock !== null) {
        const left = db
          .prepare("UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?")
          .run(quantity, product.id, quantity);
        if (left.changes === 0) throw new Error("在庫が不足しています");
      }
      const amount = product.price * quantity;
      db.prepare(
        "INSERT INTO orders (product_id, club_id, user_id, quantity, amount, shipping_address) VALUES (?, ?, ?, ?, ?, ?)",
      ).run(product.id, club.id, user.id, quantity, amount, address);
      awardPoints(user.id, club.id, Math.floor(amount / 100), "ショップでのお買い物");
    })();
  } catch (e) {
    return { error: e instanceof Error ? e.message : "購入に失敗しました" };
  }
  revalidatePath(`/c/${club.slug}/shop`);
  redirect(`/c/${club.slug}/shop/${product.id}?purchased=1`);
}

export async function saveProduct(_: FormState, form: FormData): Promise<FormState> {
  const { club } = await requireOwnClub();
  const name = str(form, "name");
  const price = Number(form.get("price"));
  const stockRaw = str(form, "stock");
  if (!name) return { error: "商品名を入力してください" };
  if (!Number.isInteger(price) || price < 100 || price > 1000000) return { error: "価格は100円以上の整数で入力してください" };
  const stock = stockRaw === "" ? null : Math.max(0, Math.floor(Number(stockRaw)));
  getDb()
    .prepare("INSERT INTO products (club_id, name, description, price, stock, min_price) VALUES (?, ?, ?, ?, ?, ?)")
    .run(club.id, name, str(form, "description"), price, stock, Math.max(0, Number(form.get("minPrice")) || 0));
  revalidatePath("/dashboard/shop");
  return { ok: "商品を追加しました" };
}

export async function toggleProduct(form: FormData) {
  const { club } = await requireOwnClub();
  getDb()
    .prepare("UPDATE products SET is_active = 1 - is_active WHERE id = ? AND club_id = ?")
    .run(Number(form.get("productId")), club.id);
  revalidatePath("/dashboard/shop");
}

export async function markOrderShipped(form: FormData) {
  const { club } = await requireOwnClub();
  getDb()
    .prepare("UPDATE orders SET status = 'shipped' WHERE id = ? AND club_id = ?")
    .run(Number(form.get("orderId")), club.id);
  revalidatePath("/dashboard/shop");
}
