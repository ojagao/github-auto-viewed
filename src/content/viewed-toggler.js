import { logWarn } from '../shared/logger.js'
import { waitUntil } from './async-utils.js'
import { isChecked, isDisabled } from './toggle-state.js'

/**
 * Viewed の切り替え操作。DOM を変更するのはここと collapse.js だけ。
 */

const CONFIRM_TIMEOUT_MS = 2000
const CONFIRM_INTERVAL_MS = 50

export const MARK_STATUS = Object.freeze({
  MARKED: 'marked',
  /** クリックは実行したが、状態の変化を読み取れなかった */
  MARKED_UNCONFIRMED: 'marked-unconfirmed',
  ALREADY_VIEWED: 'already-viewed',
  NO_TOGGLE: 'no-toggle',
  DISABLED: 'disabled',
  FAILED: 'failed'
})

/** 状態を確認できなかっただけで、クリック自体は成功している扱いにするか。 */
export const isMarked = (status) =>
  status === MARK_STATUS.MARKED || status === MARK_STATUS.MARKED_UNCONFIRMED

/**
 * ファイルエントリを Viewed にする。
 * 既に Viewed の場合は解除しない（トグルではなく片方向の操作）。
 * @param {{toggle: Element | null, path: string}} entry
 * @returns {Promise<{status: string}>}
 */
export const markAsViewed = async (entry) => {
  const { toggle } = entry

  if (toggle === null) {
    return { status: MARK_STATUS.NO_TOGGLE }
  }
  if (isChecked(toggle)) {
    return { status: MARK_STATUS.ALREADY_VIEWED }
  }
  if (isDisabled(toggle)) {
    return { status: MARK_STATUS.DISABLED }
  }

  // GitHub 側のイベントハンドラを確実に起動させるためネイティブの click を使う
  toggle.click()

  const confirmed = await waitUntil(() => isChecked(toggle), {
    timeoutMs: CONFIRM_TIMEOUT_MS,
    intervalMs: CONFIRM_INTERVAL_MS
  })

  if (confirmed) {
    return { status: MARK_STATUS.MARKED }
  }

  // GitHub 側が状態を属性で表さない実装に変わっている可能性がある。
  // クリックは通っているため成功として数え、追跡できるよう記録だけ残す。
  logWarn(`Viewed の状態を確認できませんでした（クリックは実行済み）: ${entry.path}`)
  return { status: MARK_STATUS.MARKED_UNCONFIRMED }
}
