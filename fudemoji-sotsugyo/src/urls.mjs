/**
 * サイト内のパスと絶対 URL を一箇所で組み立てる。
 * GitHub Pages のサブパス（/fudemoji-sotsugyo/）でも独自ドメイン直下（/）でも同じ呼び方で動く。
 */
export function siteUrls({ baseUrl, customDomain }) {
  let origin;
  let basePath;
  if (customDomain && String(customDomain).trim()) {
    origin = `https://${String(customDomain).trim().replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
    basePath = "/";
  } else {
    const u = new URL(baseUrl);
    origin = u.origin;
    basePath = u.pathname.endsWith("/") ? u.pathname : u.pathname + "/";
  }
  const path = (rel = "") => basePath + String(rel).replace(/^\/+/, "");
  const abs = (rel = "") => origin + path(rel);
  return {
    origin,
    basePath,
    path,
    abs,
    workPath: (slug) => path(`works/${slug}/`),
    workAbs: (slug) => abs(`works/${slug}/`),
  };
}
