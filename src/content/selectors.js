/**
 * GitHub の Files changed 画面の DOM セレクタ定義。
 *
 * GitHub は旧 UI（Rails 版）と新 UI（React 版）が併存し、
 * さらに予告なく構造が変わるため、候補を優先順に並べて総当たりで解決する。
 * ここを直すだけで DOM 変更に追従できるよう、セレクタは全部このファイルに集約する。
 */

/** 1 ファイル分の差分を包む要素。先にマッチした候補だけを採用する。 */
export const FILE_ENTRY_SELECTORS = Object.freeze([
  'copilot-diff-entry[data-file-path]',
  '[data-testid="diff-file-wrapper"]',
  '.js-file[data-tagsearch-path]',
  '.file[data-tagsearch-path]',
  '.js-file'
])

/**
 * 1 ファイル分の差分全体（ヘッダー＋差分本体）を包む要素を closest() で探すためのセレクタ。
 *
 * 新しい差分ビューは CSS Modules を使っており、クラス名は
 * `PullRequestDiffsList-module__diffEntry__djnVa` のようにビルドごとのハッシュが付く。
 * ハッシュ部分は変わるが接頭辞は安定しているため、部分一致で拾う。
 */
export const FILE_CONTAINER_SELECTOR = [
  'copilot-diff-entry[data-file-path]',
  '[data-testid="diff-file-wrapper"]',
  '.js-file[data-tagsearch-path]',
  '.file[data-tagsearch-path]',
  '[class*="diffEntry"]',
  '[class*="diffTargetable"]',
  '.js-file',
  // パス属性はヘッダー内のボタンに付いていることがあるため、
  // closest() が囲みではなくその要素自身を返さないよう div に限定する
  'div[data-file-path]',
  'div[data-tagsearch-path]'
].join(',')

/** ファイルパスが入っている属性。要素自身 → 子孫の順に探す。 */
export const PATH_ATTRIBUTES = Object.freeze([
  'data-file-path',
  'data-tagsearch-path',
  'data-path'
])

/** パス属性を持つ子孫要素を探すためのセレクタ。 */
export const PATH_HOLDER_SELECTOR = PATH_ATTRIBUTES.map((name) => `[${name}]`).join(',')

/**
 * パス属性が見つからないときの手段。
 * title 属性を優先し、無ければテキストからパスらしい文字列を拾う。
 */
export const PATH_FALLBACK_SELECTORS = Object.freeze([
  '.file-info a[title]',
  'a[title][href*="#diff-"]',
  '[data-testid="file-header"] a[title]',
  '[data-testid="file-name"]',
  '[title*="/"]',
  'a[href*="#diff-"]',
  'h3 a',
  'h4 a'
])

/**
 * Viewed の切り替え要素。
 * 旧 UI は input[type=checkbox]、新しい差分ビューはアイコンボタン
 * （class="MarkAsViewedButton-module__..." + aria-pressed）で実装されている。
 */
export const VIEWED_TOGGLE_SELECTORS = Object.freeze([
  'button[class*="MarkAsViewedButton"]',
  'input.js-reviewed-checkbox',
  'input[type="checkbox"][data-testid="viewed-checkbox"]',
  'input[type="checkbox"][name="viewed"]',
  '[data-testid="viewed-checkbox"]',
  '[data-testid*="viewed" i]',
  '[role="checkbox"][aria-label*="viewed" i]',
  'button[aria-pressed][aria-label*="viewed" i]'
])

/**
 * 上のセレクタで見つからない場合に総当たりする候補。
 * チェックボックス以外に、トグルボタン（aria-pressed）やスイッチで
 * 実装されている場合も拾えるようにする。
 */
export const VIEWED_CANDIDATE_SELECTOR =
  'input[type="checkbox"], [role="checkbox"], [role="switch"], button[aria-pressed]'

/** 候補の中から Viewed を推定するためのラベル文字列。 */
export const VIEWED_LABEL_PATTERN = /viewed|表示済み|確認済み/i

/**
 * 1 ファイル分の差分本体。表示されているかどうかで開閉状態を判定する。
 * ページ全体を包む要素（[data-testid="diff-content"] など）は、
 * 1 ファイルのコンテナより外側にあるため意図せず拾うことはない。
 */
export const DIFF_BODY_SELECTORS = Object.freeze([
  '.js-file-content',
  '.js-diff-progressive-container',
  '.diff-table',
  '[class*="diffLines"]',
  '[class*="diffBody"]',
  '[class*="DiffLines"]',
  // 差分は表で描画されるため、1 ファイル分の囲みの中の table は差分本体と見なせる
  'table'
])

/** 差分の開閉トグル。誤って別のボタンを押さないよう、用途が明確なものに限る。 */
export const COLLAPSE_TOGGLE_SELECTORS = Object.freeze([
  'button.js-collapse-diff',
  'button[data-testid="collapse-button"]',
  'button[aria-label*="Toggle diff" i]',
  'button[aria-label*="Collapse file" i]',
  'button[aria-label*="collapse" i]',
  'button[class*="collapse" i]'
])

/**
 * Files changed ページかどうかの判定に使う URL パターン。
 * 旧 UI は /files、新しい差分ビューは /changes になる。
 */
export const FILES_PAGE_PATTERN = /^\/[^/]+\/[^/]+\/pull\/\d+\/(files|changes)(\/|$)/
