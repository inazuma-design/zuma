import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, access, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildSite, loadConfig } from "../src/build.mjs";
import { fixturesSource } from "../src/fetch.mjs";

const exists = (p) => access(p).then(() => true, () => false);
const quiet = { info() {}, warn() {} };

async function run({ now, rows } = {}) {
  const outDir = await mkdtemp(join(tmpdir(), "dist-"));
  const config = await loadConfig(new URL("../site.config.json", import.meta.url).pathname);
  const source = fixturesSource(new URL("../fixtures/", import.meta.url).pathname, rows ? { rows } : {});
  const result = await buildSite({ config, source, now: new Date(now ?? "2026-12-01T00:05:00+09:00"), outDir, log: quiet });
  return { outDir, result };
}

test("公開前: 予告ページと共通アセットだけを出力し、作品に関するファイルを一切出さない", async () => {
  const { outDir, result } = await run({ now: "2026-11-30T23:59:00+09:00" });
  assert.equal(result.published, false);
  const files = (await readdir(outDir, { recursive: true })).sort();
  assert.ok(files.includes("index.html"));
  assert.ok(files.includes("404.html"));
  assert.ok(files.includes("assets/styles.css"));
  assert.ok(!files.some((f) => f.startsWith("works")), `works/ が出力されている: ${files}`);
  assert.ok(!files.some((f) => f.includes("sitemap")));
  const all = await Promise.all(files.filter((f) => f.endsWith(".html")).map((f) => readFile(join(outDir, f), "utf8")));
  assert.ok(!all.join("").includes("サンプルA"), "予告ページに作品の情報が含まれている");
  assert.match(all[0] + all[1], /12月1日/);
});

test("公開前でも作品データの検証は行い、警告を返す", async () => {
  const { result } = await run({ now: "2026-11-30T23:59:00+09:00" });
  assert.ok(result.warnings.some((w) => /作品画像が空/.test(w)));
  assert.ok(result.warnings.some((w) => /Instagram/.test(w)));
});

test("公開後: トップ・作品ページ・画像・sitemap を生成し、掲載 × と不正行は含めない", async () => {
  const { outDir, result } = await run();
  assert.equal(result.published, true);
  assert.equal(result.works.length, 5);
  const index = await readFile(join(outDir, "index.html"), "utf8");
  assert.match(index, /サンプルA/);
  assert.ok(!index.includes("掲載しない作品"));
  assert.ok(!index.includes("画像が無い行"));
  assert.match(index, /<span class="count">5<\/span>/);
  // 表示順 1 のサンプルDが先頭
  assert.ok(index.indexOf("透過PNGのサンプル") < index.indexOf("ありがとう"));
  for (const w of result.works) {
    assert.ok(await exists(join(outDir, "works", w.slug, "index.html")), `works/${w.slug}/index.html`);
    assert.ok(await exists(join(outDir, "assets", "works", `${w.slug}-640.webp`)));
    assert.ok(await exists(join(outDir, "assets", "works", `${w.slug}-1600.webp`)));
    assert.ok(await exists(join(outDir, "assets", "works", `${w.slug}-ogp.jpg`)));
  }
  const sitemap = await readFile(join(outDir, "sitemap.xml"), "utf8");
  assert.equal((sitemap.match(/<loc>/g) || []).length, 6);
  assert.ok(await exists(join(outDir, ".nojekyll")));
  assert.ok(await exists(join(outDir, "robots.txt")));
});

test("公開後: 同じデータなら作品の URL（slug）は再ビルドしても変わらない", async () => {
  const a = await run();
  const b = await run();
  assert.deepEqual(a.result.works.map((w) => w.slug), b.result.works.map((w) => w.slug));
});

test("公開後: 作品を非掲載にして再ビルドすると、その作品ページは消える", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "dist-"));
  const config = await loadConfig(new URL("../site.config.json", import.meta.url).pathname);
  const fixturesDir = new URL("../fixtures/", import.meta.url).pathname;
  const rows = JSON.parse(await readFile(join(fixturesDir, "sample-works.json"), "utf8")).rows;
  const now = new Date("2026-12-02T00:00:00+09:00");
  const first = await buildSite({ config, source: fixturesSource(fixturesDir, { rows }), now, outDir, log: quiet });
  const target = first.works.find((w) => w.nickname === "サンプルA");
  assert.ok(await exists(join(outDir, "works", target.slug, "index.html")));
  const rows2 = rows.map((r) => (r["ニックネーム"] === "サンプルA" ? { ...r, "掲載": "×" } : r));
  await buildSite({ config, source: fixturesSource(fixturesDir, { rows: rows2 }), now, outDir, log: quiet });
  assert.equal(await exists(join(outDir, "works", target.slug, "index.html")), false);
  assert.equal(await exists(join(outDir, "assets", "works", `${target.slug}-640.webp`)), false);
});

test("公開後: 画像の取得に失敗した作品はスキップし、他の作品は公開する", async () => {
  const fixturesDir = new URL("../fixtures/", import.meta.url).pathname;
  const rows = JSON.parse(await readFile(join(fixturesDir, "sample-works.json"), "utf8")).rows;
  rows.push({ "タイムスタンプ": "2026/11/12 09:00:00", "ニックネーム": "壊れた画像", "作品名": "missing", "作品画像": "https://drive.google.com/open?id=no-such-file", "講座・期": "デジタル筆文字 2期" });
  const { result } = await run({ rows });
  assert.equal(result.works.length, 5);
  assert.ok(result.skipped.some((s) => /壊れた画像/.test(s)));
});

test("公開後: 作品が 0 件でも失敗せず「展示準備中」を出す", async () => {
  const { outDir, result } = await run({ rows: [] });
  assert.equal(result.works.length, 0);
  const index = await readFile(join(outDir, "index.html"), "utf8");
  assert.match(index, /展示準備中/);
});

test("シートの取得に失敗したらビルドは例外で止まり、出力先を消さない", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "dist-"));
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, "index.html"), "previous");
  const config = await loadConfig(new URL("../site.config.json", import.meta.url).pathname);
  const broken = { name: "broken", async loadRows() { throw new Error("401 Unauthorized"); }, async loadImage() {} };
  await assert.rejects(buildSite({ config, source: broken, now: new Date(), outDir, log: quiet }), /401/);
  assert.equal(await readFile(join(outDir, "index.html"), "utf8"), "previous");
});

test("createSource は GOOGLE_SERVICE_ACCOUNT_FILE で鍵ファイルのパスも受け付ける", async () => {
  const { createSource } = await import("../src/fetch.mjs");
  const dir = await mkdtemp(join(tmpdir(), "sa-"));
  const keyPath = join(dir, "key.json");
  await writeFile(keyPath, JSON.stringify({ client_email: "x@y.iam.gserviceaccount.com", private_key: "-----BEGIN PRIVATE KEY-----\nMIIB\n-----END PRIVATE KEY-----\n" }));
  const config = { sheet: { id: "S", gid: "1" } };
  const src = await createSource({ source: "service-account", config, env: { GOOGLE_SERVICE_ACCOUNT_FILE: keyPath }, fixturesDir: "/nonexistent" });
  assert.equal(src.name, "service-account");
  await assert.rejects(createSource({ source: "service-account", config, env: { GOOGLE_SERVICE_ACCOUNT_FILE: join(dir, "missing.json") }, fixturesDir: "/x" }), /missing\.json/);
});
