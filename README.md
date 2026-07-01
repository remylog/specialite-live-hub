# Specialite Live Hub

すぺしゃりての配信スケジュールやアーカイブ情報、タレントデータなどを管理・閲覧するためのシステムです。個人利用を想定し、セキュリティと運用のシンプルさを両立した設計になっています。

## 主な機能

### 1. スケジュール・アーカイブ管理
- 本日の配信スケジュール（ライブ中・予定・過去のアーカイブ）を時系列順にタイムライン表示します。
- スケジュール表示はCSS Gridを採用し、カードが崩れず綺麗に3列左寄せで整列されるデザインになっています。
- NTP（NICT）時刻同期により、端末ごとの時刻のズレを自動補正して正確な「NOW（現在時刻）」ラインを表示します。

### 2. タレント・所属グループ管理
- データベース上でタレントおよび所属グループの情報を登録・編集・削除できます。
- エクスポート・インポート機能を備えており、登録したすべてのデータをJSONファイルとして一括でバックアップ・復元できます。
- 登録者数やその推移といった不要な外部データを廃止し、シンプルに管理できるよう整理されています。

### 3. セキュリティと認証システム
- 管理API（タレント追加、削除、インポート・エクスポート、Discordテスト送信など）は認証プロキシ（proxy.ts）によって保護されています。
- 通常は管理者キー（x-admin-key）を用いた認証を行いますが、前段にCloudflare Accessなどの認証付きプロキシサーバーを設置する場合を想定し、環境変数による「管理者キー認証スキップ機能」を搭載しています。

---

## 技術スタック

- フロントエンド/バックエンド: Next.js (App Router / Turbopack / スタンドアロンビルド)
- データベース: PostgreSQL
- ORM: Prisma
- コンテナ環境: Docker / Docker Compose

---

## ディレクトリ構成

- src/app: Next.jsの画面およびAPIルート
- src/app/api: 管理API、ヘルスチェック、Discord送信テストなど
- src/proxy.ts: 管理APIを保護するための認証プロキシ（旧middleware.ts）
- prisma: データベーススキーマの定義（schema.prisma）
- docker-compose.yml: App、DB、Cronコンテナの定義
- entrypoint.sh: コンテナ起動時に自動で db push スキーマ同期を行うスクリプト

---

## 起動・環境構築手順

### 1. 環境変数の設定

プロジェクトのルートディレクトリに .env ファイルを作成し、以下の項目を設定します。

```env
HOLODEX_API_KEY=your_holodex_api_key
DISCORD_WEBHOOK_URL=your_discord_webhook_url
GEMINI_API_KEY=your_gemini_api_key
ADMIN_SECRET_KEY=your_admin_secret_key

# Cloudflare Access等の前段の認証で保護する場合に true を設定（管理者キーの入力が不要になります）
BYPASS_ADMIN_AUTH=true
NEXT_PUBLIC_BYPASS_ADMIN_AUTH=true
```

### 2. Dockerによる起動

Docker Composeを使用して、アプリケーションサーバー、データベース、定期実行用Cronの3つのコンテナをビルドしてバックグラウンドで起動します。

```sh
# コンテナのビルドと起動（スキーマの適用も自動で行われます）
docker compose up -d --build

# コンテナの停止
docker compose down
```

### 3. 動作確認

起動後、以下のヘルスチェックURLにアクセスして `status: ok` が返ってくることを確認してください。

```sh
curl http://localhost:3000/api/health
```

---

## 定期タスク (Cron)

docker-compose.yml 内の cron サービスによって、以下のバックグラウンド処理が定期実行されます。

- 毎時 4:00: すぺしゃりてメンバーの最新情報確認（現在はAPIダミー化につき空処理）
- 毎時 4:30: AIによるおすすめ推薦情報の自動生成
- 5分ごと: 配信開始・終了状態の自動チェックおよびDiscordへの通知送信

---

## バージョンアップ（アップデート）手順

システムを最新バージョンへ更新する際は、以下の手順を実行します。

### 1. データのバックアップ（推奨）
アップデート時の不具合に備え、事前にタレント管理画面の「エクスポート」ボタンから、タレント情報および所属グループ情報のJSONバックアップをダウンロードしておくことを推奨します。

### 2. 最新コードの取得
リポジトリの最新ソースコードを取得します。

```sh
git pull
```

### 3. コンテナの再ビルドと起動
コンテナを起動したまま新しいイメージをビルドし、ビルド完了後にコンテナを切り替えます（これによりサービス停止時間を最小限に抑えられます）。

```sh
docker compose up -d --build
```

コンテナ起動時に、entrypoint.sh 内の Prisma スキーマ同期処理（prisma db push）が自動的に走り、データベースのスキーマ構造も最新バージョンに自動で更新されます。

### 4. 起動ログの確認
コンテナが正常に起動し、データベースのスキーマ同期が成功しているかを確認します。

```sh
docker compose ps
docker compose logs -f app
```

ログに「Schema sync complete. Starting Next.js server...」と表示されていれば完了です。

### 5. 動作確認
ヘルスチェックAPIを呼び出して正常稼働しているかチェックしてください。

```sh
curl http://localhost:3000/api/health
```
