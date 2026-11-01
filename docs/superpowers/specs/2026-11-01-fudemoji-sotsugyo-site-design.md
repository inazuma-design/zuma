# デジタル筆文字 2期 卒業制作展サイト 設計書

作成日: 2026-11-01
依頼: ZUMA（講座サポート）／ 発注元: 筆文字似顔絵師Hira先生
根拠: 先生の事前アンケート回答（2026-10-30）、ZUMAさんとの打ち合わせ

## 1. 目的と前提

- 2期受講生の卒業制作を「オンライン展示」として公開し、**ずっと残す**。未来の受講生に「ここまで書けるようになる」を見せる。
- 作品締切 **2026-11-24**、公開 **2026-12-01**。
- **月額0円**。先生はエックスサーバー契約あり（ドメイン名は未確認）。
- 作品は **ゆゆさん**（サポート担当）が受講生のLINEノートから転記する。受講生側の提出方法は変えない。
- 1人1作品、動画なし、提出順、先生の事前確認なし。
- 名前はニックネーム表記。
- 1期の卒業制作は Gamma で公開済み（別物。今回は参照のみ）。

## 2. 全体の流れ

```
受講生 ─LINEノートに提出→ ゆゆさん ─Googleフォームに転記→ スプレッドシート + Drive（画像）
                                                                  │
                                       GitHub Actions（1日2回 + 手動） が読み取り
                                                                  │
                                                 静的サイトを生成 → GitHub Pages で公開
```

- 運用中、人の手が要るのは **ゆゆさんのフォーム入力だけ**。
- 修正はスプレッドシートのセルを直す → 次回ビルドで反映。急ぎは Actions の「Run workflow」で即時。

## 3. データ入口（Googleフォーム／スプレッドシート）

フォームは ZUMA の Google アカウントで作る。画像は ZUMA の Drive に貯まる。

### フォーム項目（＝シート列）

| 列 | 項目 | 必須 | 備考 |
|---|---|---|---|
| A | タイムスタンプ | 自動 | 提出順の並びに使う |
| B | ニックネーム | 必須 | |
| C | 作品名 | 必須 | |
| D | ひとこと | 任意 | 改行可 |
| E | 作品画像 | 必須 | ファイルアップロード（1枚、画像のみ、10MBまで） |
| F | Instagram | 任意 | URL または @ユーザー名。@始まりは URL に変換 |
| G | 講座・期 | 必須 | プルダウン。今回は「デジタル筆文字 2期」のみ |
| H | 掲載 | 手動 | シートに後から足す列。`×` を入れた行は非表示。空欄は掲載 |

### 共有設定（ビルドが読めるようにするため）

- スプレッドシート: 「リンクを知っている全員が閲覧可」。ビルドは `gviz/tq?tqx=out:csv&gid=…` で CSV 取得。
- フォーム画像フォルダ: 「リンクを知っている全員が閲覧可」。ビルドは `drive.google.com/uc?export=download&id=…` で取得。
- 秘密鍵・サービスアカウントは使わない（GitHub Secrets 不要）。

### 制約

- Googleフォームのファイルアップロードは **回答者が Google ログイン必須**。ゆゆさんに Google アカウントがあるか要確認。無い場合は「ゆゆさん→ZUMAさんにLINE→ZUMAさんがフォーム入力」に切り替える（仕組みは同じ）。

## 4. サイト仕様

### ページ構成（1ページ、スマホ優先、`lang="ja"`）

1. **ヒーロー**: 「デジタル筆文字作家養成講座 2期 卒業制作展」、公開日、作品数
2. **先生からのごあいさつ**: 先生に数行書いてもらう（設定ファイルに置く）
3. **作品ギャラリー**: 提出順。カード＝画像・作品名・ニックネーム・ひとこと・Instagramアイコン（ある人のみ）。タップで拡大（`<dialog>` によるライトボックス、前後移動あり）
4. **講座の紹介と次期への入口**: 講座説明（先生のHPから文面をもらう）＋ボタン: 公式LINE / ホームページ / Instagram
5. **フッター**: © 筆文字似顔絵師Hira、サポート: ZUMA

### デザイン

- 筆文字サポート室と同じトークンを使う: 和紙 `#FDF8F2`、墨 `#2B2620`、藍（実際は柿色）`#A85A16`、朱 `#B5453A`、罫 `#E6DACA`。
- フォント: 見出し **Yuji Syuku**、本文 **Zen Kaku Gothic New**（Google Fonts）。
- グリッド: スマホ1列 → 600px以上2列 → 1000px以上3列。
- 画像は正方形トリミングしない。元の縦横比のまま、カード幅に合わせる。
- OGP（タイトル・説明・代表画像）を設定。LINE で共有したときにカードが出るようにする。

### 画像処理（ビルド時）

- 長辺 1600px に縮小して WebP 化（ギャラリー用）。サムネイル 640px も生成。
- 元画像は公開しない（Drive 内に残るのみ）。
- 1枚でも取得失敗したらその作品はスキップし、ビルドログに警告。全体は止めない。

### 公開日の制御

- `publishAt: 2026-12-01T00:00:00+09:00` を設定ファイルに持つ。
- 公開前: `index.html` は「12月1日公開」の予告ページ。本番ページは `/preview-<ランダム文字列>/` に出力し、先生とゆゆさんに確認用として渡す。
- 公開後: `index.html` に本番ページ。preview パスも残す（害がないため）。
- Actions は毎日 **00:05 JST** と **12:00 JST** に実行（UTC cron: `5 15 * * *` と `0 3 * * *`）。12/1 00:05 の実行で自動的に本公開へ切り替わる。

### URL

- 当初: `https://inazuma-design.github.io/fudemoji-sotsugyo/`
- 最終: `https://sotsugyo.fudemojinigaoesihira.com/`（エックスサーバーの DNS に CNAME を1行追加。先生のドメイン確認後）
- 切替時は GitHub Pages のカスタムドメイン設定を行う。旧URLは自動で転送される。

## 5. コード構成

このリポジトリ（zuma）内の `fudemoji-sotsugyo/` に独立したプロジェクトとして置く。動作確認後に専用リポジトリ `inazuma-design/fudemoji-sotsugyo` へ移す（フォルダごと移すだけで動く構成にする）。

```
fudemoji-sotsugyo/
  package.json            # 依存: sharp のみ（Node 20）
  site.config.json        # 設定（下記）
  src/
    build.mjs             # エントリ: fetch → parse → images → render → write
    fetch.mjs             # CSV取得、Drive画像取得
    parse.mjs             # CSV行 → Work 型（検証・Instagram正規化・掲載フィルタ）
    images.mjs            # sharp で WebP 生成
    render.mjs            # HTML 文字列生成（テンプレートリテラル、エスケープ必須）
    publish.mjs           # 公開日判定、出力先の振り分け
  templates/
    styles.css            # デザイントークンとレイアウト
    lightbox.js           # ライトボックス（依存なし）
  test/                   # node:test
  dist/                   # 生成物（git 管理外）
  .github/workflows/      # ※リポジトリ直下に置く（後述）
```

### site.config.json

```json
{
  "term": "デジタル筆文字 2期",
  "title": "デジタル筆文字作家養成講座 2期 卒業制作展",
  "publishAt": "2026-12-01T00:00:00+09:00",
  "previewSlug": "preview-xxxxxxxx",
  "sheet": { "id": "...", "gid": "..." },
  "greeting": "（先生の文面）",
  "courseIntro": "（講座紹介の文面）",
  "links": {
    "line": "https://lin.ee/LUsnOJX",
    "homepage": "https://fudemojinigaoesihira.com/",
    "instagram": "https://www.instagram.com/hirac_han"
  },
  "baseUrl": "https://inazuma-design.github.io/fudemoji-sotsugyo/"
}
```

### Work 型

```ts
type Work = {
  id: string;            // Drive ファイルID（画像ファイル名にも使う）
  submittedAt: Date;
  nickname: string;
  title: string;
  comment: string;       // 空文字可
  instagramUrl: string | null;
  term: string;
};
```

### GitHub Actions（`.github/workflows/fudemoji-sotsugyo.yml`）

- トリガー: `schedule`（上記2回）、`workflow_dispatch`、`push`（`fudemoji-sotsugyo/**` 変更時）
- 手順: checkout → Node 20 → `npm ci` → `npm run build` → `actions/upload-pages-artifact`（`dist/`）→ `actions/deploy-pages`
- 専用リポジトリへ移した後も同じワークフローが動く（作業ディレクトリの指定だけ変える）。

## 6. エラー処理

| 事象 | 動作 |
|---|---|
| スプシの取得失敗 | ビルド失敗（前回の公開物が残る）。Actions が赤くなり ZUMA に通知 |
| 必須列が空の行 | その行をスキップし警告 |
| 画像の取得・変換失敗 | その作品をスキップし警告。他は公開 |
| 作品が0件 | 公開前なら予告ページのみ。公開後は「準備中」表示で失敗にしない |
| Instagram の形式不正 | リンクを出さない（作品は載せる） |

## 7. テスト

- `parse`: CSV → Work 変換、`掲載=×` の除外、`@name` → URL 変換、必須欠落のスキップ、提出順ソート
- `publish`: 公開前後で出力先が切り替わること（日時を注入して検証）
- `render`: HTML エスケープ（`<`、`&`、改行→`<br>`）、Instagram 無しでアイコン非表示、0件表示
- `images`: 小さな PNG から WebP が2サイズ生成されること
- 手動確認: 実データで `npm run build` → `dist/` をブラウザで確認（スマホ幅・ライトボックス・OGP）

## 8. 先生・ゆゆさんにお願いするもの

- 先生: ごあいさつ文（数行）、講座紹介の文面（HPから流用可）、エックスサーバーのドメイン名（後日でよい）
- ゆゆさん: Google アカウントの有無。フォームの使い方は1枚の手順書を渡す
- 受講生へのアナウンス（先生から）: 提出時に「作品名・ひとこと・Instagram（任意）」を添えてもらう

## 9. やらないこと

- 受講生向けアップロード窓口、ログイン、管理画面
- 複数作品・動画
- 1期作品の取り込み（Gamma のまま）
- エックスサーバーへの直接配置
