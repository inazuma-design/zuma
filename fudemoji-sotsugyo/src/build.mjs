import { readFile, writeFile, mkdir, rm, cp, mkdtemp } from "node:fs/promises";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { rowsToWorks } from "./parse.mjs";
import { isPublished, parseNow, formatJst } from "./publish.mjs";
import { siteUrls } from "./urls.mjs";
import { processWorkImage } from "./images.mjs";
import { renderIndex, renderWork, renderTeaser, renderSitemap, render404 } from "./render.mjs";
import { createSource } from "./fetch.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

export async function loadConfig(path) {
  const config = JSON.parse(await readFile(path, "utf8"));
  for (const key of ["term", "title", "publishAt", "baseUrl"]) {
    if (!config[key]) throw new Error(`site.config.json に ${key} がありません`);
  }
  return config;
}

/**
 * サイト全体を生成する。
 * - 取得→検証は公開前でも必ず行う（問題を早く見つけるため）
 * - 公開前は予告ページと共通アセットだけを出力し、作品に関するファイルは一切出さない
 * - 出力先は毎回作り直す（取り下げた作品のファイルが残らないように）
 * - シートの取得失敗は例外で止め、出力先には触れない（前回の公開物が残る）
 */
export async function buildSite({ config, source, now, outDir, templatesDir = join(ROOT, "templates"), log = console }) {
  const rows = await source.loadRows();
  const { works: candidates, warnings } = rowsToWorks(rows, { term: config.term });
  for (const w of warnings) log.warn(`⚠ ${w}`);
  const published = isPublished(config.publishAt, now);
  const urls = siteUrls(config);
  log.info(`取得元: ${source.name} ／ 候補 ${candidates.length} 作品 ／ 判定時刻 ${formatJst(now)} ／ ${published ? "公開" : "公開前（予告ページのみ）"}`);

  // 画像は公開前でも検証のために処理する（公開前は一時ディレクトリに出して捨てる）
  const imageDir = published ? join(outDir, "assets", "works") : await mkdtemp(join(tmpdir(), "fudemoji-check-"));
  const staging = published ? await mkdtemp(join(tmpdir(), "fudemoji-dist-")) : null;
  const imgOut = published ? join(staging, "assets", "works") : imageDir;

  const works = [];
  const skipped = [];
  for (const w of candidates) {
    try {
      const buf = await source.loadImage(w.driveFileId ?? w.imageRef);
      const image = await processWorkImage(buf, { outDir: imgOut, slug: w.slug });
      works.push({ ...w, image });
    } catch (e) {
      const msg = `作品「${w.title}」（${w.nickname}）をスキップ: ${e.message}`;
      skipped.push(msg);
      log.warn(`⚠ ${msg}`);
    }
  }
  if (!published) await rm(imageDir, { recursive: true, force: true });

  // 出力先を作り直す。公開時は一時ディレクトリで組み立ててから差し替える
  const target = published ? staging : await mkdtemp(join(tmpdir(), "fudemoji-dist-"));
  await mkdir(join(target, "assets"), { recursive: true });
  const hash = createHash("sha256");
  for (const f of ["styles.css", "lightbox.js", "share.js"]) {
    hash.update(await readFile(join(templatesDir, f)));
    await cp(join(templatesDir, f), join(target, "assets", f));
  }
  // CSS/JS の中身から版番号を作り URL に付ける。更新のたびにブラウザのキャッシュが切り替わる
  const assetVersion = hash.digest("hex").slice(0, 8);
  await cp(join(templatesDir, "favicon.svg"), join(target, "favicon.svg"));
  await writeFile(join(target, ".nojekyll"), "");
  await writeFile(join(target, "404.html"), render404({ config, urls, assetVersion }));

  if (!published) {
    await writeFile(join(target, "index.html"), renderTeaser({ config, urls, assetVersion }));
    await writeFile(join(target, "robots.txt"), `User-agent: *\nDisallow: /\n`);
  } else {
    await writeFile(join(target, "index.html"), renderIndex({ config, works, urls, assetVersion }));
    for (let i = 0; i < works.length; i++) {
      const w = works[i];
      const dir = join(target, "works", w.slug);
      await mkdir(dir, { recursive: true });
      await writeFile(join(dir, "index.html"), renderWork({ config, work: w, prev: works[i - 1] ?? null, next: works[i + 1] ?? null, urls, index: i, total: works.length, assetVersion }));
    }
    await writeFile(join(target, "sitemap.xml"), renderSitemap({ works, urls }));
    await writeFile(join(target, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${urls.abs("sitemap.xml")}\n`);
  }

  await rm(outDir, { recursive: true, force: true });
  await mkdir(dirname(outDir), { recursive: true });
  await cp(target, outDir, { recursive: true });
  await rm(target, { recursive: true, force: true });

  log.info(`出力: ${outDir} ／ 掲載 ${published ? works.length : 0} 作品 ／ スキップ ${skipped.length} ／ 警告 ${warnings.length}`);
  return { published, works, warnings, skipped, outDir };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) { args[key] = next; i++; } else args[key] = true;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const configPath = args.config ? String(args.config) : join(ROOT, "site.config.json");
  const config = await loadConfig(configPath);
  const sourceName = String(args.source || process.env.FUDEMOJI_SOURCE || "service-account");
  const now = parseNow(args.now ?? process.env.FUDEMOJI_NOW);
  const outDir = args.out ? String(args.out) : join(ROOT, "dist");
  const source = await createSource({ source: sourceName, config, fixturesDir: join(ROOT, "fixtures") });
  const result = await buildSite({ config, source, now, outDir });
  if (args["fail-on-warning"] && (result.warnings.length || result.skipped.length)) {
    console.error("警告があるため失敗扱いにします（--fail-on-warning）");
    process.exit(2);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((e) => {
    console.error(`✖ ビルド失敗: ${e.message}`);
    process.exit(1);
  });
}
