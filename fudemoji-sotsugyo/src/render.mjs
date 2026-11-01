import { formatJst } from "./publish.mjs";

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 改行だけ <br> にする。それ以外の HTML は一切通さない（自動リンクもしない）。 */
export function nl2br(text) {
  return escapeHtml(text).replace(/\n/g, "<br>");
}

const attr = escapeHtml;

function publishDateLabel(publishAt) {
  const d = new Date(publishAt);
  return new Intl.DateTimeFormat("ja-JP", { timeZone: "Asia/Tokyo", month: "long", day: "numeric" }).format(d);
}

function head({ title, description, canonical, ogImage, ogType = "website", urls, assetVersion = "", extraCss = "" }) {
  const v = assetVersion ? `?v=${encodeURIComponent(assetVersion)}` : "";
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${attr(description)}">
<link rel="canonical" href="${attr(canonical)}">
<meta property="og:type" content="${ogType}">
<meta property="og:title" content="${attr(title)}">
<meta property="og:description" content="${attr(description)}">
<meta property="og:url" content="${attr(canonical)}">
<meta property="og:site_name" content="${attr(title)}">
<meta property="og:locale" content="ja_JP">
${ogImage ? `<meta property="og:image" content="${attr(ogImage)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${attr(ogImage)}">` : `<meta name="twitter:card" content="summary">`}
<meta name="twitter:title" content="${attr(title)}">
<meta name="twitter:description" content="${attr(description)}">
<meta name="theme-color" content="#FDF8F2">
<link rel="icon" href="${attr(urls.path("favicon.svg"))}" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Yuji+Syuku&family=Zen+Kaku+Gothic+New:wght@400;500;700&display=swap">
<link rel="stylesheet" href="${attr(urls.path("assets/styles.css") + v)}">
${extraCss}
</head>`;
}

function instagramLink(url, label) {
  if (!url) return "";
  return `<a class="insta" href="${attr(url)}" target="_blank" rel="noopener noreferrer" aria-label="${attr(label)}のInstagram"><svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.3" cy="6.7" r="1.1" fill="currentColor"/></svg><span>Instagram</span></a>`;
}

function footer(config, urls) {
  const year = new Date(config.publishAt).getFullYear();
  return `<footer class="site-foot">
  <p class="foot-title">${escapeHtml(config.title)}</p>
  <p class="foot-note">作品の著作権は、それぞれの作者にあります。無断転載はご遠慮ください。</p>
  <p class="foot-credit">© ${year} 筆文字似顔絵師Hira ／ サイト制作・サポート：ZUMA</p>
</footer>`;
}

function workCard(w, urls) {
  const href = urls.workPath(w.slug);
  const img = w.image;
  return `<li class="work-card">
  <a class="work-frame" href="${attr(href)}" aria-label="${attr(w.title)}（${attr(w.nickname)}）の作品ページ">
    <img src="${attr(urls.path(`assets/works/${img.thumb}`))}" width="${img.thumbWidth}" height="${img.thumbHeight}" alt="${attr(w.nickname)}さんの作品「${attr(w.title)}」" loading="lazy" decoding="async" data-full="${attr(urls.path(`assets/works/${img.full}`))}" data-full-width="${img.width}" data-full-height="${img.height}">
  </a>
  <div class="work-caption">
    <h3 class="work-title"><a href="${attr(href)}">${escapeHtml(w.title)}</a></h3>
    <p class="work-author">${escapeHtml(w.nickname)}</p>
    ${w.comment ? `<p class="work-comment">${nl2br(w.comment)}</p>` : ""}
    <div class="work-actions">
      <a class="work-link" href="${attr(href)}">作品ページを見る</a>
      <button type="button" class="work-zoom" data-lightbox="${attr(w.slug)}">拡大して見る</button>
      ${instagramLink(w.instagramUrl, w.nickname)}
    </div>
  </div>
</li>`;
}

export function renderIndex({ config, works, urls, assetVersion = "" }) {
  const v = assetVersion ? `?v=${encodeURIComponent(assetVersion)}` : "";
  const description = config.hero?.description || `${config.title}。受講生の卒業作品をオンラインで展示しています。`;
  const count = works.length;
  const heroImage = works[0] ? urls.abs(`assets/works/${works[0].image.ogp}`) : null;
  const gallery = count
    ? `<ul class="work-grid" id="work-grid">${works.map((w) => workCard(w, urls)).join("\n")}</ul>`
    : `<p class="empty">展示準備中です。作品の掲載まで、もう少しお待ちください。</p>`;

  return `${head({ title: config.title, description, canonical: urls.abs(""), ogImage: heroImage, urls, assetVersion })}
<body class="page-index">
<a class="skip" href="#works">作品一覧へ</a>
<header class="hero">
  <div class="hero-text">
    <p class="hero-kicker">${escapeHtml(config.term)}</p>
    <h1 class="hero-title">${escapeHtml(config.title)}</h1>
    ${config.hero?.subheadline ? `<p class="hero-sub">${escapeHtml(config.hero.subheadline)}</p>` : ""}
    ${config.hero?.description ? `<p class="hero-desc">${nl2br(config.hero.description)}</p>` : ""}
    <p class="hero-date">${publishDateLabel(config.publishAt)} 公開</p>
  </div>
  <p class="hero-headline">${escapeHtml(config.hero?.headline || "")}</p>
</header>
<main>
<section class="works" id="works" aria-labelledby="works-heading">
  <h2 id="works-heading" class="section-title">${escapeHtml(config.galleryHeading || "それぞれの一筆、それぞれの世界。")}</h2>
  <p class="count-line">全 <span class="count">${count}</span> 作品</p>
  ${gallery}
</section>
${config.greeting ? `<section class="greeting" id="greeting" aria-labelledby="greeting-heading">
  <h2 id="greeting-heading" class="section-title">Hira先生からのごあいさつ</h2>
  <div class="greeting-body"><p>${nl2br(config.greeting)}</p></div>
</section>` : ""}
${config.courseIntro || config.links ? `<section class="course" id="course" aria-labelledby="course-heading">
  <h2 id="course-heading" class="section-title">${escapeHtml(config.courseHeading || "あなたも、デジタル筆文字の世界へ。")}</h2>
  ${config.courseIntro ? `<p class="course-body">${nl2br(config.courseIntro)}</p>` : ""}
  <ul class="course-links">
    ${config.links?.line ? `<li><a href="${attr(config.links.line)}" target="_blank" rel="noopener noreferrer">公式LINE</a></li>` : ""}
    ${config.links?.homepage ? `<li><a href="${attr(config.links.homepage)}" target="_blank" rel="noopener noreferrer">ホームページ</a></li>` : ""}
    ${config.links?.instagram ? `<li><a href="${attr(config.links.instagram)}" target="_blank" rel="noopener noreferrer">Instagram</a></li>` : ""}
  </ul>
</section>` : ""}
</main>
${footer(config, urls)}
<dialog class="lightbox" id="lightbox" aria-label="作品の拡大表示">
  <button type="button" class="lb-close" data-lb-close aria-label="閉じる">×</button>
  <figure class="lb-figure">
    <img class="lb-img" alt="">
    <figcaption class="lb-caption"><span class="lb-title"></span><span class="lb-author"></span><a class="lb-link" href="#">作品ページを見る</a></figcaption>
  </figure>
  <button type="button" class="lb-nav lb-prev" data-lb-prev aria-label="前の作品">‹</button>
  <button type="button" class="lb-nav lb-next" data-lb-next aria-label="次の作品">›</button>
</dialog>
<script src="${attr(urls.path("assets/lightbox.js") + v)}" defer></script>
</body>
</html>
`;
}

export function renderWork({ config, work, prev, next, urls, index, total, assetVersion = "" }) {
  const v = assetVersion ? `?v=${encodeURIComponent(assetVersion)}` : "";
  const title = `${work.title} ｜ ${work.nickname} ｜ ${config.title}`;
  const description = work.comment ? work.comment.replace(/\s+/g, " ").slice(0, 120) : `${work.nickname}さんの卒業作品「${work.title}」。${config.title}より。`;
  const canonical = urls.workAbs(work.slug);
  const img = work.image;
  return `${head({ title, description, canonical, ogImage: urls.abs(`assets/works/${img.ogp}`), ogType: "article", urls, assetVersion })}
<body class="page-work">
<header class="work-head">
  <a class="back" href="${attr(urls.path("#works"))}">← 展覧会にもどる</a>
  <p class="work-head-title">${escapeHtml(config.title)}</p>
</header>
<main class="work-main">
  <figure class="work-stage">
    <img src="${attr(urls.path(`assets/works/${img.full}`))}" width="${img.width}" height="${img.height}" alt="${attr(work.nickname)}さんの作品「${attr(work.title)}」" fetchpriority="high" decoding="async">
  </figure>
  <section class="work-info">
    <h1 class="work-page-title">${escapeHtml(work.title)}</h1>
    <p class="work-page-author">${escapeHtml(work.nickname)}</p>
    ${work.comment ? `<div class="work-page-comment"><p>${nl2br(work.comment)}</p></div>` : ""}
    <div class="work-page-actions">
      <button type="button" class="share" data-share-url="${attr(canonical)}" data-share-title="${attr(title)}">この作品を共有</button>
      ${instagramLink(work.instagramUrl, work.nickname)}
    </div>
    <p class="share-note" aria-live="polite" hidden></p>
  </section>
  <nav class="work-nav" aria-label="前後の作品">
    ${prev ? `<a class="nav-prev" href="${attr(urls.workPath(prev.slug))}" rel="prev"><span class="nav-label">前の作品</span><span class="nav-title">${escapeHtml(prev.title)}</span></a>` : `<span class="nav-empty"></span>`}
    <span class="nav-pos">${index + 1} / ${total}</span>
    ${next ? `<a class="nav-next" href="${attr(urls.workPath(next.slug))}" rel="next"><span class="nav-label">次の作品</span><span class="nav-title">${escapeHtml(next.title)}</span></a>` : `<span class="nav-empty"></span>`}
  </nav>
</main>
${footer(config, urls)}
<script src="${attr(urls.path("assets/share.js") + v)}" defer></script>
</body>
</html>
`;
}

export function renderTeaser({ config, urls, assetVersion = "" }) {
  const dateLabel = publishDateLabel(config.publishAt);
  const description = `${config.title}は ${dateLabel} に公開予定です。`;
  return `${head({ title: config.title, description, canonical: urls.abs(""), ogImage: null, urls, assetVersion })}
<body class="page-teaser">
<main class="teaser">
  <p class="hero-kicker">${escapeHtml(config.term)}</p>
  <h1 class="hero-title">${escapeHtml(config.title)}</h1>
  <p class="teaser-date"><span class="teaser-date-num">${escapeHtml(dateLabel)}</span>公開予定</p>
  ${config.hero?.headline ? `<p class="hero-headline">${escapeHtml(config.hero.headline)}</p>` : ""}
  <p class="teaser-note">受講生の卒業作品を、ここに展示します。公開までもう少しお待ちください。</p>
</main>
${footer(config, urls)}
</body>
</html>
`;
}

export function renderSitemap({ works, urls }) {
  const items = [urls.abs(""), ...works.map((w) => urls.workAbs(w.slug))];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${items.map((u) => `  <url><loc>${escapeHtml(u)}</loc></url>`).join("\n")}
</urlset>
`;
}

export function render404({ config, urls, assetVersion = "" }) {
  return `${head({ title: `ページが見つかりません ｜ ${config.title}`, description: config.title, canonical: urls.abs(""), ogImage: null, urls, assetVersion })}
<body class="page-teaser">
<main class="teaser">
  <h1 class="hero-title">ページが見つかりません</h1>
  <p class="teaser-note">URL が変わったか、作品が取り下げられた可能性があります。</p>
  <p><a class="back" href="${attr(urls.path(""))}">展覧会のトップへ</a></p>
</main>
${footer(config, urls)}
</body>
</html>
`;
}

export { formatJst };
