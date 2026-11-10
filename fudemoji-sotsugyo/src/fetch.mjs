import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { serviceAccountSource, publicCsvSource } from "./google.mjs";

/**
 * ダミーデータ。fixtures/sample-works.json の行と fixtures/sample-images/ の画像だけでビルドが完結する。
 * 本番データには一切触れない。rows を渡せば差し替えられる（テスト用）。
 */
export function fixturesSource(fixturesDir, { rows } = {}) {
  return {
    name: "fixtures",
    async loadRows() {
      const data = rows ?? JSON.parse(await readFile(join(fixturesDir, "sample-works.json"), "utf8")).rows;
      if (data.length === 0) return [["タイムスタンプ", "ニックネーム", "作品名", "ひとこと", "作品画像", "Instagram", "講座・期", "表示順", "掲載"]];
      const header = Array.from(new Set(data.flatMap((r) => Object.keys(r))));
      return [header, ...data.map((r) => header.map((h) => String(r[h] ?? "")))];
    },
    async loadImage(ref) {
      const candidates = /\.[a-z0-9]+$/i.test(ref) ? [ref] : ["png", "jpg", "jpeg", "webp"].map((ext) => `${ref}.${ext}`);
      for (const name of candidates) {
        try {
          return await readFile(join(fixturesDir, "sample-images", name));
        } catch { /* 次の候補 */ }
      }
      throw new Error(`サンプル画像 ${ref} が見つかりません`);
    },
  };
}

/** CLI / 環境変数から取得元を組み立てる。 */
export function createSource({ source, config, env = process.env, fixturesDir }) {
  const sheetId = env.FUDEMOJI_SHEET_ID || config.sheet?.id;
  const gid = env.FUDEMOJI_SHEET_GID || config.sheet?.gid;
  const needSheet = () => {
    if (!sheetId || sheetId === "TODO" || gid === undefined || gid === "TODO") {
      throw new Error("site.config.json の sheet.id / sheet.gid（または FUDEMOJI_SHEET_ID / FUDEMOJI_SHEET_GID）が未設定です");
    }
  };
  switch (source) {
    case "fixtures":
      return fixturesSource(fixturesDir);
    case "public-csv":
      needSheet();
      return publicCsvSource({ sheetId, gid });
    case "service-account": {
      needSheet();
      const raw = env.GOOGLE_SERVICE_ACCOUNT_JSON;
      if (!raw) throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON が未設定です（GitHub Secrets に登録してください）");
      let sa;
      try { sa = JSON.parse(raw); } catch { throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON が JSON として読めません"); }
      return serviceAccountSource({ serviceAccount: sa, sheetId, gid });
    }
    default:
      throw new Error(`不明な取得元: ${source}（fixtures / service-account / public-csv）`);
  }
}
