/**
 * popup / content script / service worker 間でやり取りするメッセージの型。
 */
export const MESSAGES = Object.freeze({
  /** popup → content: 今すぐ走査して Viewed を付ける */
  RUN_NOW: 'run-now',
  /** popup → content: 現在のページ状態を取得する */
  GET_STATUS: 'get-status',
  /** content → service worker: 実行結果を通知（バッジ表示用） */
  REPORT_RESULT: 'report-result',
  /** content → service worker: バッジをクリアする */
  CLEAR_BADGE: 'clear-badge',
  /** popup → service worker: 設定画面を開く */
  OPEN_OPTIONS: 'open-options'
})

/** 空の実行結果。集計のたたき台として使う。 */
export const EMPTY_RESULT = Object.freeze({
  scanned: 0,
  matched: 0,
  marked: 0,
  alreadyViewed: 0,
  failed: 0,
  collapsed: 0,
  markedPaths: Object.freeze([]),
  /** 別の実行が進行中でスキップしたか */
  busy: false,
  /** 実行できなかった理由（正常時は null） */
  error: null
})

/**
 * 2 つの実行結果を合算した新しいオブジェクトを返す。
 * スクロールしながら数回に分けて処理するため、走査件数は合計ではなく最大値を採る
 * （同じファイルを何度も数えないようにする）。
 */
export const mergeResults = (left, right) => ({
  scanned: Math.max(left.scanned, right.scanned),
  matched: left.matched + right.matched,
  marked: left.marked + right.marked,
  alreadyViewed: left.alreadyViewed + right.alreadyViewed,
  failed: left.failed + right.failed,
  collapsed: left.collapsed + right.collapsed,
  markedPaths: [...left.markedPaths, ...right.markedPaths],
  busy: left.busy || right.busy,
  error: left.error ?? right.error
})

