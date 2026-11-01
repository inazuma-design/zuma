// ローカル確認用の簡易サーバー。dist/ を baseUrl のサブパス（例 /fudemoji-sotsugyo/）で配信する。
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, normalize } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { siteUrls } from "./urls.mjs";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const config = JSON.parse(await readFile(join(ROOT, "site.config.json"), "utf8"));
const { basePath } = siteUrls(config);
const dist = process.env.FUDEMOJI_DIST || join(ROOT, "dist");
const port = Number(process.env.PORT || 4173);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".webp": "image/webp", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".xml": "application/xml", ".txt": "text/plain" };

createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (basePath !== "/" && !p.startsWith(basePath)) { res.writeHead(302, { Location: basePath }); return res.end(); }
  p = p.slice(basePath.length - 1);
  if (p.endsWith("/")) p += "index.html";
  const file = normalize(join(dist, p));
  if (!file.startsWith(dist)) { res.writeHead(403); return res.end(); }
  try {
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": types[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    try {
      res.writeHead(404, { "Content-Type": types[".html"] });
      res.end(await readFile(join(dist, "404.html")));
    } catch { res.end("not found"); }
  }
}).listen(port, () => console.log(`http://localhost:${port}${basePath}`));
