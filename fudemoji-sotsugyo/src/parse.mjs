import { createHash } from "node:crypto";

/** スプレッドシートの見出し名 → 内部キー。見出しは部分一致で探す（フォーム側の文言変更に強くする）。 */
const COLUMNS = {
  submittedAt: ["タイムスタンプ"],
  nickname: ["ニックネーム"],
  title: ["作品名"],
  comment: ["ひとこと"],
  image: ["作品画像"],
  instagram: ["Instagram", "インスタ"],
  term: ["講座・期", "講座"],
  order: ["表示順"],
  listed: ["掲載"],
  workId: ["作品ID"],
};

const LIMITS = { nickname: 50, title: 100, comment: 1000 };
const UNLISTED = new Set(["×", "x", "X", "✕", "✗", "ｘ", "Ｘ"]);

function findColumns(header) {
  const idx = {};
  for (const [key, names] of Object.entries(COLUMNS)) {
    const i = header.findIndex((h) => names.some((n) => String(h ?? "").trim().includes(n)));
    if (i >= 0) idx[key] = i;
  }
  return idx;
}

/** Google フォームの画像列は `https://drive.google.com/open?id=XXX` の形。ID だけ渡された場合もそのまま使う。 */
export function driveFileIdFrom(value) {
  const v = String(value ?? "").trim();
  if (!v) return null;
  const m = v.match(/[?&]id=([A-Za-z0-9_-]+)/) || v.match(/\/d\/([A-Za-z0-9_-]+)/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{5,}$/.test(v)) return v;
  return null;
}

/** 受け付けるのは instagram.com のユーザー名だけ。投稿・リール等の下層パスは切り捨てる。 */
export function normalizeInstagram(value) {
  let v = String(value ?? "").trim();
  if (!v) return null;
  let username = null;
  if (/^@?[A-Za-z0-9._]{1,30}$/.test(v)) {
    username = v.replace(/^@/, "");
  } else {
    if (!/^https?:\/\//i.test(v)) v = "https://" + v;
    let url;
    try {
      url = new URL(v);
    } catch {
      return null;
    }
    if (!/^(www\.)?instagram\.com$/i.test(url.hostname)) return null;
    const seg = url.pathname.split("/").filter(Boolean)[0];
    if (!seg || !/^[A-Za-z0-9._]{1,30}$/.test(seg)) return null;
    username = seg;
  }
  if (!username || /^\.|\.$|\.\./.test(username)) return null;
  return `https://www.instagram.com/${username}/`;
}

/** 内部IDから URL 用の不変 slug を作る。行番号や並び順には依存しない。 */
export function slugFor(id) {
  const hex = createHash("sha256").update(String(id)).digest("hex");
  // 16進→36進に寄せて短くする（10文字で約 10^15 通り。衝突は parse 側で検出する）
  return BigInt("0x" + hex.slice(0, 20)).toString(36).padStart(10, "0").slice(0, 10);
}

function parseTimestamp(value) {
  const v = String(value ?? "").trim();
  // Google フォームの既定形式 "2026/11/10 10:00:00"（JST）
  const m = v.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (m) {
    const [, y, mo, d, h = "0", mi = "0", s = "0"] = m;
    return new Date(`${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${mi}:${s.padStart(2, "0")}+09:00`);
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function clip(text, max, label, rowNo, warnings) {
  const t = String(text ?? "").replace(/\r\n?/g, "\n").trim();
  if (t.length > max) {
    warnings.push(`行 ${rowNo}: ${label}が ${max} 文字を超えているため切り詰めました`);
    return t.slice(0, max);
  }
  return t;
}

/**
 * CSV の行配列（1行目は見出し）を Work の配列に変換する。
 * 不正な行はスキップして warnings に理由を積む。他の行の処理は止めない。
 */
export function rowsToWorks(rows, { term } = {}) {
  const warnings = [];
  if (!rows || rows.length === 0) return { works: [], warnings: ["シートが空です"] };
  const idx = findColumns(rows[0]);
  for (const key of ["nickname", "title", "image"]) {
    if (idx[key] === undefined) return { works: [], warnings: [`見出しに「${COLUMNS[key][0]}」の列が見つかりません`] };
  }
  const get = (r, key) => (idx[key] === undefined ? "" : String(r[idx[key]] ?? ""));

  const seenIds = new Map();
  const seenNick = new Map();
  const works = [];
  rows.slice(1).forEach((r, i) => {
    const rowNo = i + 2; // シート上の行番号（見出しが1行目）
    if (r.every((c) => String(c ?? "").trim() === "")) return;
    const listed = get(r, "listed").trim();
    if (UNLISTED.has(listed)) return;
    if (term && idx.term !== undefined && get(r, "term").trim() !== term) return;

    const nickname = get(r, "nickname").trim();
    const title = get(r, "title").trim();
    const driveFileId = driveFileIdFrom(get(r, "image"));
    const missing = [];
    if (!nickname) missing.push("ニックネーム");
    if (!title) missing.push("作品名");
    if (!driveFileId) missing.push("作品画像");
    if (missing.length) {
      warnings.push(`行 ${rowNo}: ${missing.join("・")}が空のためスキップしました`);
      return;
    }
    const workIdRaw = get(r, "workId").trim();
    const id = workIdRaw || driveFileId;
    if (seenIds.has(id)) {
      warnings.push(`行 ${rowNo}: 作品ID「${id}」が行 ${seenIds.get(id)} と重複しているためスキップしました`);
      return;
    }
    seenIds.set(id, rowNo);
    if (seenNick.has(nickname)) {
      warnings.push(`行 ${rowNo}: ニックネーム「${nickname}」が行 ${seenNick.get(nickname)} と同じです（1人1作品の確認をしてください。両方とも掲載します）`);
    } else {
      seenNick.set(nickname, rowNo);
    }

    const orderRaw = get(r, "order").trim();
    const order = orderRaw !== "" && /^-?\d+(\.\d+)?$/.test(orderRaw) ? Number(orderRaw) : null;
    const submittedAt = parseTimestamp(get(r, "submittedAt")) ?? new Date(0);
    const instagramRaw = get(r, "instagram").trim();
    const instagramUrl = normalizeInstagram(instagramRaw);
    if (instagramRaw && !instagramUrl) warnings.push(`行 ${rowNo}: Instagram「${instagramRaw}」の形式が不正なためリンクを出しません`);

    works.push({
      id,
      slug: slugFor(id),
      driveFileId,
      submittedAt,
      inputIndex: i,
      order,
      nickname: clip(nickname, LIMITS.nickname, "ニックネーム", rowNo, warnings),
      title: clip(title, LIMITS.title, "作品名", rowNo, warnings),
      comment: clip(get(r, "comment"), LIMITS.comment, "ひとこと", rowNo, warnings),
      instagramUrl,
      term: get(r, "term").trim() || term || "",
    });
  });

  const slugs = new Map();
  for (const w of works) {
    if (slugs.has(w.slug)) warnings.push(`slug の衝突: ${w.id} と ${slugs.get(w.slug)}（作品ID列で別のIDを指定してください）`);
    slugs.set(w.slug, w.id);
  }

  works.sort((a, b) => {
    if (a.order !== null && b.order !== null) return a.order - b.order || a.inputIndex - b.inputIndex;
    if (a.order !== null) return -1;
    if (b.order !== null) return 1;
    return a.submittedAt - b.submittedAt || a.inputIndex - b.inputIndex;
  });
  return { works, warnings };
}
