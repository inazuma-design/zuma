/** 公開判定。publishAt はタイムゾーン付き ISO 文字列（例: 2026-12-01T00:00:00+09:00）。 */
export function isPublished(publishAt, now) {
  const at = new Date(publishAt);
  if (Number.isNaN(at.getTime())) throw new Error(`publishAt が日時として読めません: ${publishAt}`);
  return now.getTime() >= at.getTime();
}

/** `--now` で注入された時刻を Date にする。未指定なら現在時刻。 */
export function parseNow(value) {
  if (value === undefined || value === null || value === "") return new Date();
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw new Error(`--now の値が日時として読めません: ${value}`);
  return d;
}

export function formatJst(date) {
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", dateStyle: "long", timeStyle: "short" }).format(date);
}
