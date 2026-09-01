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

