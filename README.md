# ZUMA — ファンクラブ・会員サイト

FANTS のような「クリエイターが月額制ファンクラブを開設し、会員限定コンテンツを届ける」会員サイトの MVP です。

## 機能

**ファン向け**
- 会員登録 / ログイン
- ファンクラブ検索（キーワード・カテゴリ）
- プラン選択・入会・プラン変更・退会（退会後も期間終了日まで閲覧可）
- 会員限定投稿の閲覧（未加入時はぼかし表示＋加入導線）
- いいね・コメント
- タイムライン（加入中クラブの新着）、マイページ（加入状況・毎月の支払額）

**クリエイター向け（/dashboard）**
- ファンクラブ開設（URL・紹介文・カテゴリ・テーマカラー）
- 複数の料金プラン作成・募集停止
- 投稿作成・編集・削除、公開範囲を「全体公開 / ◯円以上のプラン限定」で指定
- 会員数・MRR・今月/累計売上・プラン別会員数・会員一覧

上位プランの会員は、それより安いプラン向けの投稿もすべて閲覧できます。

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

## 決済について

現在は**モック決済**です。入会時に `payments` へ記録し、期間終了時の継続課金は `processRenewals()`（`src/lib/queries.ts`）が
マイページ・ダッシュボード表示時に処理します。本番運用では以下に置き換えてください。

- `joinPlan`（`src/lib/actions.ts`）→ Stripe Checkout（subscription モード）へのリダイレクト
- `processRenewals` → Stripe Webhook（`invoice.paid` / `customer.subscription.deleted`）で `memberships` を更新
- 退会 → `cancel_at_period_end` の設定

## 今後の拡張候補

画像・動画投稿、会員証、ライブ配信、メール通知、クリエイターへの振込管理、管理者画面 など。
