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
        uses: sundaypeople/sakura-apprun-deploy@v0.0.8
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
        uses: sundaypeople/sakura-apprun-deploy@v0.0.8
        with:
          # 認証（必須）
          access_token:  ${{ secrets.APPRUN_ACCESS_TOKEN }}
          access_secret: ${{ secrets.APPRUN_ACCESS_SECRET }}

          # アプリ識別
          application_name: example
          image: testnginx.sakuracr.jp/busy_server:v0.0.2 # デプロイするコンテナイメージ
          server: testnginx.sakuracr.jp

          # レジストリ（プライベートの場合）
          container_registry_username: ${{ secrets.REGISTRY_USER }}
          container_registry_password: ${{ secrets.REGISTRY_PASS }}
          container_registry_action: 'new'

          # ポート / スケール
          port: 8080
          min_scale: 0
          max_scale: 2

          # コンポーネント名（省略時は application_name）
          components_name: example
         
          # リソース上限
          max_cpu: "0.5"     
          max_memory: "512Mi" 

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
          inherit_env: "false"
          env: |
            NODE_ENV: "production"
            LOG_LEVEL: "info"

          # packet filter
          packet_filter_enabled: true
          packet_filter_allowlist: |
            0.0.0.0/0
            1.1.1.1/32

      - name: Print URL
        run: echo "Public URL${{ steps.deploy.outputs.public_url }}"
```

---

## 認証方法

認証方法は 2 つあり、どちらか一方を指定します。

### サービスプリンシパル（推奨）

サービスプリンシパルでは、長期的な秘密である RSA 秘密鍵は利用者側に置いたままで、
実際に送信するのは有効期限 5 分の署名付きアサーションだけです。
これをさくらのクラウドのトークンエンドポイントに送り、有効期間 1 時間のアクセストークンと交換します。

事前にコントロールパネルで公開鍵を登録し、リソース ID と KID を控えてください。
詳細は[サービスプリンシパルのマニュアル](https://manual.sakura.ad.jp/cloud/controlpanel/service-principal.html)を参照してください。

```yaml
- uses: sundaypeople/sakura-apprun-deploy@v0.0.8
  with:
    service_principal_resource_id: ${{ secrets.SAKURACLOUD_SP_RESOURCE_ID }}
    service_principal_kid: ${{ secrets.SAKURACLOUD_SP_KID }}
    service_principal_private_key: ${{ secrets.SAKURACLOUD_SP_PRIVATE_KEY }}
    application_name: my-app
    image: registry.example.com/namespace/my-app:latest
```

* `service_principal_private_key` は PEM そのままでも、PEM を base64 で 1 行にエンコードしたものでも受け付けます。
* サービスプリンシパルの 3 つの入力は必ずまとめて指定してください。一部だけ指定した場合はエラーになります。
* 取得したアクセストークンは `setSecret` でマスクされ、ログには出力されません。

### API キー

```yaml
- uses: sundaypeople/sakura-apprun-deploy@v0.0.8
  with:
    access_token: ${{ secrets.APPRUN_ACCESS_TOKEN }}
    access_secret: ${{ secrets.APPRUN_ACCESS_SECRET }}
    application_name: my-app
    image: registry.example.com/namespace/my-app:latest
```

> ℹ️ 両方を指定した場合はサービスプリンシパルが優先され、`access_token` / `access_secret` は無視されます。

## Inputs（入力）

| 名前                         | 必須 | 説明                                                                           |
|----------------------------|:--:|------------------------------------------------------------------------------|
| `access_token`             | ※ | Apprun の API アクセストークン（サービスプリンシパル利用時は不要）                                      |
| `access_secret`            | ※ | Apprun の API アクセスシークレット（サービスプリンシパル利用時は不要）                                    |
| `service_principal_resource_id` | ※ | サービスプリンシパルのリソース ID（3 つまとめて指定）                                            |
| `service_principal_kid`    | ※ | 公開鍵登録時に払い出された鍵 ID（KID）                                                       |
| `service_principal_private_key` | ※ | サービスプリンシパルの RSA 秘密鍵（PEM、または PEM を base64 エンコードしたもの）                     |
| `application_name`         | ✔︎ | アプリケーション名（作成/更新のキー）                                                          |
| `port`                     |    | アプリがリッスンするポート番号                                                              |
| `image`                    | ✔︎ | デプロイするコンテナイメージ（例: `registry.example.com/ns/app:tag`）                         |
| `server`                   |    | レジストリのサーバー名（省略時は `image` から自動抽出、認証ありの場合は `image` から自動抽出。`keep`時は指定不可） |
| `container_registry_username` |    | コンテナレジストリのユーザー名                                                              |
| `container_registry_password` |    | コンテナレジストリのパスワード                                                              |
| `container_registry_action`   |    | コンテナレジストリの動作（`new`: 新規作成/更新, `keep`: 前回の設定を維持）                                 |
| `min_scale`                |    | 最小インスタンス数                                                                    |
| `max_scale`                |    | 最大インスタンス数                                                                    |
| `components_name`          |    | コンポーネント名（省略時 `application_name`）                                             |
| `max_cpu`                  |    | 最大 CPU（使用できるMemoryとの組み合わせ`"0.5-1Gi"`, `"1-1Gi"`, `"1-2Gi"`, `"2-2Gi"`,`"2-4Gi"`) |
| `max_memory`               |    | 最大Memory（使用できるCPUとの組み合わせ`"0.5-1Gi"`, `"1-1Gi"`, `"1-2Gi"`, `"2-2Gi"`,`"2-4Gi"`) |
| `timeout_seconds`          |    | アプリのタイムアウト（秒）                                                                |
| `probe_path`               |    | ヘルスチェックの HTTP パス                                                             |
| `probe_port`               |    | ヘルスチェックのポート番号                                                                |
| `probe_headers`            |    | ヘルスチェックのヘッダ（YAML マップ: `Header-Name: "value"`）                                |
| `env`                      | 　　| サービス環境変数（YAML マップ: `KEY: "value"`） |
| `inherit_env`              | 　　| 更新時にサービス環境変数を一つ前のから継承（true / false） |
| `packet_filter_enabled`    |    | パケットフィルターの有効化（true / false）                                                  |
| `packet_filter_allowlist`  |    | 許可する送信元 CIDR のリスト（改行区切り）                                                     |

> ℹ️ **※ の入力について**
> 認証に使うため、`access_token` + `access_secret` の組か、`service_principal_*` の 3 つの組の
> **どちらか一方**が必須です。詳しくは [認証方法](#認証方法) を参照してください。

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
