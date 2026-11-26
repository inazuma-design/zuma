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

test("トップページ: ごあいさつは作品一覧の前に出し、見出しは「ごあいさつ」（先生ご本人の言葉として読める形）。空行で段落に分ける", () => {
  const html = renderIndex({ config: { ...config, greeting: "一段落目。\n続き。\n\n二段落目。" }, works: [work()], urls });
  const g = html.indexOf('id="greeting"');
  const w = html.indexOf('id="works"');
  assert.ok(g > 0 && w > 0 && g < w, "greeting が works より前");
  assert.match(html, /<h2 id="greeting-heading" class="section-title">ごあいさつ<\/h2>/);
  assert.ok(!html.includes("先生から"), "先生を第三者として呼ぶ言い回しを使わない");
  assert.ok(html.includes('<div class="greeting-body"><p>一段落目。<br>続き。</p><p>二段落目。</p></div>'));
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
  // 作品にすぐ出会えるよう、紹介文は作品一覧の後（見終えた人への一言）に置く
  assert.ok(html.indexOf('id="works"') < html.indexOf('id="about"'), "紹介文はギャラリーの後");
});

test("トップページ: 最後の案内は公式LINEを主ボタン、ホームページを枠線、Instagramを文字リンクにして強さに差をつける", () => {
  const html = renderIndex({ config, works: [work()], urls });
  assert.match(html, /<a class="btn-primary" href="https:\/\/lin\.ee\/LUsnOJX"[^>]*>公式LINE<\/a>/);
  assert.match(html, /<a class="btn-secondary" href="https:\/\/fudemojinigaoesihira\.com\/"[^>]*>ホームページ<\/a>/);
  assert.match(html, /<a class="btn-text" href="https:\/\/www\.instagram\.com\/hirac_han"[^>]*>Instagram<\/a>/);
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

test("作品ページ: 画像をページ内で画面いっぱいに表示するボタンとダイアログがあり、別タブは開かない", () => {
  const html = renderWork({ config, work: work(), prev: null, next: null, urls, index: 0, total: 1 });
  assert.match(html, /<button type="button" class="open-full" data-full="\/fudemoji-sotsugyo\/assets\/works\/slugaaaaaa-1600\.webp">/);
  assert.match(html, /<dialog class="lightbox" id="work-full"/);
  assert.ok(!html.includes('target="_blank" rel="noopener">原寸'), "画像を別タブで開くリンクは使わない");
});

test("一覧のライトボックスにも別タブを開くリンクは無い", () => {
  const html = renderIndex({ config, works: [work()], urls });
  assert.ok(!html.includes("lb-full"));
});

test("ヒーローに先生の作品（heroArt）があれば、額装画像とキャプションを出し、トップの OGP に使う", () => {
  const heroArt = { thumb: "hero-640.webp", full: "hero-1600.webp", ogp: "hero-ogp.jpg", width: 1600, height: 1000, thumbWidth: 640, thumbHeight: 400, caption: "筆文字似顔絵師Hira「<春>」", alt: "ひら先生の作品" };
  const html = renderIndex({ config, works: [work()], urls, heroArt });
  assert.match(html, /<figure class="hero-art">/);
  assert.match(html, /src="\/fudemoji-sotsugyo\/assets\/hero-1600\.webp"/);
  assert.match(html, /筆文字似顔絵師Hira「&lt;春&gt;」/);
  assert.match(html, /<meta property="og:image" content="https:\/\/inazuma-design\.github\.io\/fudemoji-sotsugyo\/assets\/hero-ogp\.jpg">/);
  assert.ok(html.indexOf('class="hero-art"') < html.indexOf('id="works"'), "FV はギャラリーより前");
  const teaser = renderTeaser({ config, urls, heroArt });
  assert.match(teaser, /hero-1600\.webp/);
  assert.match(teaser, /og:image/);
  const none = renderIndex({ config, works: [work()], urls });
  assert.ok(!none.includes("hero-art"));
});

test("展覧会名は語のまとまり（kw）ごとに包み、「作家養成講｜座」のような途中改行を防ぐ", () => {
  const h1 = '<h1 class="hero-title"><span class="kw">デジタル筆文字</span><span class="kw">作家養成講座</span> <span class="kw">2期</span> <span class="kw">卒業制作展</span></h1>';
  const html = renderIndex({ config, works: [], urls });
  assert.ok(html.includes(h1), "トップの見出し");
  const teaser = renderTeaser({ config, urls });
  assert.ok(teaser.includes(h1), "予告ページの見出し");
});

test("展覧会名の語の区切りは HTML として無害化される", () => {
  const html = renderIndex({ config: { ...config, title: "<b>講座</b> 3 期" }, works: [], urls });
  assert.ok(html.includes('<span class="kw">&lt;b&gt;</span><span class="kw">講座</span><span class="kw">&lt;/b&gt;</span> <span class="kw">3期</span>'));
});

test("メインコピーの改行（\\n）は <br> になり、縦書きでは左の列に続く", () => {
  const html = renderIndex({ config: { ...config, hero: { ...config.hero, headline: "筆文字は、もっと\n自由になれる。" } }, works: [], urls });
  assert.match(html, /<p class="hero-headline"><span class="hl-line">筆文字は、もっと<\/span><br><span class="hl-line">自由になれる。<\/span><\/p>/);
  const teaser = renderTeaser({ config: { ...config, hero: { ...config.hero, headline: "A\nB" } }, urls });
  assert.match(teaser, /<p class="hero-headline"><span class="hl-line">A<\/span><br><span class="hl-line">B<\/span><\/p>/);
  const one = renderIndex({ config, works: [], urls });
  assert.match(one, /<p class="hero-headline"><span class="hl-line">筆文字は、もっと自由になれる。<\/span><\/p>/);
});

test("Instagram が複数あれば、それぞれ @アカウント名 で見分けがつくリンクにする（1つなら従来どおり Instagram）", () => {
  const two = renderWork({ config, work: work({ instagramUrl: "https://www.instagram.com/aaa/", instagramUrls: ["https://www.instagram.com/aaa/", "https://www.instagram.com/bbb/"] }), prev: null, next: null, urls, index: 0, total: 1 });
  assert.match(two, /href="https:\/\/www\.instagram\.com\/aaa\/"[^>]*aria-label="はなこのInstagram（@aaa）"[^>]*>[\s\S]*?<span>@aaa<\/span><\/a>/);
  assert.match(two, /href="https:\/\/www\.instagram\.com\/bbb\/"[^>]*aria-label="はなこのInstagram（@bbb）"[^>]*>[\s\S]*?<span>@bbb<\/span><\/a>/);
  const index = renderIndex({ config, works: [work({ instagramUrls: ["https://www.instagram.com/aaa/", "https://www.instagram.com/bbb/"] })], urls });
  assert.equal((index.match(/class="insta"/g) || []).length, 2, "一覧のカードにも2つ出す");
  const one = renderWork({ config, work: work(), prev: null, next: null, urls, index: 0, total: 1 });
  assert.match(one, /<span>Instagram<\/span><\/a>/);
});
