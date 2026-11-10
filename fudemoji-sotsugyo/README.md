# デジタル筆文字作家養成講座 2期 卒業制作展

受講生の卒業作品をオンラインで展示する静的サイトです。Google フォーム → スプレッドシート＋Drive に集めた作品を、GitHub Actions が定期的に読み取ってページを生成し、GitHub Pages で公開します。

- 公開予定: 2026-12-01（JST）。それより前のビルドは「公開予定」の予告ページだけを出力します
- 月額費用: 0 円（GitHub Pages / GitHub Actions の無料枠、Google フォームとスプレッドシート）
- 作品の登録: ゆゆさんが Google フォームに入力するだけ。GitHub の操作は不要です

関連ドキュメント

| 文書 | 内容 |
|---|---|
| [docs/operations.md](docs/operations.md) | 作品の登録・修正・非掲載の手順（ゆゆさん／ZUMA 向け） |
| [docs/publish-xserver.md](docs/publish-xserver.md) | **GitHub を使わない公開**。パソコンで作って ZIP をエックスサーバーに置く（最終形） |
| [docs/deployment.md](docs/deployment.md) | GitHub Actions / Pages で自動公開する場合の設定（作品を集めている間の仮設） |
| [docs/design-guide.md](docs/design-guide.md) | 配色・余白・文字・カード・画像の判断基準 |
| [docs/checklist.md](docs/checklist.md) | 未確定事項と、人が行う外部作業の一覧 |

## セットアップ

Node.js 20 以上。

```bash
cd fudemoji-sotsugyo
npm ci
```

## ローカルで動かす（ダミーデータ）

本番データに触らず、`fixtures/` のサンプルだけで全ページを作れます。サンプル画像は明示的なダミーで、本番ビルドには使われません。

```bash
npm test                           # 自動テスト
npm run build:fixtures             # 公開前の状態（予告ページだけ）を dist/ に出力
npm run build:fixtures:published   # 公開後の状態（作品一覧・作品ページ）を dist/ に出力
npm run serve                      # http://localhost:4173/zuma/ で dist/ を確認
npm run release                    # 本番データで作って site.zip にまとめる（.env が必要）
```

公開判定の時刻は `--now` で自由に指定できます。

```bash
node src/build.mjs --source fixtures --now 2026-11-30T23:59:00+09:00   # 公開前
node src/build.mjs --source fixtures --now 2026-12-01T00:05:00+09:00   # 公開後
```

## 本番データでビルドする

```bash
cp .env.example .env     # 値を埋める（.env は Git 管理外）
set -a; source .env; set +a
npm run build            # 既定の取得元は service-account
```

| 取得元 `--source` | 使うもの | 用途 |
|---|---|---|
| `fixtures` | `fixtures/` | ローカル確認・テスト |
| `service-account` | GitHub Secrets のサービスアカウント鍵で Sheets API / Drive API を読み取り専用で利用 | 本番の推奨 |
| `public-csv` | リンク公開したスプレッドシートの CSV と Drive の公開ファイル | 代替案。管理者が公開範囲に同意した場合のみ |

設定は `site.config.json`。`sheet.id` / `sheet.gid` は環境変数 `FUDEMOJI_SHEET_ID` / `FUDEMOJI_SHEET_GID` で上書きできます（GitHub では Variables に置く）。

## 仕組み

```
Google フォーム → スプレッドシート（1行＝1作品）＋ Drive（画像）
      │  GitHub Actions（JST 00:05 / 12:00、手動、push）
      ▼
src/build.mjs
  fetch   取得元からシートの行と画像を読む
  parse   検証・Instagram の正規化・掲載 × の除外・並び順・slug の生成
  images  長辺 640 / 1600 の WebP と 1200×630 の OGP 画像（sharp）
  render  トップ・作品ページ・予告ページ・sitemap・404
  publish 公開日の判定（JST）。公開前は予告ページだけ
      ▼
dist/ → actions/deploy-pages → GitHub Pages
```

- 作品の URL は `works/<slug>/`。slug は Drive のファイル ID（または管理列「作品ID」）から決定的に作るので、並べ替えても変わりません
- `dist/` は毎回作り直します。非掲載にした作品のページは次のビルドで消えます
- シートの取得に失敗したらビルドは失敗し、前回の公開物がそのまま残ります。1作品の画像だけ失敗した場合はその作品をスキップして他を公開します

## ファイル構成

```
fudemoji-sotsugyo/
  site.config.json   展覧会名・公開日・コピー・リンク・baseUrl
  .env.example       環境変数の見本
  src/               build / fetch / google / parse / csv / images / render / publish / urls / serve
  templates/         styles.css / lightbox.js / share.js / favicon.svg
  fixtures/          ダミーの行データとサンプル画像（開発専用）
  scripts/           サンプル画像の生成スクリプト
  test/              node:test
  docs/              運用・公開・デザインの手引き
  dist/              生成物（Git 管理外）
.github/workflows/fudemoji-sotsugyo.yml   リポジトリ直下
```

## 専用リポジトリへ移すとき

1. `fudemoji-sotsugyo/` の中身を新リポジトリ `inazuma-design/fudemoji-sotsugyo` のルートにコピーする
2. `.github/workflows/fudemoji-sotsugyo.yml` を新リポジトリの `.github/workflows/` に置き、`working-directory: fudemoji-sotsugyo`、`cache-dependency-path`、`upload-pages-artifact` の `path`、`push.paths` から `fudemoji-sotsugyo/` を外す
3. 新リポジトリで Secrets / Variables / Pages を設定し直す（[docs/deployment.md](docs/deployment.md)）
4. `site.config.json` の `baseUrl` を `https://inazuma-design.github.io/fudemoji-sotsugyo/` に変える（GitHub Pages の URL はリポジトリ名で決まる。このリポジトリにある間は `https://inazuma-design.github.io/zuma/`）
