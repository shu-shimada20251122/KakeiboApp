**家計簿アプリ（ローカル保存 + Gmail取り込み）** https://shu-shimada20251122.github.io/KakeiboApp/

- アプリ概要  
  - ブラウザだけで動く家計簿。データは各自のブラウザの localStorage に保存。  
  - 手入力＋カテゴリ別/週・月ビューのグラフ表示。  
  - Gmail通知をApps Script経由で取り込める（各ユーザーが自分のApps Scriptを用意）。  
  
- 主な機能  
  - 入力：日付・金額・カテゴリ・メモの追加、行内編集・削除。  
  - 表示：月/週切替、フィルタ、サマリ、カテゴリ円グラフ、積み上げ棒グラフ。  
  - カテゴリ管理：ユーザーがカテゴリを追加可能。  
  - Gmail取り込み：Apps ScriptからJSONPで受信してローカルに追記。  
  
- 動作環境  
  - PCブラウザ（Chrome推奨）。スマホは簡易表示。  
  - サーバ不要。index.html をブラウザで開くだけで動きます。  
  - 使い方（ローカル）  
  - 本リポをcloneまたはDownload ZIPで取得。  
  - index.html をブラウザで開く（VSCodeならLive ServerでもOK）。  
  - 入力フォームからデータを追加すると localStorage に保存され、一覧・グラフに反映。  

- Gmail連携（各自でApps Scriptを作成）  
  - https://script.google.com/ で新規プロジェクトを作成し、Code.gs を貼り付け。（任意）ALLOW_EMAILS や ACCESS_TOKEN を設定してアクセス制限。  
  - メニュー「デプロイ」→「新しいデプロイ」→ 種類「ウェブアプリ」→ 実行するユーザー「自分」→ アクセス「全員（匿名）」でデプロイ。  
  - 発行されたURLをコピーし、ブラウザのアプリ画面「連携」欄のURL入力に貼って「URLを保存」→「Gmailから取り込む」ボタンを押す。  
  - 取り込みに成功すると、メールから抽出したレコードがローカルの一覧とグラフに追加されます。  
  
- データの保存先と注意  
  - 家計簿データ、カテゴリ、連携URL、最終取り込み日時はブラウザの localStorage に保存され、端末/ブラウザごとに独立します。  
  - Apps Scriptを「全員（匿名）」で公開すると、URLが漏れるとGmailを読まれるので注意。必要なら ALLOW_EMAILS や ACCESS_TOKEN で制限してください。  

- フォルダ構成  
  - index.html … 画面レイアウト  
  - style.css … 見た目  
  - main.js … ロジック（入力、表示、グラフ、連携）  
  - Code.gs … Gmail取り込み用Apps Script  
