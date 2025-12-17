# Apprun of sacloud「Deploy application」Action

**SAKURA Cloud Apprun** にコンテナアプリを**登録 / デプロイ**します。
同名アプリが存在すれば **更新 (patch)**、無ければ **新規作成 (create)** します。

> ランタイム: Node.js 20（Actionが同梱）

---

## クイックスタート

```yaml
name: Deploy to Apprun
on:
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy
        id: apprun
        uses: sundaypeople/sakura-apprun-deploy@v0.0.1
        with:
          access_token: ${{ secrets.APPRUN_ACCESS_TOKEN }}
          access_secret: ${{ secrets.APPRUN_ACCESS_SECRET }}
          application_name: my-app
          image: registry.example.com/namespace/my-app:latest
          port: 8080
          min_scale: 0
          max_scale: 2

      - name: Show URL
        run: echo "URL = ${{ steps.apprun.outputs.public_url }}"
```

---

## すべての入力例

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Deploy to Apprun
        id: deploy
        uses: sundaypeople/sakura-apprun-deploy@v0.0.1
        with:
          # 認証（必須）
          access_token:  ${{ secrets.APPRUN_ACCESS_TOKEN }}
          access_secret: ${{ secrets.APPRUN_ACCESS_SECRET }}

          # アプリ識別
          application_name: example
          image: testnginx.sakuracr.jp/busy_server:v0.0.2

          # ポート / スケール
          port: 8080
          min_scale: 0
          max_scale: 2

          # コンポーネント名（省略時は application_name）
          components_name: example

          # レジストリ（プライベートの場合）
          container_registry_username: ${{ secrets.REGISTRY_USER }}
          container_registry_password: ${{ secrets.REGISTRY_PASS }}
          server: testnginx.sakuracr.jp

          # リソース上限
          max_cpu: "0.5"      # 文字列: "0.1"〜"1"
          max_memory: "512Mi" # 256Mi / 512Mi / 1Gi / 2Gi

          # タイムアウト（秒）
          timeout_seconds: 60

          # HTTP ヘルスチェック
          probe_path: /healthz
          probe_port: 8080
          # ヘッダは YAML マップで渡す
          probe_headers: |
            X-Env: "prod"
            X-Token: "${{ secrets.PROBE_TOKEN }}"

          # 環境変数（YAML マップ）
          env: |
            NODE_ENV: "production"
            LOG_LEVEL: "info"

      - name: Print URL
        run: echo "Public URL: ${{ steps.deploy.outputs.public_url }}"
```

---

## Inputs（入力）

| 名前                            |  必須 | 説明                                                   |
| ----------------------------- | :-: | ---------------------------------------------------- |
| `access_token`                |  ✔︎ | Apprun の API アクセストークン                                |
| `access_secret`               |  ✔︎ | Apprun の API アクセスシークレット                              |
| `application_name`            |  ✔︎ | アプリケーション名（作成/更新のキー）                                  |
| `image`                       |  ✔︎ | デプロイするコンテナイメージ（例: `registry.example.com/ns/app:tag`） |
| `port`                        |     | アプリがリッスンするポート番号                                      |
| `container_registry_username` |     | コンテナレジストリのユーザー名                                      |
| `container_registry_password` |     | コンテナレジストリのパスワード                                      |
| `min_scale`                   |     | 最小インスタンス数                                            |
| `max_scale`                   |     | 最大インスタンス数                                            |
| `components_name`             |     | コンポーネント名（省略時 `application_name`）                     |
| `server`                      |     | レジストリのサーバー名（省略時は `image` から自動抽出）                     |
| `max_cpu`                     |     | 最大 CPU（使用できるMemoryとの組み合わせ`"0.5-1Gi"`, `"1-1Gi"`, `"1-2Gi"`, `"2-2Gi"`,`"2-4Gi"`)                         |
| `max_memory`                  |     | 最大Memory（使用できるCPUとの組み合わせ`"0.5-1Gi"`, `"1-1Gi"`, `"1-2Gi"`, `"2-2Gi"`,`"2-4Gi"`)        |
| `timeout_seconds`             |     | アプリのタイムアウト（秒）                                        |
| `probe_path`                  |     | ヘルスチェックの HTTP パス                                     |
| `probe_port`                  |     | ヘルスチェックのポート番号                                        |
| `probe_headers`               |     | ヘルスチェックのヘッダ（YAML マップ: `Header-Name: "value"`）        |
| `env`                         |     | サービス環境変数（YAML マップ: `KEY: "value"`）                   |

> ℹ️ **YAML マップ入力について**
> `env` と `probe_headers` は YAML を **キー/値のマップ**で記述します。
> 例:
>
> ```yaml
> env: |
>   FOO: "bar"
>   LOG_LEVEL: "info"
> probe_headers: |
>   X-Env: "prod"
>   X-Token: "abc123"
> ```

---

## Outputs（出力）

| 名前           | 説明                |
| ------------ | ----------------- |
| `public_url` | デプロイされたアプリの公開 URL |

---

## 挙動・注意事項

* **作成 / 更新の判定**は `application_name` で行います。既存アプリがあれば patch、無ければ create。
* 数値入力（`port`, `min_scale`, `max_scale`, `timeout_seconds`, `probe_port`）は Action 側で**文字列→数値に変換**されるため、**数値として解釈可能な文字列**を渡してください。
* `server` を省略した場合は、`image` の先頭ホスト部（例: `registry.example.com`）が自動的に利用されます。
* HTTP プローブは **`probe_path` と `probe_port` の両方**が指定された場合のみ有効になります（どちらか一方だけだと無効）。

---

## ライセンス

Apache-2.0（リポジトリと同様）
