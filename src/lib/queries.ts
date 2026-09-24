import "server-only";
import { getDb } from "./db";
import { parseDbDate } from "./format";
import type { Club, Comment, Membership, Plan, Post } from "./types";

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

export function canView(post: Post, level: number): boolean {
  return post.min_price === 0 || level >= post.min_price;
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
      `SELECT m.plan_id, u.name AS user_name, u.email, p.name AS plan_name, p.price AS plan_price,
        m.status, m.started_at, m.current_period_end
       FROM memberships m JOIN users u ON u.id = m.user_id JOIN plans p ON p.id = m.plan_id
       WHERE m.club_id = ? ORDER BY m.started_at DESC`,
    )
    .all(clubId) as Member[];
  const active = members.filter((m) => isMembershipValid(m));
  const mrr = members.filter((m) => m.status === "active").reduce((s, m) => s + m.plan_price, 0);
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
  const postCount = (db.prepare("SELECT COUNT(*) AS n FROM posts WHERE club_id = ?").get(clubId) as { n: number }).n;
  return { members, activeCount: active.length, mrr, revenueThisMonth, revenueTotal, postCount };
}

/**
 * Mock billing: charge every active membership whose period has ended and roll it forward a month;
 * canceled memberships past their period end simply lapse. Swap for payment-provider webhooks in production.
 */
export function processRenewals() {
  const db = getDb();
  const findDue = db
    .prepare(
      `SELECT m.id, m.club_id, p.price FROM memberships m JOIN plans p ON p.id = m.plan_id
       WHERE m.status = 'active' AND m.current_period_end <= datetime('now')`,
    );
  const pay = db.prepare("INSERT INTO payments (membership_id, club_id, amount) VALUES (?, ?, ?)");
  const extend = db.prepare(
    "UPDATE memberships SET current_period_end = datetime(current_period_end, '+1 month') WHERE id = ?",
  );
  db.transaction(() => {
    // Loop so memberships that are several periods behind catch up fully.
    for (;;) {
      const due = findDue.all() as { id: number; club_id: number; price: number }[];
      if (due.length === 0) break;
      for (const m of due) {
        pay.run(m.id, m.club_id, m.price);
        extend.run(m.id);
      }
    }
  })();
}
