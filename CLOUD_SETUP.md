# SNS Analytics Cloud Setup

この構成は GitHub Actions で毎日フォロワー数を取得し、Supabase に保存し、GitHub Pages の静的画面で表示します。

## 1. Supabase

1. Supabase でプロジェクトを作成します。
2. SQL Editor で `supabase_schema.sql` を実行します。
3. Project Settings から以下を控えます。
   - Project URL
   - anon public key
   - service_role key

`service_role key` はGitHub Actionsの保存用です。ブラウザに出さないでください。

## 2. GitHub Secrets

対象リポジトリの Settings > Secrets and variables > Actions に以下を追加します。

```text
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

テーブル名を変えた場合だけ、追加で設定します。

```text
SUPABASE_TABLE=sns_follower_records
```

ローカルからまとめて設定する場合は、GitHub CLIでログインしたあとに `configure_cloud.ps1` を実行します。

```powershell
cd C:\Kita\webdocs\kitatani\app\sns-analytics
.\configure_cloud.ps1 `
  -SupabaseUrl "https://YOUR_PROJECT_ID.supabase.co" `
  -SupabaseAnonKey "YOUR_SUPABASE_ANON_KEY" `
  -SupabaseServiceRoleKey "YOUR_SERVICE_ROLE_KEY" `
  -GitHubRepo "OWNER/REPO"
```

## 3. GitHub Actions

`.github/workflows/sns-analytics-daily.yml` が毎日 00:05 JST に `cloud_daily_record.py` を実行します。

初回は Actions タブから `SNS Analytics Daily Record` を選び、`Run workflow` で手動実行してください。

## 4. GitHub Pages

`supabase-config.js` を次のように更新します。

```js
window.SNS_ANALYTICS_CONFIG = {
  supabaseUrl: "https://YOUR_PROJECT_ID.supabase.co",
  supabaseAnonKey: "YOUR_SUPABASE_ANON_KEY",
  table: "sns_follower_records"
};
```

GitHub Pages は、この `sns-analytics` フォルダを含む静的ファイルを公開してください。画面は Supabase から履歴を読み込むため、`data.json` がなくても表示できます。

## 注意

- GitHub Actions版は公開ページから取れるSNSを優先します。
- LINEなどログインが必要なSNSは、失敗行としてSupabaseに記録します。
- すべてのSNS取得に失敗した場合、Actionsは失敗終了します。
