import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { processWorkImage } from "../src/images.mjs";

const png = (w, h) => sharp({ create: { width: w, height: h, channels: 4, background: { r: 200, g: 60, b: 40, alpha: 1 } } }).png().toBuffer();
const dims = async (p) => { const m = await sharp(p).metadata(); return [m.width, m.height, m.format]; };

test("横長の大きい画像から 640 / 1600 の WebP と 1200x630 の OGP を縦横比を保って作る", async () => {
  const dir = await mkdtemp(join(tmpdir(), "img-"));
  const r = await processWorkImage(await png(3200, 1600), { outDir: dir, slug: "abc" });
  assert.deepEqual(await dims(join(dir, r.thumb)), [640, 320, "webp"]);
  assert.deepEqual(await dims(join(dir, r.full)), [1600, 800, "webp"]);
  assert.deepEqual(await dims(join(dir, r.ogp)), [1200, 630, "jpeg"]);
  assert.equal(r.width, 1600);
  assert.equal(r.height, 800);
  assert.equal(r.thumbWidth, 640);
  assert.equal(r.thumbHeight, 320);
});

test("縦長画像は長辺で縮小する", async () => {
  const dir = await mkdtemp(join(tmpdir(), "img-"));
  const r = await processWorkImage(await png(1000, 4000), { outDir: dir, slug: "tall" });
  assert.deepEqual((await dims(join(dir, r.full))).slice(0, 2), [400, 1600]);
  assert.deepEqual((await dims(join(dir, r.thumb))).slice(0, 2), [160, 640]);
});

test("小さい画像は拡大しない", async () => {
  const dir = await mkdtemp(join(tmpdir(), "img-"));
  const r = await processWorkImage(await png(500, 300), { outDir: dir, slug: "small" });
  assert.deepEqual((await dims(join(dir, r.full))).slice(0, 2), [500, 300]);
  assert.deepEqual((await dims(join(dir, r.thumb))).slice(0, 2), [500, 300]);
  assert.deepEqual((await dims(join(dir, r.ogp))).slice(0, 2), [1200, 630]);
});

test("出力ファイル名は slug を含み、元画像は出力しない", async () => {
  const dir = await mkdtemp(join(tmpdir(), "img-"));
  const r = await processWorkImage(await png(800, 800), { outDir: dir, slug: "sq" });
  const files = (await readdir(dir)).sort();
  assert.deepEqual(files, ["sq-1600.webp", "sq-640.webp", "sq-ogp.jpg"]);
  assert.equal(r.thumb, "sq-640.webp");
  for (const f of files) assert.ok((await stat(join(dir, f))).size > 0);
});

test("JPEG/PNG 以外や壊れたデータは理由つきで拒否する", async () => {
  const dir = await mkdtemp(join(tmpdir(), "img-"));
  await assert.rejects(processWorkImage(Buffer.from("not an image"), { outDir: dir, slug: "bad" }), /画像として読めません/);
  const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#fff" } }).gif().toBuffer();
  await assert.rejects(processWorkImage(gif, { outDir: dir, slug: "gif" }), /対応していない形式: gif/);
});
