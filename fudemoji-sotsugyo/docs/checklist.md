# 未確定事項と外部作業の一覧

最終更新: 2026-11-01。コードは完成していますが、次の項目は人が決める・行う必要があります。コード側では `site.config.json` の `_todo` と `.env.example` に同じ内容を残しています。

## Hira 先生に確認するもの

- [ ] メインコピー「筆文字は、もっと自由になれる。」ほか仮コピーの可否（`site.config.json` → `hero`、`galleryHeading`、`courseHeading`）
- [ ] ごあいさつの原稿（数行）。受領するまでセクションは出ません（`greeting`）
- [ ] 講座紹介の文面（`courseIntro`）。受領するまでリンクだけが出ます
- [ ] 公式 LINE の URL が `https://lin.ee/LUsnOJX`（メルマガ記載の「デジタル筆文字公式LINE」）でよいか
- [ ] 代表作品に使う画像と、その作者の許可（許可が出たら `representativeWorkId` に設定。それまでトップの OGP に作品画像は出ません）
- [ ] 「デジタル筆文字について」の紹介文（`digitalIntro`）と、ギャラリー見出し下の一文（`galleryLead`）の仮文面の可否
- [ ] 受講生への告知: ニックネーム・作品名・ひとこと・Instagram・作品ごとの URL を公開し、SNS で共有されることへの同意
- [ ] 独自ドメイン `sotsugyo.fudemojinigaoesihira.com` を使ってよいか。エックスサーバーの DNS を変更できる人は誰か
- [ ] セクションの順（作品 → ごあいさつ）でよいか

## ゆゆさんに確認するもの

- [ ] Google アカウントの有無（フォームの画像アップロードにログインが必要）
- [ ] フォームの入力を 1 件試してもらい、スマホで詰まる点がないか
- [ ] 画像の形式（HEIC は不可。JPEG/PNG）とサイズ（10MB まで）の案内が伝わるか
- [ ] 1 人 1 作品の重複に気づいたときの連絡先

## ZUMA が行う外部作業（[deployment.md](deployment.md) の順）

- [ ] Google フォームとスプレッドシートの作成、H〜J 列の追加
- [ ] Google Cloud プロジェクト、Sheets / Drive API の有効化、サービスアカウントと JSON 鍵
- [ ] スプレッドシートとアップロード先フォルダをサービスアカウントに共有
- [ ] 実データ 1 件での疎通確認（フォーム → ビルドまで）
- [ ] GitHub Secrets `GOOGLE_SERVICE_ACCOUNT_JSON`、Variables `FUDEMOJI_SHEET_ID` / `FUDEMOJI_SHEET_GID`
- [ ] GitHub Pages の Source を GitHub Actions に設定、手動実行で予告ページを確認
- [ ] （任意）専用リポジトリ `inazuma-design/fudemoji-sotsugyo` への移行
- [ ] （任意）独自ドメインの DNS と Custom domain、HTTPS
- [ ] 公開当日の手動実行と実機確認
- [ ] 掲載取り下げ依頼の窓口を決める

## コード側で未確定のまま残している値

| 場所 | 値 | 状態 |
|---|---|---|
| `site.config.json` → `sheet.id` / `sheet.gid` | `TODO` | フォーム作成後に設定（または GitHub Variables） |
| `site.config.json` → `hero.*` | 仮コピー | 先生の確認待ち |
| `site.config.json` → `digitalIntro` / `galleryLead` | 仮文面 | 先生の確認待ち |
| `site.config.json` → `representativeWorkId` | 空 | 作者の同意後に設定 |
| `site.config.json` → `greeting` / `courseIntro` | 空 | 原稿待ち。空の間は表示されない |
| `site.config.json` → `customDomain` | 空 | ドメイン確定後 |
| `.github/workflows/fudemoji-sotsugyo.yml` → `push.branches` | `main` | このリポジトリの既定ブランチ名に合わせる |

## 実装済み／未実装

実装済み: データ取得 3 方式、検証、slug、画像処理、トップ・作品ページ・予告ページ・sitemap・404、ライトボックス、共有ボタン、公開日判定、GitHub Actions、自動テスト 49 件、ダミーデータでのローカル確認。

未実装（仕様で対象外）: 受講生向けアップロード画面、ログイン・管理画面、動画・複数作品、1 期の取り込み、エックスサーバーへの直接配置、公開前の未認証プレビュー配信、いいね・ランキング。

人の確認が必要: 上記すべてのチェック項目。特に「サービスアカウントでフォームのアップロードファイルが読めるか」は実データで確認するまで断定できません（読めない場合は `public-csv` に切り替えるか、ファイルを個別共有します）。
