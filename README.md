# ZUMA — ファンクラブ・会員サイト

FANTS のような「クリエイターが月額制ファンクラブを開設し、会員限定コンテンツを届ける」会員サイトの MVP です。

## 機能

**ファン向け**
- 会員登録 / ログイン、ファンクラブ検索（キーワード・カテゴリ）
- プラン入会・変更・退会（退会後も期間終了日まで閲覧可）、**無料体験期間**
- 会員限定の記事・**動画**（YouTube / Vimeo 埋め込み）、いいね・コメント
- **トークルーム**：テーマ別チャット（プランごとに参加範囲を設定、5秒ごとに自動更新）
- **イベント**：オンライン配信 / オフライン開催の参加登録・定員管理。配信URLは参加登録者にのみ表示
- **ショップ（EC）**：グッズ購入（会員限定商品・在庫管理）
- **応援ポイント・ファンランキング**、**デジタル会員証**（会員番号つき）
- タイムライン、マイページ（加入状況・参加予定イベント・購入履歴）

**クリエイター向け（/dashboard）**
- ファンクラブ開設・設定（URL・紹介文・カテゴリ・テーマカラー）
- 料金プラン作成（無料体験日数つき）・募集停止
- 投稿（記事＋動画URL）、トークルーム、イベント（参加者一覧）、商品・注文管理（発送ステータス）
- 会員数（うち無料体験）・MRR・今月/累計売上（会費＋ショップ）・プラン別会員数・会員一覧

公開範囲はすべて「全体公開 / ◯円以上のプラン限定」で指定し、上位プランの会員は下位プラン向けのコンテンツもすべて利用できます。

### ポイントの付与ルール

| 行動 | ポイント |
| --- | --- |
| 月額会費・ショップ購入 | 100円ごとに1pt |
| イベント参加登録 | 10pt（イベントごとに1回） |
| コメント | 5pt |
| トーク投稿 | 2pt |
| いいね | 1pt（投稿ごとに1回） |

## 技術構成

- Next.js 16（App Router / Server Actions）+ React 19 + TypeScript
- Tailwind CSS v4
- SQLite（better-sqlite3）— 初回起動時に `data/zuma.db` を作成しデモデータを投入
- 認証: scrypt でハッシュしたパスワード + DB 管理の HttpOnly セッション Cookie

## 起動

```bash
npm install
npm run dev
# http://localhost:3000
```

デモアカウント（パスワードはすべて `password`）

| メール | 役割 |
| --- | --- |
| fan@example.com | ファン |
| hana@example.com / ken@example.com / sora@example.com | クリエイター |

DB を初期化したいときは `data/` を削除して再起動してください。保存先は `DATABASE_PATH` で変更できます。
既存DBに後から追加した列は起動時に自動で追加されます（`src/lib/db.ts` の `COLUMN_MIGRATIONS`）。

## 決済について

現在は**モック決済**です。入会時に `payments` へ記録し、期間終了時の継続課金は `processRenewals()`（`src/lib/queries.ts`）が
マイページ・ダッシュボード表示時に処理します。本番運用では以下に置き換えてください。

- `joinPlan`（`src/lib/actions.ts`）→ Stripe Checkout（subscription モード、無料体験は `trial_period_days`）へのリダイレクト
- `purchaseProduct` → Stripe Checkout（payment モード）
- `processRenewals` → Stripe Webhook（`invoice.paid` / `customer.subscription.deleted`）で `memberships` を更新
- 退会 → `cancel_at_period_end` の設定

## 今後の拡張候補

画像アップロード、動画のファイルアップロード配信、WebSocket によるリアルタイムトーク、メール/プッシュ通知、ポイント交換特典、電子チケット（QR）、クリエイターへの振込管理、運営管理画面 など。
