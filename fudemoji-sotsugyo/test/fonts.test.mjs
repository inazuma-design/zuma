import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { collectChars, subsetFontUrl, FONT_CSS_URL } from "../src/fonts.mjs";
import { buildSite, loadConfig } from "../src/build.mjs";
import { fixturesSource } from "../src/fetch.mjs";

const quiet = { info() {}, warn() {} };

test("書体: ページの文字を重複なく集め、タグ・script・style は数えず、HTML の記号は元の文字に戻す", () => {
  const chars = collectChars([
    '<p class="x">筆文字&amp;筆</p><script>var 秘密="無";</script><style>.a{content:"体"}</style><img alt="額">',
  ]);
  assert.ok(chars.includes("筆") && chars.includes("文") && chars.includes("字") && chars.includes("&"));
  assert.equal([...chars].filter((c) => c === "筆").length, 1, "重複しない");
  assert.ok(!chars.includes("秘") && !chars.includes("体"), "script・style の中は数えない");
  assert.ok(!chars.includes("額"), "属性（画面に出ない代替テキスト）は数えない");
  assert.ok(chars.includes("A") && chars.includes("0") && chars.includes("、") && chars.includes("。"), "英数字と基本の約物は常に含める");
  assert.deepEqual([...chars], [...chars].sort((a, b) => a.codePointAt(0) - b.codePointAt(0)), "並びが毎回同じ（文字コード順）");
});

test("書体: 使う文字だけを Google Fonts に頼む URL（text=）を作る", () => {
  const url = subsetFontUrl("あ字");
  assert.ok(url.startsWith(FONT_CSS_URL));
  assert.ok(url.endsWith("&text=" + encodeURIComponent("あ字")));
});

test("書体: ビルドした全ページの書体の読み込みが、サイトで使う文字だけの URL になる", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "dist-"));
  const config = { ...(await loadConfig(fileURLToPath(new URL("../site.config.json", import.meta.url)))), earlyPreview: false };
  const source = fixturesSource(fileURLToPath(new URL("../fixtures/", import.meta.url)));
  const result = await buildSite({ config, source, now: new Date("2026-12-01T00:05:00+09:00"), outDir, log: quiet });
  const pages = ["index.html", "404.html", ...result.works.map((w) => join("works", w.slug, "index.html"))];
  for (const p of pages) {
    const html = await readFile(join(outDir, p), "utf8");
    const m = html.match(/<link rel="stylesheet" href="(https:\/\/fonts\.googleapis\.com\/[^"]+)">/);
    assert.ok(m, `${p}: 書体の読み込みがある`);
    const href = m[1].replace(/&amp;/g, "&");
    assert.ok(href.includes("&text="), `${p}: text= で文字を絞っている`);
    const text = decodeURIComponent(href.split("&text=")[1]);
    for (const c of "ありがとう") assert.ok(text.includes(c), `${p}: 作品名の文字「${c}」を含む`);
    for (const c of "をコピーしました") assert.ok(text.includes(c), `${p}: 共有ボタンの文字「${c}」を含む`);
  }
});
