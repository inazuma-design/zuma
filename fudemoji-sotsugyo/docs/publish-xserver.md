# GitHub を使わない公開手順（先生のエックスサーバーに置く）

完成したサイトは「HTML と画像のフォルダ 1 つ」です。これを先生のエックスサーバーの、先生のドメイン（例 `sotsugyo.fudemojinigaoesihira.com`）に置けば、GitHub も Google Cloud も無くなっても表示され続けます。
作品の締切（11/24）のあとは内容がほとんど変わらないので、自動更新は要りません。「作り直して、ZIP を置き直す」だけで運用できます。

```
Google スプレッドシート＋Drive（作品データ）
        │  ZUMA のパソコンで npm run release（数十秒）
        ▼
site.zip（完成したサイト一式）
        │  エックスサーバーのファイルマネージャで ZIP をアップロード→展開（ブラウザだけ）
        ▼
https://sotsugyo.fudemojinigaoesihira.com/
```

## 一度だけの準備

### A. ZUMA のパソコン（Windows / Mac）

1. Node.js 20 以上を入れる: https://nodejs.org/ の LTS をインストール
2. このプロジェクトのフォルダ `fudemoji-sotsugyo` を置く（GitHub から ZIP でダウンロードしてもよいし、渡された ZIP を展開してもよい）
3. そのフォルダで一度だけ:
   ```
   npm ci
   ```
4. サービスアカウントの鍵ファイル（`fudemoji-sotsugyo-xxxx.json`）を、プロジェクトの外の安全な場所に置く（例: `C:\Users\zuma\fudemoji\key.json`）。**プロジェクトのフォルダには入れない**
5. プロジェクトのフォルダに `.env` を作る（`.env.example` をコピーして、次の 3 行を埋める）:
   ```
   FUDEMOJI_SOURCE=service-account
   GOOGLE_SERVICE_ACCOUNT_FILE=C:\Users\zuma\fudemoji\key.json
   FUDEMOJI_NOW=
   ```
   `site.config.json` の `sheet.id` / `sheet.gid` は設定済みです。

### B. 先生のエックスサーバー（先生、または先生の代わりに ZUMA）

1. サーバーパネル → **サブドメイン設定** → `fudemojinigaoesihira.com` → 追加。サブドメイン名 `sotsugyo`、無料 SSL をオン
2. サーバーパネル → **DNS レコード設定** → `sotsugyo` の A レコードが自動で追加されていることを確認（サブドメイン追加で自動的に入る）
3. SSL が有効になるまで最大 1 時間待つ
4. `site.config.json` の `customDomain` に `sotsugyo.fudemojinigaoesihira.com` を入れる（サイト内のリンク・OGP・canonical がこの URL になる）

## 公開する（毎回）

### 1. 作る（ZUMA のパソコン、1 分）

```
cd fudemoji-sotsugyo
npm run release
```

- `取得元: service-account ／ 候補 30 作品 ／ … ／ 公開` のような行と、警告があれば `⚠` の行が出ます。警告は 1 行ずつ確認する
- `site.zip` ができます（`dist/` の中身をまとめたもの）
- 公開日（12/1）より前に本番用を作りたいときは、`.env` の `FUDEMOJI_NOW=2026-12-01T00:05:00+09:00` を入れて実行すると公開後の状態で作れます。**ただし公開前にサーバーへ置かない**（先生との確認は手元で `npm run serve` を使う）

### 2. 置く（ブラウザだけ、2 分）

1. エックスサーバーの **ファイルマネージャ**（サーバーパネルから入れる）にログイン
2. `fudemojinigaoesihira.com` → `public_html` → `sotsugyo`（サブドメインのフォルダ）を開く
3. 前回のファイルが残っていれば全部選んで削除（非掲載になった作品を残さないため）
4. **アップロード** で `site.zip` を上げる
5. `site.zip` を選んで **展開**（解凍）。`index.html`、`works/`、`assets/` が直下に並ぶことを確認
6. `site.zip` を削除する
7. ブラウザで `https://sotsugyo.fudemojinigaoesihira.com/` を開いて確認

ファイルマネージャに展開機能が無いプランの場合は、FileZilla などの FTP ソフトで `dist/` の中身をそのまま `public_html/sotsugyo/` に上げます。

## 公開日（12/1）の動き

- 11/30 までに一度 `FUDEMOJI_NOW` を入れて作り、手元で全作品を確認する（警告 0 が理想）
- 12/1 になったら `FUDEMOJI_NOW` を空にして `npm run release` → ZIP を置く。これが公開
- 以後、修正があれば同じ手順で置き直す

## GitHub と Google Cloud はどうなるか

- **GitHub**: 不要になります。ソースの保管場所として残しても、ZIP で手元に持っても構いません。GitHub Pages の自動更新（Actions）は、二重に公開しないよう止めてください（Actions → `fudemoji-sotsugyo` → 「…」→ Disable workflow）
- **Google Cloud のサービスアカウント**: 作り直すときに Google のシートと画像を読むためだけに使います。先生を Cloud プロジェクトのオーナーに追加しておけば、ZUMA のアカウントに依存しません
- **Google スプレッドシートと Drive**: 作品データの原本。所有権を先生のアカウントに移せば、先生の資産になります（Drive の「共有」→ 自分の役割の横 → 「オーナー権限を譲渡」。先生が承諾して完了）

## 先生が自分で直したくなったとき

| したいこと | やり方 |
|---|---|
| 作品の名前やひとことを直す／非掲載にする | スプレッドシートを直す → ZUMA に「作り直して」と連絡 → ZIP を置き直す |
| 文面（ごあいさつ・紹介文）を直す | `site.config.json` を直して作り直す（ZUMA か、手順を知っている人に依頼） |
| サーバーを引っ越す | `dist/` の中身（＝ZIP の中身）をそのまま新しい場所に置くだけ |
