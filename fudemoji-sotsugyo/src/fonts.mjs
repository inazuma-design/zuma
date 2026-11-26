// 書体（Google Fonts）をサイトで使う文字だけに絞る。
// 日本語の書体は文字数が多く、そのまま読むと分割ファイルが数十個・1MB を超える（スマホで表示が遅くなる）。
// ビルドの最後に全ページの文字を集め、text= で「その文字だけ入った小さな書体」を頼む URL に差し替える。
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

export const FONT_CSS_URL = "https://fonts.googleapis.com/css2?family=Yuji+Syuku&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap";

// 英数字と基本の約物は、データに出てこなくても常に含める（後から作品が増えても崩れにくいように）
const BASE_CHARS = (() => {
  let s = "";
  for (let c = 0x21; c <= 0x7e; c++) s += String.fromCharCode(c);
  return s + "、。，．・：；？！ー〜～…‥―‐「」『』（）［］【】〈〉《》“”‘’＆／＠＃％＋－＝×÷→←↑↓";
})();

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
function decodeEntities(s) {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

/** HTML（や、画面に出る文字列を含むスクリプト）から、画面に出る文字を重複なく文字コード順で返す。 */
export function collectChars(htmls, { extraTexts = [] } = {}) {
  const set = new Set(BASE_CHARS);
  for (const html of htmls) {
    const text = decodeEntities(
      String(html)
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<!--[\s\S]*?-->/g, " ")
        .replace(/<[^>]+>/g, " "),
    );
    for (const ch of text) if (!/\s/.test(ch)) set.add(ch);
  }
  for (const t of extraTexts) for (const ch of String(t)) if (!/\s/.test(ch)) set.add(ch);
  return [...set].sort((a, b) => a.codePointAt(0) - b.codePointAt(0)).join("");
}

/** 使う文字だけの書体を頼む URL。 */
export function subsetFontUrl(chars) {
  return `${FONT_CSS_URL}&text=${encodeURIComponent(chars)}`;
}

/** スクリプトの文字列リテラルの中の日本語（例: 共有ボタンの「をコピーしました」）。コメントは除く。 */
export function scriptTexts(js) {
  const code = String(js).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
  return code.match(/[　-鿿＀-￯]+/g) ?? [];
}

async function htmlFiles(dir, base = dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await htmlFiles(p, base)));
    else if (e.name.endsWith(".html")) out.push(p);
  }
  return out;
}

/** 出力フォルダの全ページの書体 URL を、サイトで使う文字だけの URL に差し替える。 */
export async function applyFontSubset(dir, { scripts = [] } = {}) {
  const files = await htmlFiles(dir);
  const htmls = await Promise.all(files.map((f) => readFile(f, "utf8")));
  const chars = collectChars(htmls, { extraTexts: scripts.flatMap(scriptTexts) });
  const from = FONT_CSS_URL.replace(/&/g, "&amp;");
  const to = subsetFontUrl(chars).replace(/&/g, "&amp;");
  await Promise.all(files.map((f, i) => (htmls[i].includes(from) ? writeFile(f, htmls[i].split(from).join(to)) : null)));
  return { chars, count: [...chars].length };
}
