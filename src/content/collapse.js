import { delay } from './async-utils.js'
import { COLLAPSE_TOGGLE_SELECTORS, DIFF_BODY_SELECTORS } from './selectors.js'

/**
 * 差分の折りたたみ。
 *
 * GitHub は Viewed を付けた時点で自動的に折りたたむが、
 * ユーザー設定やレイアウトによっては開いたままになる。
 * 「開いていることを確認してからトグルする」ことで、逆に開いてしまう事故を避ける。
 */

const COLLAPSE_WAIT_MS = 350

/** 差分本体が画面上に描画されているか。 */
const isExpanded = (element) =>
  DIFF_BODY_SELECTORS.some((selector) => {
    const body = element.querySelector(selector)
    return body !== null && body.offsetParent !== null && body.getClientRects().length > 0
  })

const findToggle = (element) => {
  for (const selector of COLLAPSE_TOGGLE_SELECTORS) {
    const toggle = element.querySelector(selector)
    if (toggle !== null) {
      return toggle
    }
  }
  return null
}

/**
 * 開いていれば折りたたむ。
 * @param {Element} element ファイルエントリのラッパー要素
 * @returns {Promise<boolean>} 実際に折りたたみ操作を行ったか
 */
export const collapseIfExpanded = async (element) => {
  // GitHub 側の自動折りたたみが終わるのを待ってから状態を見る
  await delay(COLLAPSE_WAIT_MS)

  if (!isExpanded(element)) {
    return false
  }

  const toggle = findToggle(element)
  if (toggle === null) {
    return false
  }

  toggle.click()
  return true
}
