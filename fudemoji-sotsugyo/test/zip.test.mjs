import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { zipDirectory } from "../scripts/make-zip.mjs";

test("フォルダを ZIP にまとめ、相対パスのまま展開できる", async () => {
  const dir = await mkdtemp(join(tmpdir(), "zip-"));
  await mkdir(join(dir, "src", "assets", "works"), { recursive: true });
  await writeFile(join(dir, "src", "index.html"), "<p>こんにちは</p>");
  await writeFile(join(dir, "src", "assets", "works", "a.webp"), Buffer.from([0, 1, 2, 3, 255]));
  await writeFile(join(dir, "src", ".nojekyll"), "");
  const out = join(dir, "site.zip");
  const { count } = await zipDirectory(join(dir, "src"), out);
  assert.equal(count, 3);
  const listing = execFileSync("unzip", ["-l", out], { encoding: "utf8" });
  assert.match(listing, /index\.html/);
  assert.match(listing, /assets\/works\/a\.webp/);
  const extract = await mkdtemp(join(tmpdir(), "unz-"));
  execFileSync("unzip", ["-q", out, "-d", extract]);
  assert.equal(await readFile(join(extract, "index.html"), "utf8"), "<p>こんにちは</p>");
  assert.deepEqual([...await readFile(join(extract, "assets", "works", "a.webp"))], [0, 1, 2, 3, 255]);
});
