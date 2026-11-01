import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

export const SIZES = { thumb: 640, full: 1600 };
export const OGP = { width: 1200, height: 630, background: "#FDF8F2" };
const ACCEPTED = new Set(["jpeg", "png", "webp"]);

/**
 * 1作品の元画像から、一覧用（長辺 640）・詳細用（長辺 1600）の WebP と、
 * 1200x630 の OGP（和紙色の余白に作品全体を収める。トリミングしない）を作る。
 * 拡大はしない。元画像は出力しない。
 */
export async function processWorkImage(buffer, { outDir, slug }) {
  let meta;
  try {
    meta = await sharp(buffer).metadata();
  } catch {
    throw new Error("画像として読めません");
  }
  if (!ACCEPTED.has(meta.format)) throw new Error(`対応していない形式: ${meta.format}`);
  await mkdir(outDir, { recursive: true });

  const base = sharp(buffer, { failOn: "error" }).rotate(); // EXIF の向きを反映
  const names = { thumb: `${slug}-${SIZES.thumb}.webp`, full: `${slug}-${SIZES.full}.webp`, ogp: `${slug}-ogp.jpg` };

  const full = await base.clone().resize({ width: SIZES.full, height: SIZES.full, fit: "inside", withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
  const thumb = await base.clone().resize({ width: SIZES.thumb, height: SIZES.thumb, fit: "inside", withoutEnlargement: true }).webp({ quality: 80 }).toBuffer({ resolveWithObject: true });
  // OGP: 作品を余白つきで縮小してから、和紙色の 1200x630 キャンバスの中央に置く
  const margin = 40;
  const inner = await base
    .clone()
    .flatten({ background: OGP.background })
    .resize({ width: OGP.width - margin * 2, height: OGP.height - margin * 2, fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
  const ogp = await sharp({ create: { width: OGP.width, height: OGP.height, channels: 3, background: OGP.background } })
    .composite([{ input: inner, gravity: "centre" }])
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  await Promise.all([
    writeFile(join(outDir, names.full), full.data),
    writeFile(join(outDir, names.thumb), thumb.data),
    writeFile(join(outDir, names.ogp), ogp),
  ]);
  return {
    thumb: names.thumb,
    full: names.full,
    ogp: names.ogp,
    width: full.info.width,
    height: full.info.height,
    thumbWidth: thumb.info.width,
    thumbHeight: thumb.info.height,
  };
}
