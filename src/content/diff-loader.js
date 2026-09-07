import { logWarn } from '../shared/logger.js'
import { delay } from './async-utils.js'

/**
 * 遅延読み込みされる差分を DOM に載せるための走査。
 *
 * GitHub の差分ビューは画面に近づいたファイルだけを描画するため、
 * ページを開いた時点では一部のファイルしか DOM に存在しない。
 * 少しずつスクロールしながら、載った時点で処理してもらう形にすることで、
 * 画面外を DOM から外す実装（仮想化）でも取りこぼさない。
 *
 * 読み込みは非同期なので、末尾に着いた時点では終わっていない。
 * 「末尾に居て、かつファイルが増えなくなった」ことを確認するまで粘る。
 */

const STEP_RATIO = 0.75
const WAIT_MS = 450
const MAX_STEPS = 150
/** 末尾でファイルが増えないのを何回まで許容するか（回数 × WAIT_MS だけ待つ） */
const STAGNANT_LIMIT = 6
/** 「さらに読み込む」系のボタン */
const LOAD_MORE_PATTERN = /load\s*(more|diff)|show\s*more|さらに|もっと/i

const scrollTop = () => window.scrollY

const scrollLimit = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight)

const jumpTo = (top) => window.scrollTo({ top, behavior: 'instant' })

/**
 * 差分リストが内部でスクロールしている場合に備え、スクロール可能な祖先を探す。
 * 見つからなければページ全体のスクロールだけを使う。
 */
const findScrollContainer = () => {
  let current = document.querySelector('[data-testid="progressive-diffs-list"]')?.parentElement ?? null

  while (current !== null && current !== document.body) {
    const { overflowY } = getComputedStyle(current)
    if (/(auto|scroll)/.test(overflowY) && current.scrollHeight > current.clientHeight + 16) {
      return current
    }
    current = current.parentElement
  }

  return null
}

/** 「さらに読み込む」ボタンが出ていればクリックする。 */
const clickLoadMore = () => {
  const button = [...document.querySelectorAll('button')].find(
    (candidate) =>
      candidate.offsetParent !== null && LOAD_MORE_PATTERN.test(candidate.textContent ?? '')
  )

  if (button === undefined) {
    return false
  }

  button.click()
  return true
}

/**
 * ページの先頭から末尾まで少しずつスクロールし、各段階で onStep を呼ぶ。
 * 終了時は元のスクロール位置へ戻す。
 *
 * @param {() => Promise<void>} onStep 現在 DOM にある差分を処理する
 * @param {{countFiles: () => number, targetCount: number}} options
 *   countFiles: 今 DOM にある差分の数 / targetCount: 全ファイル数（0 なら不明）
 */
export const scanWhileScrolling = async (onStep, { countFiles, targetCount }) => {
  const originalTop = scrollTop()
  const container = findScrollContainer()

  let top = 0
  let steps = 0
  let lastCount = -1
  let stagnant = 0

  try {
    while (steps < MAX_STEPS) {
      jumpTo(top)
      if (container !== null) {
        // 内部スクロールの場合も同じ割合まで送る
        const ratio = scrollLimit() === 0 ? 1 : top / scrollLimit()
        container.scrollTo({ top: container.scrollHeight * ratio, behavior: 'instant' })
      }

      await delay(WAIT_MS)

      // ある位置の処理が失敗しても、残りのファイルの走査は続ける
      try {
        await onStep()
      } catch (error) {
        logWarn('この位置の差分の処理に失敗しました。走査は続けます。', error)
      }

      const count = countFiles()
      if (targetCount > 0 && count >= targetCount) {
        break
      }

      // 折りたたみでページ高が縮むため、上限は毎回読み直す
      const limit = scrollLimit()
      const atBottom = top >= limit

      if (count === lastCount) {
        stagnant += 1
      } else {
        stagnant = 0
        lastCount = count
      }

      if (atBottom) {
        // 末尾に着いても読み込みは非同期で続く。増えなくなるまで待つ
        if (stagnant >= STAGNANT_LIMIT) {
          if (targetCount > 0 && count < targetCount) {
            logWarn(
              `差分を ${count} / ${targetCount} ファイルまでしか読み込めませんでした。` +
                '残りは画面をスクロールすると処理されます。'
            )
          }
          break
        }
        clickLoadMore()
      } else {
        top = Math.min(top + window.innerHeight * STEP_RATIO, limit)
      }

      steps += 1
    }
  } finally {
    jumpTo(originalTop)
  }
}
