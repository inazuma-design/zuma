# 公開手順（ZUMA 向け）

ここに書いてある外部作業は、**まだ実施していません**。上から順に、人が行う必要があります。

## 1. Google フォームとスプレッドシート

ZUMA の Google アカウントで作ります。

1. Google フォームを新規作成。タイトル「デジタル筆文字 2期 卒業制作 登録フォーム」
2. 質問を次の順で追加（見出しの文字がそのままシートの列名になります）

   | 質問 | 種類 | 必須 |
   |---|---|---|
   | ニックネーム | 記述式（短文） | 必須 |
   | 作品名 | 記述式（短文） | 必須 |
   | ひとこと | 記述式（段落） | 任意 |
   | 作品画像 | ファイルのアップロード。「特定のファイル形式のみ許可」→ 画像。ファイル数 1。最大サイズ 10MB | 必須 |
   | Instagram | 記述式（短文） | 任意 |
   | 講座・期 | プルダウン。選択肢「デジタル筆文字 2期」 | 必須 |
3. 設定 → 「回答」→ スプレッドシートにリンク（新規作成）
4. できたスプレッドシートの URL から **ID**（`/d/` と `/edit` の間）と **gid**（`#gid=` の後ろ）を控える
5. シートの H〜J 列に見出し「表示順」「掲載」「作品ID」を手で追加する
6. フォームの「回答」タブ → フォルダのアイコンから、アップロード先の Drive フォルダを開き、場所を控える

注意: ファイルのアップロード質問を含むフォームは、回答者に Google ログインを要求します。ゆゆさんに Google アカウントがあるか先に確認してください。無ければ「ゆゆさん → ZUMA へ画像を転送 → ZUMA が入力」に切り替えます（サイト側の変更は不要）。

## 2. サービスアカウント（本番の推奨）

GitHub Actions が Google のデータを読み取り専用で取得するための「ロボット用アカウント」です。無料です。

1. https://console.cloud.google.com/ で新しいプロジェクトを作る（名前は任意。例 `fudemoji-sotsugyo`）
2. 「API とサービス」→「ライブラリ」で **Google Sheets API** と **Google Drive API** を有効化
3. 「IAM と管理」→「サービスアカウント」→ 作成。ロールは不要（何も付けない）
4. 作成したサービスアカウントの「キー」→「鍵を追加」→ JSON。ダウンロードされた JSON ファイルを保管する（**Git に入れない**）
5. サービスアカウントのメールアドレス（`xxx@xxx.iam.gserviceaccount.com`）を控える
6. **共有する**: スプレッドシートと、フォームのアップロード先フォルダ（親フォルダごと）を、このメールアドレスに「閲覧者」で共有する
7. **疎通確認**（必ず実データ 1 件で）:

   ```bash
   cd fudemoji-sotsugyo
   export GOOGLE_SERVICE_ACCOUNT_JSON="$(cat ~/Downloads/xxxx.json)"
   export FUDEMOJI_SHEET_ID=（控えた ID）
   export FUDEMOJI_SHEET_GID=（控えた gid）
   node src/build.mjs --source service-account --now 2026-12-01T00:05:00+09:00 --out /tmp/check
   ```
   `掲載 1 作品` と出て `/tmp/check/works/` に 1 件できれば成功です。フォームでアップロードされたファイルがサービスアカウントから読めることを、ここで確認します（フォルダ共有が子ファイルに継承されない場合は、該当ファイルを個別に共有するか、代替案へ）。

### 代替案: リンク公開 CSV（`public-csv`）

サービスアカウントが使えない場合の代替です。スプレッドシートを「リンクを知っている全員が閲覧可」にし、画像フォルダも同じ設定にします。**シートの全内容がリンクを知る人に見える**ことに ZUMA が同意した場合だけ使ってください。シートには公開してよい情報（ニックネーム・作品名・ひとこと・Instagram）しか入れない運用が前提です。Actions の `Run workflow` で `source` に `public-csv` を指定するか、ワークフローの既定値を変えます。

## 3. GitHub の設定

リポジトリの Settings で次を設定します。

| 場所 | 名前 | 値 |
|---|---|---|
| Secrets and variables → Actions → **Secrets** | `GOOGLE_SERVICE_ACCOUNT_JSON` | サービスアカウントの JSON ファイルの中身をそのまま貼る |
| Secrets and variables → Actions → **Variables** | `FUDEMOJI_SHEET_ID` | スプレッドシートの ID |
| 同上 | `FUDEMOJI_SHEET_GID` | 回答シートの gid |
| Pages → Build and deployment | Source | **GitHub Actions** |
| Actions → General → Workflow permissions | | Read and write は不要。ワークフロー内の `permissions` で `pages: write` と `id-token: write` を付けています |

`site.config.json` の `sheet.id` / `sheet.gid` に直接書いてもよいですが、Variables のほうが専用リポジトリへ移すときに楽です。

設定後、Actions → `fudemoji-sotsugyo` → **Run workflow** で手動実行し、緑になることと、`https://inazuma-design.github.io/fudemoji-sotsugyo/` に予告ページが出ることを確認します。

## 4. 公開前の確認（プレビュー）

公開前の作品を一般公開の Pages に置くことはしません。確認は次のどれかで行います。

- ZUMA のパソコンで `node src/build.mjs --source service-account --now 2026-12-01T00:05:00+09:00` を実行し、`npm run serve` で表示して画面共有で先生に見せる
- 同じ手順で `dist/` を ZIP にして先生に渡す（ブラウザで `index.html` を開ける。ただしリンクは相対ではないため作品ページへの遷移は `serve` 経由が確実）

確認する観点は [design-guide.md](design-guide.md) の末尾のチェックリストを使ってください。

## 5. 独自ドメイン（任意・後からでよい）

候補: `sotsugyo.fudemojinigaoesihira.com`。先生の承認と、**エックスサーバーの DNS 設定画面に入れる人**が必要です（サーバー契約があることと DNS を変更できることは別なので、先に確認）。

1. エックスサーバーのサーバーパネル → 「DNS レコード設定」→ 対象ドメイン → レコード追加
   - ホスト名: `sotsugyo` ／ 種別: `CNAME` ／ 内容: `inazuma-design.github.io`
2. GitHub の Settings → Pages → Custom domain に `sotsugyo.fudemojinigaoesihira.com` を入れて保存。DNS チェックが通るのを待ち、**Enforce HTTPS** にチェック（証明書の発行に最大 1 日）
3. `site.config.json` の `customDomain` に `sotsugyo.fudemojinigaoesihira.com` を入れて push（canonical・OGP・sitemap がこの URL になる）
4. 旧 URL `https://inazuma-design.github.io/fudemoji-sotsugyo/` は自動で新 URL に転送される

既存のホームページ（`fudemojinigaoesihira.com` 本体）には触れません。サブドメインのレコードを 1 行足すだけです。

## 6. 公開当日（2026-12-01）

定時実行（JST 00:05）は GitHub の混雑で数分〜数十分遅れることがあります。0 時ぴったりの公開は保証されません。

- [ ] 前日までに、全作品の画像・名前・作品名が揃っていることをローカルビルドで確認（警告 0 が理想）
- [ ] 前日までに、先生のごあいさつ・講座紹介・最終コピーを `site.config.json` に反映して push
- [ ] 00:05 の自動実行が緑になったか確認。遅れていれば **Run workflow** で手動実行
- [ ] トップページ・作品ページ・OGP（LINE に URL を貼ってカードが出るか）を実機で確認
- [ ] 先生に公開 URL を連絡

## 7. 失敗したとき

| 症状 | 見るところ |
|---|---|
| `アクセストークンの取得に失敗` | Secrets の JSON が壊れていないか（改行・引用符） |
| `HTTP 403` でシートが読めない | スプレッドシートをサービスアカウントに共有したか／Sheets API を有効化したか |
| 画像だけ `HTTP 404` / `403` | アップロード先フォルダ（とその子）がサービスアカウントに共有されているか |
| `gid=... のシートが見つかりません` | Variables の gid が回答シートのものか |
| 予告ページのまま変わらない | `publishAt` と実行時刻。ログの「判定時刻」を見る |

ビルドが失敗しても、前回の公開物はそのまま残ります。
