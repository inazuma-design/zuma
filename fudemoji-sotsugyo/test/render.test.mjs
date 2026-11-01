import { test } from "node:test";
import assert from "node:assert/strict";
import { escapeHtml, renderIndex, renderWork, renderTeaser, renderSitemap } from "../src/render.mjs";
import { siteUrls } from "../src/urls.mjs";

const config = {
  term: "デジタル筆文字 2期",
  title: "デジタル筆文字作家養成講座 2期 卒業制作展",
  publishAt: "2026-12-01T00:00:00+09:00",
  hero: { headline: "筆文字は、もっと自由になれる。", subheadline: "一人ひとりの「好き」が、作品になる。", description: "色も、形も、表現も。" },
  greeting: "",
  courseIntro: "",
  links: { line: "https://lin.ee/LUsnOJX", homepage: "https://fudemojinigaoesihira.com/", instagram: "https://www.instagram.com/hirac_han" },
  baseUrl: "https://inazuma-design.github.io/fudemoji-sotsugyo/",
  customDomain: "",
};
const urls = siteUrls(config);
const work = (o = {}) => ({
  id: "fileA", slug: "slugaaaaaa", nickname: "はなこ", title: "希望 <春>", comment: "1行目\n2行目 & more", instagramUrl: "https://www.instagram.com/hana_ko/",
  term: "デジタル筆文字 2期", submittedAt: new Date("2026-11-10T01:00:00Z"),
  image: { thumb: "slugaaaaaa-640.webp", full: "slugaaaaaa-1600.webp", ogp: "slugaaaaaa-ogp.jpg", width: 1600, height: 900, thumbWidth: 640, thumbHeight: 360 },
  ...o,
});

test("escapeHtml は HTML の特殊文字を実体参照にする", () => {
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
});

test("トップページ: 展覧会名・作品数・各作品のカードと専用ページへのリンクを出す", () => {
  const html = renderIndex({ config, works: [work(), work({ id: "b", slug: "slugbbbbbb", title: "海", nickname: "たろう", instagramUrl: null })], urls });
  assert.match(html, /<html lang="ja">/);
  assert.match(html, /デジタル筆文字作家養成講座 2期 卒業制作展/);
  assert.match(html, /2<\/span>\s*作品|2 作品|<span class="count">2<\/span>/);
  assert.match(html, /希望 &lt;春&gt;/);
  assert.ok(!html.includes("希望 <春>"));
  assert.match(html, /href="\/fudemoji-sotsugyo\/works\/slugaaaaaa\/"/);
  assert.match(html, /href="\/fudemoji-sotsugyo\/works\/slugbbbbbb\/"/);
  assert.match(html, /src="\/fudemoji-sotsugyo\/assets\/works\/slugaaaaaa-640\.webp"/);
  assert.match(html, /width="640" height="360"/);
  assert.match(html, /loading="lazy"/);
  assert.equal((html.match(/instagram\.com\/hana_ko\//g) || []).length, 1, "Instagram のある作品だけリンクを出す");
});

test("トップページ: 先生のごあいさつと講座紹介は原稿があるときだけ出す", () => {
  const without = renderIndex({ config, works: [work()], urls });
  assert.ok(!without.includes("ごあいさつ"));
  const withText = renderIndex({ config: { ...config, greeting: "みなさん、<卒業>おめでとう。\nひら", courseIntro: "講座の紹介" }, works: [work()], urls });
  assert.match(withText, /ごあいさつ/);
  assert.match(withText, /&lt;卒業&gt;おめでとう。<br>/);
  assert.match(withText, /講座の紹介/);
});

test("トップページ: 作品が 0 件なら「展示準備中」を出し、エラーにしない", () => {
  const html = renderIndex({ config, works: [], urls });
  assert.match(html, /展示準備中/);
});

test("トップページ: 講座への導線は最後にあり、ギャラリーより後ろに置く", () => {
  const html = renderIndex({ config: { ...config, courseIntro: "講座の紹介" }, works: [work()], urls });
  assert.ok(html.indexOf('id="works"') < html.indexOf('id="course"'));
  assert.match(html, /href="https:\/\/lin\.ee\/LUsnOJX"/);
});

test("作品ページ: 固有の title・canonical・OGP・Twitter カードと前後リンク、共有ボタンを出す", () => {
  const w = work();
  const html = renderWork({ config, work: w, prev: work({ slug: "prevxxxxxx", title: "前" }), next: null, urls, index: 2, total: 5 });
  assert.match(html, /<title>希望 &lt;春&gt; ｜ はなこ ｜ デジタル筆文字作家養成講座 2期 卒業制作展<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/inazuma-design\.github\.io\/fudemoji-sotsugyo\/works\/slugaaaaaa\/">/);
  assert.match(html, /<meta property="og:image" content="https:\/\/inazuma-design\.github\.io\/fudemoji-sotsugyo\/assets\/works\/slugaaaaaa-ogp\.jpg">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/inazuma-design\.github\.io\/fudemoji-sotsugyo\/works\/slugaaaaaa\/">/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image">/);
  assert.match(html, /src="\/fudemoji-sotsugyo\/assets\/works\/slugaaaaaa-1600\.webp"/);
  assert.match(html, /1行目<br>2行目 &amp; more/);
  assert.match(html, /href="\/fudemoji-sotsugyo\/works\/prevxxxxxx\/"/);
  assert.match(html, /data-share-url="https:\/\/inazuma-design\.github\.io\/fudemoji-sotsugyo\/works\/slugaaaaaa\/"/);
  assert.match(html, /href="\/fudemoji-sotsugyo\/#works"/);
});

test("作品ページ: Instagram が無ければリンクを出さず、コメントの HTML は無害化される", () => {
  const html = renderWork({ config, work: work({ instagramUrl: null, comment: "<script>alert(1)</script> https://evil.example" }), prev: null, next: null, urls, index: 0, total: 1 });
  assert.ok(!html.includes("instagram.com/hana_ko"));
  assert.ok(!html.includes("<script>alert"));
  assert.ok(!html.includes('href="https://evil.example"'), "明示された Instagram 以外は自動リンクしない");
});

test("予告ページ: 公開日を出し、作品の情報を一切含まない", () => {
  const html = renderTeaser({ config, urls });
  assert.match(html, /12月1日/);
  assert.ok(!html.includes("works/"));
  assert.ok(!html.includes("はなこ"));
});

test("sitemap: トップと作品ページの絶対 URL を列挙する", () => {
  const xml = renderSitemap({ works: [work(), work({ slug: "slugbbbbbb" })], urls });
  assert.match(xml, /<loc>https:\/\/inazuma-design\.github\.io\/fudemoji-sotsugyo\/<\/loc>/);
  assert.match(xml, /<loc>https:\/\/inazuma-design\.github\.io\/fudemoji-sotsugyo\/works\/slugbbbbbb\/<\/loc>/);
});

test("assetVersion を渡すと CSS / JS の URL に版番号が付き、キャッシュが更新される", () => {
  const html = renderIndex({ config, works: [work()], urls, assetVersion: "abc123" });
  assert.match(html, /href="\/fudemoji-sotsugyo\/assets\/styles\.css\?v=abc123"/);
  assert.match(html, /src="\/fudemoji-sotsugyo\/assets\/lightbox\.js\?v=abc123"/);
  const teaser = renderTeaser({ config, urls, assetVersion: "abc123" });
  assert.match(teaser, /styles\.css\?v=abc123/);
  const page = renderWork({ config, work: work(), prev: null, next: null, urls, index: 0, total: 1, assetVersion: "abc123" });
  assert.match(page, /share\.js\?v=abc123/);
});

test("トップページ: デジタル筆文字の紹介文と卒業生への一文を設定から出し、未設定なら出さない", () => {
  const without = renderIndex({ config, works: [work()], urls });
  assert.ok(!without.includes('id="about"'));
  const html = renderIndex({ config: { ...config, digitalIntro: "紙では<できない>重なりも、\nここでは表現のひとつ。", galleryLead: "一人ひとりの一筆に、敬意をこめて。" }, works: [work()], urls });
  assert.match(html, /id="about"/);
  assert.match(html, /紙では&lt;できない&gt;重なりも、<br>/);
  assert.match(html, /一人ひとりの一筆に、敬意をこめて。/);
  assert.ok(html.indexOf('id="about"') < html.indexOf('id="works"'), "紹介文はギャラリーの前");
});

test("トップページ: OGP 画像は同意済みの代表作品を指定したときだけ出す", () => {
  const without = renderIndex({ config, works: [work()], urls });
  assert.ok(!without.includes("og:image"), "指定が無ければ作品画像を OGP に使わない");
  const b = work({ id: "b", slug: "slugbbbbbb", image: { ...work().image, ogp: "slugbbbbbb-ogp.jpg" } });
  const html = renderIndex({ config: { ...config, representativeWorkId: "b" }, works: [work(), b], urls });
  assert.match(html, /<meta property="og:image" content="https:\/\/inazuma-design\.github\.io\/fudemoji-sotsugyo\/assets\/works\/slugbbbbbb-ogp\.jpg">/);
  const missing = renderIndex({ config: { ...config, representativeWorkId: "nope" }, works: [work()], urls });
  assert.ok(!missing.includes("og:image"), "見つからなければ出さない");
});

test("一覧の画像は srcset で高解像度版も渡し、原寸で開くリンクを持つ", () => {
  const html = renderIndex({ config, works: [work()], urls });
  assert.match(html, /srcset="\/fudemoji-sotsugyo\/assets\/works\/slugaaaaaa-640\.webp 640w, \/fudemoji-sotsugya?a?-?[^"]*1600\.webp 1600w"/);
  assert.match(html, /sizes="/);
});

test("作品ページ: 原寸画像を直接開くリンクがある", () => {
  const html = renderWork({ config, work: work(), prev: null, next: null, urls, index: 0, total: 1 });
  assert.match(html, /<a class="open-full" href="\/fudemoji-sotsugyo\/assets\/works\/slugaaaaaa-1600\.webp" target="_blank" rel="noopener">/);
});
