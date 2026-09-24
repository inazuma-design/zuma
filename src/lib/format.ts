/** SQLite `datetime('now')` values are UTC in "YYYY-MM-DD HH:MM:SS" form. */
export function parseDbDate(value: string): Date {
  return new Date(value.includes("T") ? value : value.replace(" ", "T") + "Z");
}

export function yen(amount: number): string {
  return `¥${amount.toLocaleString("ja-JP")}`;
}

export function formatDate(value: string): string {
  return parseDbDate(value).toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function timeAgo(value: string): string {
  const diff = (Date.now() - parseDbDate(value).getTime()) / 1000;
  if (diff < 60) return "たった今";
  if (diff < 3600) return `${Math.floor(diff / 60)}分前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}時間前`;
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}日前`;
  return formatDate(value);
}

export const THEMES: Record<string, { label: string; gradient: string; accent: string; soft: string }> = {
  pink: { label: "ピンク", gradient: "from-pink-400 via-rose-400 to-fuchsia-500", accent: "bg-pink-500", soft: "bg-pink-50 text-pink-700" },
  orange: { label: "オレンジ", gradient: "from-amber-300 via-orange-400 to-red-400", accent: "bg-orange-500", soft: "bg-orange-50 text-orange-700" },
  sky: { label: "スカイ", gradient: "from-sky-300 via-cyan-400 to-indigo-500", accent: "bg-sky-500", soft: "bg-sky-50 text-sky-700" },
  green: { label: "グリーン", gradient: "from-lime-300 via-emerald-400 to-teal-500", accent: "bg-emerald-500", soft: "bg-emerald-50 text-emerald-700" },
  purple: { label: "パープル", gradient: "from-violet-400 via-purple-500 to-indigo-600", accent: "bg-violet-500", soft: "bg-violet-50 text-violet-700" },
  mono: { label: "モノトーン", gradient: "from-zinc-500 via-zinc-700 to-zinc-900", accent: "bg-zinc-800", soft: "bg-zinc-100 text-zinc-700" },
};

export function theme(key: string) {
  return THEMES[key] ?? THEMES.pink;
}

export const CATEGORIES = ["音楽", "アイドル", "イラスト", "料理", "ゲーム", "スポーツ", "ビジネス", "その他"];

/** Converts a YouTube / Vimeo URL into an embeddable player URL, or null if unsupported. */
export function videoEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtube.com") {
      const id = u.searchParams.get("v") ?? u.pathname.match(/^\/(?:live|shorts|embed)\/([\w-]+)/)?.[1];
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}`;
    if (host === "vimeo.com") {
      const id = u.pathname.match(/^\/(\d+)/)?.[1];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {}
  return null;
}

export function formatDateTime(value: string): string {
  return parseDbDate(value).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** DB datetime → value for <input type="datetime-local"> in JST. */
export function toJstInput(value: string): string {
  const d = new Date(parseDbDate(value).getTime() + 9 * 3600 * 1000);
  return d.toISOString().slice(0, 16);
}

export function gateLabel(minPrice: number): string {
  return minPrice === 0 ? "全会員・一般公開" : `${yen(minPrice)}以上のプラン限定`;
}
