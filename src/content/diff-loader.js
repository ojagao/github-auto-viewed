import { delay } from './async-utils.js'

/**
 * 遅延読み込みされる差分を DOM に載せるための走査。
 *
 * GitHub の差分ビューは画面に近づいたファイルだけを描画するため、
 * ページを開いた時点では一部のファイルしか DOM に存在しない。
 * 少しずつスクロールしながら、載った時点で処理してもらう形にすることで、
 * 画面外を DOM から外す実装（仮想化）でも取りこぼさない。
 */

const STEP_RATIO = 0.75
const WAIT_MS = 350
const MAX_STEPS = 80

const scrollTop = () => window.scrollY

const scrollLimit = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight)

const jumpTo = (top) => window.scrollTo({ top, behavior: 'instant' })

/**
 * ページの先頭から末尾まで少しずつスクロールし、各段階で onStep を呼ぶ。
 * 終了時は元のスクロール位置へ戻す。
 * @param {() => Promise<void>} onStep
 */
export const scanWhileScrolling = async (onStep) => {
  const originalTop = scrollTop()
  let top = 0
  let steps = 0

  try {
    while (steps < MAX_STEPS) {
      jumpTo(top)
      await delay(WAIT_MS)
      await onStep()

      // Viewed を付けて折りたたむとページ高が縮むため、上限は毎回読み直す
      const limit = scrollLimit()
      if (top >= limit) {
        break
      }

      top = Math.min(top + window.innerHeight * STEP_RATIO, limit)
      steps += 1
    }
  } finally {
    jumpTo(originalTop)
  }
}
