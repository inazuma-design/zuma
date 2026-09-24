import "server-only";
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { hashPassword } from "./password";

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "zuma.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS clubs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'その他',
  theme TEXT NOT NULL DEFAULT 'pink',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS memberships (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  plan_id INTEGER NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'active',
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  current_period_end TEXT NOT NULL,
  canceled_at TEXT,
  UNIQUE (user_id, club_id)
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  membership_id INTEGER NOT NULL REFERENCES memberships(id) ON DELETE CASCADE,
  club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  paid_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  club_id INTEGER NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  min_price INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS likes (
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_posts_club ON posts(club_id, created_at);
CREATE INDEX IF NOT EXISTS idx_memberships_club ON memberships(club_id);
`;

function seed(db: Database.Database) {
  const count = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
  if (count.n > 0) return;

  const pw = hashPassword("password");
  const insertUser = db.prepare("INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)");
  const insertClub = db.prepare(
    "INSERT INTO clubs (owner_id, slug, name, tagline, description, category, theme) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );
  const insertPlan = db.prepare("INSERT INTO plans (club_id, name, price, description) VALUES (?, ?, ?, ?)");
  const insertPost = db.prepare(
    "INSERT INTO posts (club_id, title, body, min_price, created_at) VALUES (?, ?, ?, ?, datetime('now', ?))",
  );

  const clubs = [
    {
      email: "hana@example.com",
      name: "花咲ミク",
      slug: "hanasaki",
      club: "花咲ミク オフィシャルファンクラブ",
      tagline: "歌とお散歩が好きなシンガーソングライター",
      description:
        "いつも応援ありがとうございます！\nここでは日々のオフショット、制作の裏側、会員限定の生配信などをお届けします。",
      category: "音楽",
      theme: "pink",
      plans: [
        ["ライトプラン", 500, "限定ブログ・オフショット写真が見放題"],
        ["スタンダードプラン", 1500, "ライトの特典 + 月1回の限定生配信アーカイブ"],
        ["プレミアムプラン", 5000, "全特典 + 新曲デモ音源の先行公開・お名前クレジット"],
      ],
    },
    {
      email: "ken@example.com",
      name: "けんじ飯",
      slug: "kenjimeshi",
      club: "けんじ飯の台所サロン",
      tagline: "ずぼらでも美味しい、毎日のごはん研究所",
      description: "YouTubeでは出していないレシピの詳細や、アレンジ、質問コーナーをやっています。",
      category: "料理",
      theme: "orange",
      plans: [
        ["見習いコック", 300, "限定レシピ記事が読める"],
        ["料理長", 1000, "全レシピ + 月1回の質問回答"],
      ],
    },
    {
      email: "sora@example.com",
      name: "SORA",
      slug: "sora-illust",
      club: "SORA イラストアトリエ",
      tagline: "空と少女を描くイラストレーター",
      description: "メイキング動画、高解像度イラスト、ラフ画を毎週更新しています。",
      category: "イラスト",
      theme: "sky",
      plans: [
        ["ラフ画プラン", 500, "毎週のラフ画公開"],
        ["メイキングプラン", 2000, "ラフ画 + メイキング解説 + 高解像度データ"],
      ],
    },
  ] as const;

  const tx = db.transaction(() => {
    for (const c of clubs) {
      const userId = insertUser.run(c.email, c.name, pw).lastInsertRowid;
      const clubId = insertClub.run(userId, c.slug, c.club, c.tagline, c.description, c.category, c.theme)
        .lastInsertRowid;
      for (const [name, price, desc] of c.plans) insertPlan.run(clubId, name, price, desc);

      const cheapest = c.plans[0][1];
      const top = c.plans[c.plans.length - 1][1];
      insertPost.run(clubId, "ファンクラブを開設しました！", "はじめまして！これからよろしくお願いします。この投稿はどなたでも読めます。", 0, "-10 days");
      insertPost.run(clubId, "今週のオフショット", "会員の皆さんだけに、今週の裏側をお届けします。いつもありがとう！", cheapest, "-5 days");
      insertPost.run(clubId, "特別コンテンツ", "上位プランの方限定の特別コンテンツです。いつも本当にありがとうございます。", top, "-1 days");
    }
    insertUser.run("fan@example.com", "ファン太郎", pw);
  });
  tx();
}

type GlobalWithDb = typeof globalThis & { __zumaDb?: Database.Database };

function open(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  seed(db);
  return db;
}

export function getDb(): Database.Database {
  const g = globalThis as GlobalWithDb;
  if (!g.__zumaDb) g.__zumaDb = open();
  return g.__zumaDb;
}
