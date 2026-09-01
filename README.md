# GitHub Auto Viewed

GitHub の Pull Request の **Files changed** で、`test` や `spec` などのキーワードに一致するファイルを自動的に **Viewed** にして折りたたむ Chrome 拡張機能です。

ビルド不要。クローン（コピー）してそのまま読み込めます。

## インストール（開発者モード）

1. Chrome で `chrome://extensions` を開く
2. 右上の **デベロッパーモード** をオンにする
3. **パッケージ化されていない拡張機能を読み込む** をクリック
4. このディレクトリ（`manifest.json` がある階層）を選択

## 使い方

Pull Request の Files changed を開くと、キーワードに一致したファイルが自動で Viewed になり折りたたまれます。差分が遅延読み込みされても、追加読み込みのたびに処理されます。

ツールバーのアイコンをクリックすると、

- 現在のページの対象ファイル数
- キーワードごとの ON / OFF
- 有効・無効、自動実行、折りたたみの切り替え
- **今すぐ Viewed にする**（手動実行）

が使えます。処理した件数はアイコンのバッジに表示されます。

Viewed を外す操作は行いません（付けるだけの片方向）。すでに Viewed のファイルには触りません。

## キーワード

チェックの入ったキーワードだけが照合に使われます。**大文字小文字は既定で区別しません**。

| キーワード | 既定 | 一致する例 |
| --- | --- | --- |
| `test` | ON | `src/user.test.ts`, `src/__tests__/user.ts`, `UserTest.java` |
| `spec` | ON | `user.spec.tsx`, `spec/models/user_spec.rb` |
| `.spec` | ON | `user.spec.ts`, `Button.spec.tsx` |
| `/tests/` | OFF | `tests/e2e/login.ts`, `src/tests/login.ts` |
| `/__tests__/` | OFF | `src/__tests__/user.ts` |
| `__mocks__` | OFF | `src/__mocks__/api.ts` |
| `fixture` | OFF | `spec/fixtures/user.json` |
| `package-lock.json` `yarn.lock` `pnpm-lock.yaml` | OFF | 各ロックファイル |

設定画面の入力欄から自由なキーワードを追加でき、不要なキーワードは削除できます。ロックファイルや自動生成ファイル向けのキーワードは **プリセットを追加** からまとめて登録できます。

### スラッシュを含むキーワード

`/tests/` のようにスラッシュを含めると、ディレクトリを指定できます。照合するパスは常に先頭にスラッシュを付けた形（`/src/user.test.ts`）に正規化するため、`tests/e2e/login.ts` のようなリポジトリ直下のディレクトリにも一致します。

- `/tests/` → `tests/e2e/login.ts` ○ / `src/tests/login.ts` ○ / `src/latests/login.ts` ×
- スラッシュを含むキーワードは、照合対象を「ファイル名のみ」にしていても常にパス全体で照合されます（そうしないと絶対に一致しないため）

### その他の設定

| 項目 | 既定値 | 説明 |
| --- | --- | --- |
| キーワードの解釈 | 部分一致 | 部分一致 / 正規表現 |
| 照合する対象 | パス全体 | パス全体 / ファイル名のみ |
| 大文字小文字の区別 | しない | |
| 自動実行 | する | オフにすると手動実行のみ |
| 差分を閉じる | する | Viewed 後に開いたままなら閉じる |
| 連続クリックの間隔 | 120ms | ファイル数が多い PR で保存が追いつかない場合に増やす |

設定画面下部のプレビューで、任意のパスがどう判定されるか確認できます。

## GitHub Enterprise で使う場合

既定では `https://github.com/*` だけを対象にしています。GitHub Enterprise Server（自社ドメイン）で使うには、`manifest.json` の次の 3 か所を自社のドメインに書き換えてください（両方で使うなら両方を列挙します）。

```jsonc
"host_permissions": ["https://github.com/*", "https://github.example.co.jp/*"],
"content_scripts": [{ "matches": ["https://github.com/*/pull/*", "https://github.example.co.jp/*/pull/*"], ... }],
"web_accessible_resources": [{ "matches": ["https://github.com/*", "https://github.example.co.jp/*"], ... }]
```

## 社内で配布する

Chrome Web Store に **限定公開（Unlisted）** で登録して URL を共有します。手順と、ダッシュボードの各入力欄にそのまま貼れる記載内容は **[STORE_LISTING.md](STORE_LISTING.md)** にまとめてあります。

```bash
npm run pack     # github-auto-viewed.zip を作成（manifest.json / src / icons のみ）
```

この拡張機能は、権限が `storage` `activeTab` `scripting` と `https://github.com/*` のみで、外部サーバーへの通信・リモートコードの読み込み・データ収集をいずれも行いません。審査ではこの点（単一目的・権限の必要性・データ収集なし）をそのまま説明できます。

更新するときは `manifest.json` の `version` を上げてから `npm run pack` し、同じアイテムに新しい zip をアップロードします。

## 構成

```
manifest.json              Manifest V3 の定義
src/shared/               設定・照合ロジック（DOM 非依存）
  constants.js            既定値、プリセット、上限値
  keywords.js             キーワードの追加・削除・ON/OFF
  validation.js           storage 由来の値の検証・正規化
  settings.js             chrome.storage の読み書き
  matcher.js              パスとキーワードの照合
  messages.js             メッセージ種別と実行結果の型
  logger.js               エラー記録
src/content/              ページ側の処理
  bootstrap.js            content script のエントリ（動的 import で本体を起動）
  main.js                 設定・監視・メッセージ応答の取りまとめ
  selectors.js            GitHub の DOM セレクタ（変更時はここだけ直す）
  scanner.js              差分ファイルの収集
  file-entry.js           要素からパスと Viewed 切り替え要素を読む
  toggle-state.js         checkbox / role="checkbox" の状態差を吸収
  viewed-toggler.js       Viewed を付ける
  collapse.js             差分を閉じる
  runner.js               走査から折りたたみまでの一連の流れ
  observer.js             DOM 変更と SPA 遷移の監視
src/popup/                ツールバーのポップアップ
src/options/              設定画面
src/background/           service worker（バッジ表示）
tools/generate-icons.mjs  アイコン PNG の生成
tests/                    DOM 非依存ロジックのテスト
```

Manifest V3 の `content_scripts` は ES modules を直接読み込めないため、クラシックスクリプトの `bootstrap.js` から `main.js` を動的 import しています。そのため `web_accessible_resources` に `src/content/*.js` と `src/shared/*.js` を登録しています（拡張機能内のファイルの読み込みであり、外部からのリモートコード実行ではありません）。

## 開発

```bash
npm test          # DOM 非依存ロジックのテスト（node:test、依存パッケージなし）
npm run icons     # icons/*.png を再生成
npm run pack      # 配布用 zip を作成
```

拡張機能を更新したら `chrome://extensions` で再読み込みし、開いていた GitHub のタブもリロードしてください。

### GitHub の DOM 変更に追従する

GitHub は旧 UI（Rails 版）と新しい差分ビューが併存し、DOM 構造も URL も予告なく変わります（差分ページの URL は `/pull/<番号>/files` と `/pull/<番号>/changes` の 2 種類があり、両方に対応しています）。

走査は「ファイルパス起点 → Viewed ボタン起点 → ファイルの囲み起点」の 3 段構えで、どれか 1 つが通れば動きます。セレクタは `src/content/selectors.js` に集約しているので、動かなくなったときはこのファイルに候補を足すだけで対応できます。

参考として、新しい差分ビュー（`/changes`）の構造は 2026-09 時点で次のようになっています。クラス名は CSS Modules でハッシュ付きのため、接頭辞の部分一致で拾っています。

```
div.PullRequestDiffsList-module__diffEntry__xxxx           1 ファイル分
└ div.Diff-module__diffTargetable__xxxx Diff-module__diff__xxxx
  └ div.Diff-module__diffHeaderWrapper__xxxx
    └ div.DiffFileHeader-module__diff-file-header__xxxx
      ├ button[data-file-path="packages/.../foo.test.ts"]  ← パスはボタンの属性
      └ button.MarkAsViewedButton-module__iconOnly__xxxx   ← Viewed（aria-pressed / aria-label="Not Viewed"）
```

パスは Viewed ボタンの祖先ではなく別の枝にあるため、パス側を起点にして 1 ファイル分の囲みへ遡り、その中からボタンを探しています。またファイル名は表示上 `U+200E`（左書き記号）で囲まれているため、パスの読み取り時に不可視文字を除去しています。

動かないときの調べ方:

1. ツールバーのアイコンを開き、状態表示を見る
   - 「Pull Request の Files changed を開くと動作します」→ URL 判定で弾かれている（`FILES_PAGE_PATTERN`）
   - 「差分ファイルが見つかりません」→ Viewed の切り替え要素を DOM から見つけられていない
   - 「対象 n / m ファイル」→ 走査はできている。実行して結果を見る
2. DevTools のコンソールで `[GitHub Auto Viewed]` から始まるログを確認する
3. `tools/diagnose-dom.js` の内容を該当ページのコンソールに貼って実行すると、Viewed 要素の実際の属性とファイルパスの在処が JSON で出力されます（読み取りのみでページは変更しません）
