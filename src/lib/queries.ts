import "server-only";
import { getDb } from "./db";
import { parseDbDate } from "./format";
import type { Club, ClubEvent, Comment, Membership, Plan, Post, Product, TalkMessage, TalkRoom } from "./types";

export type ClubSummary = Club & { owner_name: string; member_count: number; min_price: number | null };

const CLUB_SUMMARY_SQL = `
  SELECT c.*, u.name AS owner_name,
    (SELECT COUNT(*) FROM memberships m WHERE m.club_id = c.id
       AND (m.status = 'active' OR m.current_period_end > datetime('now'))) AS member_count,
    (SELECT MIN(price) FROM plans p WHERE p.club_id = c.id AND p.is_active = 1) AS min_price
  FROM clubs c JOIN users u ON u.id = c.owner_id
`;

export function listClubs(q?: string, category?: string): ClubSummary[] {
  const where: string[] = [];
  const args: string[] = [];
  if (q) {
    where.push("(c.name LIKE ? OR c.tagline LIKE ? OR u.name LIKE ?)");
    args.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (category) {
    where.push("c.category = ?");
    args.push(category);
  }
  const sql = `${CLUB_SUMMARY_SQL} ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY member_count DESC, c.id DESC`;
  return getDb().prepare(sql).all(...args) as ClubSummary[];
}

export function getClubBySlug(slug: string): ClubSummary | undefined {
  return getDb().prepare(`${CLUB_SUMMARY_SQL} WHERE c.slug = ?`).get(slug) as ClubSummary | undefined;
}

export function getClubById(id: number): Club | undefined {
  return getDb().prepare("SELECT * FROM clubs WHERE id = ?").get(id) as Club | undefined;
}

export function getClubByOwner(ownerId: number): Club | undefined {
  return getDb().prepare("SELECT * FROM clubs WHERE owner_id = ?").get(ownerId) as Club | undefined;
}

export function listPlans(clubId: number, includeInactive = false): Plan[] {
  return getDb()
    .prepare(`SELECT * FROM plans WHERE club_id = ? ${includeInactive ? "" : "AND is_active = 1"} ORDER BY price`)
    .all(clubId) as Plan[];
}

export function getPlan(id: number): Plan | undefined {
  return getDb().prepare("SELECT * FROM plans WHERE id = ?").get(id) as Plan | undefined;
}

export type PostWithStats = Post & { like_count: number; comment_count: number };

const POST_SQL = `
  SELECT p.*,
    (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
    (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) AS comment_count
  FROM posts p
`;

export function listPosts(clubId: number): PostWithStats[] {
  return getDb()
    .prepare(`${POST_SQL} WHERE p.club_id = ? ORDER BY p.created_at DESC, p.id DESC`)
    .all(clubId) as PostWithStats[];
}

export function getPost(id: number): PostWithStats | undefined {
  return getDb().prepare(`${POST_SQL} WHERE p.id = ?`).get(id) as PostWithStats | undefined;
}

export type FeedPost = PostWithStats & { club_slug: string; club_name: string; club_theme: string };

export function listRecentPublicPosts(limit = 6): FeedPost[] {
  return getDb()
    .prepare(
      `SELECT p.*, c.slug AS club_slug, c.name AS club_name, c.theme AS club_theme,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) AS comment_count
       FROM posts p JOIN clubs c ON c.id = p.club_id
       ORDER BY p.created_at DESC, p.id DESC LIMIT ?`,
    )
    .all(limit) as FeedPost[];
}

/** Posts from every club the user currently has access to, newest first. */
export function listFeedForUser(userId: number, limit = 30): FeedPost[] {
  return getDb()
    .prepare(
      `SELECT p.*, c.slug AS club_slug, c.name AS club_name, c.theme AS club_theme,
        (SELECT COUNT(*) FROM likes l WHERE l.post_id = p.id) AS like_count,
        (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) AS comment_count
       FROM posts p JOIN clubs c ON c.id = p.club_id
       JOIN memberships m ON m.club_id = c.id AND m.user_id = ?
       WHERE m.status = 'active' OR m.current_period_end > datetime('now')
       ORDER BY p.created_at DESC, p.id DESC LIMIT ?`,
    )
    .all(userId, limit) as FeedPost[];
}

export type MembershipWithPlan = Membership & { plan_name: string; plan_price: number };

export function getMembership(userId: number, clubId: number): MembershipWithPlan | undefined {
  return getDb()
    .prepare(
      `SELECT m.*, p.name AS plan_name, p.price AS plan_price
       FROM memberships m JOIN plans p ON p.id = m.plan_id
       WHERE m.user_id = ? AND m.club_id = ?`,
    )
    .get(userId, clubId) as MembershipWithPlan | undefined;
}

export type MyMembership = MembershipWithPlan & { club_slug: string; club_name: string; club_theme: string };

export function listMyMemberships(userId: number): MyMembership[] {
  return getDb()
    .prepare(
      `SELECT m.*, p.name AS plan_name, p.price AS plan_price,
        c.slug AS club_slug, c.name AS club_name, c.theme AS club_theme
       FROM memberships m JOIN plans p ON p.id = m.plan_id JOIN clubs c ON c.id = m.club_id
       WHERE m.user_id = ? ORDER BY m.started_at DESC`,
    )
    .all(userId) as MyMembership[];
}

export function isMembershipValid(m: { status: string; current_period_end: string } | undefined): boolean {
  if (!m) return false;
  if (m.status === "active") return true;
  return parseDbDate(m.current_period_end) > new Date();
}

/** Price level the viewer has unlocked in a club (-1 = none). Owners unlock everything. */
export function accessLevel(userId: number | undefined, club: Club): number {
  if (!userId) return -1;
  if (club.owner_id === userId) return Number.MAX_SAFE_INTEGER;
  const m = getMembership(userId, club.id);
  return isMembershipValid(m) ? m!.plan_price : -1;
}

/** Anything gated by a price threshold (posts, talk rooms, events, products). */
export function canView(item: { min_price: number }, level: number): boolean {
  return item.min_price === 0 || level >= item.min_price;
}

export function hasLiked(userId: number, postId: number): boolean {
  return !!getDb().prepare("SELECT 1 FROM likes WHERE user_id = ? AND post_id = ?").get(userId, postId);
}

export function listComments(postId: number): Comment[] {
  return getDb()
    .prepare(
      `SELECT cm.*, u.name AS user_name FROM comments cm JOIN users u ON u.id = cm.user_id
       WHERE cm.post_id = ? ORDER BY cm.created_at, cm.id`,
    )
    .all(postId) as Comment[];
}

export type Member = {
  plan_id: number;
  is_trial: number;
  user_name: string;
  email: string;
  plan_name: string;
  plan_price: number;
  status: string;
  started_at: string;
  current_period_end: string;
};

export function getDashboardStats(clubId: number) {
  const db = getDb();
  const members = db
    .prepare(
      `SELECT m.plan_id, m.is_trial, u.name AS user_name, u.email, p.name AS plan_name, p.price AS plan_price,
        m.status, m.started_at, m.current_period_end
       FROM memberships m JOIN users u ON u.id = m.user_id JOIN plans p ON p.id = m.plan_id
       WHERE m.club_id = ? ORDER BY m.started_at DESC`,
    )
    .all(clubId) as Member[];
  const active = members.filter((m) => isMembershipValid(m));
  const mrr = members.filter((m) => m.status === "active" && !m.is_trial).reduce((s, m) => s + m.plan_price, 0);
  const revenueThisMonth = (
    db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM payments
         WHERE club_id = ? AND paid_at >= datetime('now', 'start of month')`,
      )
      .get(clubId) as { total: number }
  ).total;
  const revenueTotal = (
    db.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE club_id = ?").get(clubId) as {
      total: number;
    }
  ).total;
  const shopTotal = (
    db.prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM orders WHERE club_id = ?").get(clubId) as {
      total: number;
    }
  ).total;
  const shopThisMonth = (
    db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) AS total FROM orders
         WHERE club_id = ? AND created_at >= datetime('now', 'start of month')`,
      )
      .get(clubId) as { total: number }
  ).total;
  const trialCount = members.filter((m) => m.is_trial && m.status === "active").length;
  return {
    members,
    activeCount: active.length,
    trialCount,
    mrr,
    revenueThisMonth: revenueThisMonth + shopThisMonth,
    revenueTotal: revenueTotal + shopTotal,
    shopTotal,
  };
}

/**
 * Mock billing: charge every active membership whose period has ended and roll it forward a month;
 * canceled memberships past their period end simply lapse. Swap for payment-provider webhooks in production.
 */
export function processRenewals() {
  const db = getDb();
  const findDue = db
    .prepare(
      `SELECT m.id, m.user_id, m.club_id, p.price FROM memberships m JOIN plans p ON p.id = m.plan_id
       WHERE m.status = 'active' AND m.current_period_end <= datetime('now')`,
    );
  const pay = db.prepare("INSERT INTO payments (membership_id, club_id, amount) VALUES (?, ?, ?)");
  const extend = db.prepare(
    "UPDATE memberships SET current_period_end = datetime(current_period_end, '+1 month'), is_trial = 0 WHERE id = ?",
  );
  db.transaction(() => {
    // Loop so memberships that are several periods behind catch up fully.
    for (;;) {
      const due = findDue.all() as { id: number; user_id: number; club_id: number; price: number }[];
      if (due.length === 0) break;
      for (const m of due) {
        pay.run(m.id, m.club_id, m.price);
        extend.run(m.id);
        awardPoints(m.user_id, m.club_id, Math.floor(m.price / 100), "月額会費のお支払い");
      }
    }
  })();
}

// ---- points -----------------------------------------------------------------

export const POINT_RULES = {
  like: 1,
  comment: 5,
  talk: 2,
  event: 10,
} as const;

export function awardPoints(userId: number, clubId: number, amount: number, reason: string) {
  if (amount <= 0) return;
  getDb()
    .prepare("INSERT INTO points (user_id, club_id, amount, reason) VALUES (?, ?, ?, ?)")
    .run(userId, clubId, amount, reason);
}

export function getPoints(userId: number, clubId: number): number {
  return (
    getDb()
      .prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM points WHERE user_id = ? AND club_id = ?")
      .get(userId, clubId) as { total: number }
  ).total;
}

export type RankingRow = { user_id: number; user_name: string; total: number };

export function getRanking(clubId: number, limit = 20): RankingRow[] {
  return getDb()
    .prepare(
      `SELECT pt.user_id, u.name AS user_name, SUM(pt.amount) AS total
       FROM points pt JOIN users u ON u.id = pt.user_id
       WHERE pt.club_id = ? GROUP BY pt.user_id ORDER BY total DESC, MIN(pt.id) LIMIT ?`,
    )
    .all(clubId, limit) as RankingRow[];
}

export function listPointHistory(userId: number, clubId: number, limit = 20) {
  return getDb()
    .prepare(
      "SELECT amount, reason, created_at FROM points WHERE user_id = ? AND club_id = ? ORDER BY id DESC LIMIT ?",
    )
    .all(userId, clubId, limit) as { amount: number; reason: string; created_at: string }[];
}

/** Sequential member number within the club, by join order. */
export function memberNumber(membershipId: number, clubId: number): number {
  return (
    getDb()
      .prepare("SELECT COUNT(*) AS n FROM memberships WHERE club_id = ? AND id <= ?")
      .get(clubId, membershipId) as { n: number }
  ).n;
}

// ---- talk rooms -------------------------------------------------------------

export type TalkRoomSummary = TalkRoom & { message_count: number; last_at: string | null };

export function listTalkRooms(clubId: number): TalkRoomSummary[] {
  return getDb()
    .prepare(
      `SELECT r.*, COUNT(m.id) AS message_count, MAX(m.created_at) AS last_at
       FROM talk_rooms r LEFT JOIN talk_messages m ON m.room_id = r.id
       WHERE r.club_id = ? GROUP BY r.id ORDER BY r.min_price, r.id`,
    )
    .all(clubId) as TalkRoomSummary[];
}

export function getTalkRoom(id: number): TalkRoom | undefined {
  return getDb().prepare("SELECT * FROM talk_rooms WHERE id = ?").get(id) as TalkRoom | undefined;
}

export function listTalkMessages(roomId: number, limit = 200): TalkMessage[] {
  return (
    getDb()
      .prepare(
        `SELECT m.*, u.name AS user_name FROM talk_messages m JOIN users u ON u.id = m.user_id
         WHERE m.room_id = ? ORDER BY m.id DESC LIMIT ?`,
      )
      .all(roomId, limit) as TalkMessage[]
  ).reverse();
}

// ---- events -----------------------------------------------------------------

export type EventSummary = ClubEvent & { entry_count: number };

const EVENT_SQL = `SELECT e.*, (SELECT COUNT(*) FROM event_entries x WHERE x.event_id = e.id) AS entry_count FROM events e`;

export function listEvents(clubId: number): EventSummary[] {
  return getDb()
    .prepare(
      `${EVENT_SQL} WHERE e.club_id = ?
       ORDER BY e.starts_at < datetime('now'), CASE WHEN e.starts_at >= datetime('now') THEN e.starts_at END, e.starts_at DESC`,
    )
    .all(clubId) as EventSummary[];
}

export function getEvent(id: number): EventSummary | undefined {
  return getDb().prepare(`${EVENT_SQL} WHERE e.id = ?`).get(id) as EventSummary | undefined;
}

export function isEntered(eventId: number, userId: number): boolean {
  return !!getDb().prepare("SELECT 1 FROM event_entries WHERE event_id = ? AND user_id = ?").get(eventId, userId);
}

export function listEntrants(eventId: number) {
  return getDb()
    .prepare(
      `SELECT u.name AS user_name, u.email, x.created_at FROM event_entries x JOIN users u ON u.id = x.user_id
       WHERE x.event_id = ? ORDER BY x.created_at`,
    )
    .all(eventId) as { user_name: string; email: string; created_at: string }[];
}

export type MyEvent = EventSummary & { club_slug: string; club_name: string };

export function listMyEvents(userId: number): MyEvent[] {
  return getDb()
    .prepare(
      `SELECT e.*, c.slug AS club_slug, c.name AS club_name,
        (SELECT COUNT(*) FROM event_entries y WHERE y.event_id = e.id) AS entry_count
       FROM event_entries x JOIN events e ON e.id = x.event_id JOIN clubs c ON c.id = e.club_id
       WHERE x.user_id = ? AND e.starts_at >= datetime('now', '-1 day') ORDER BY e.starts_at`,
    )
    .all(userId) as MyEvent[];
}

// ---- shop -------------------------------------------------------------------

export type ProductSummary = Product & { sold: number };

const PRODUCT_SQL = `SELECT p.*, (SELECT COALESCE(SUM(o.quantity), 0) FROM orders o WHERE o.product_id = p.id) AS sold FROM products p`;

export function listProducts(clubId: number, includeInactive = false): ProductSummary[] {
  return getDb()
    .prepare(`${PRODUCT_SQL} WHERE p.club_id = ? ${includeInactive ? "" : "AND p.is_active = 1"} ORDER BY p.id DESC`)
    .all(clubId) as ProductSummary[];
}

export function getProduct(id: number): ProductSummary | undefined {
  return getDb().prepare(`${PRODUCT_SQL} WHERE p.id = ?`).get(id) as ProductSummary | undefined;
}

export type OrderRow = {
  id: number;
  product_name: string;
  user_name: string;
  email: string;
  quantity: number;
  amount: number;
  shipping_address: string;
  status: string;
  created_at: string;
};

export function listOrders(clubId: number): OrderRow[] {
  return getDb()
    .prepare(
      `SELECT o.id, p.name AS product_name, u.name AS user_name, u.email, o.quantity, o.amount,
        o.shipping_address, o.status, o.created_at
       FROM orders o JOIN products p ON p.id = o.product_id JOIN users u ON u.id = o.user_id
       WHERE o.club_id = ? ORDER BY o.id DESC`,
    )
    .all(clubId) as OrderRow[];
}

export function listMyOrders(userId: number) {
  return getDb()
    .prepare(
      `SELECT o.id, o.quantity, o.amount, o.status, o.created_at, p.name AS product_name,
        c.slug AS club_slug, c.name AS club_name
       FROM orders o JOIN products p ON p.id = o.product_id JOIN clubs c ON c.id = o.club_id
       WHERE o.user_id = ? ORDER BY o.id DESC LIMIT 20`,
    )
    .all(userId) as {
    id: number;
    quantity: number;
    amount: number;
    status: string;
    created_at: string;
    product_name: string;
    club_slug: string;
    club_name: string;
  }[];
}
