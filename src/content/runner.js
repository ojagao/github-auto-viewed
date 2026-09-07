import { createMatcher } from '../shared/matcher.js'
import { EMPTY_RESULT, mergeResults } from '../shared/messages.js'
import { logError, logWarn } from '../shared/logger.js'
import { delay } from './async-utils.js'
import { collapseIfExpanded } from './collapse.js'
import { scanWhileScrolling } from './diff-loader.js'
import { collectFileEntries, countKnownFiles, isFilesPage } from './scanner.js'
import { MARK_STATUS, isMarked, markAsViewed } from './viewed-toggler.js'

/**
 * 走査 → 照合 → Viewed 設定 → 折りたたみ、の一連の流れ。
 */

const RERUN_DELAY_MS = 400

const emptyResult = () => ({ ...EMPTY_RESULT, markedPaths: [] })

const applyStatus = (result, entry, status) => {
  if (isMarked(status)) {
    return {
      ...result,
      marked: result.marked + 1,
      markedPaths: [...result.markedPaths, entry.path]
    }
  }

  if (status === MARK_STATUS.ALREADY_VIEWED) {
    return { ...result, alreadyViewed: result.alreadyViewed + 1 }
  }

  return { ...result, failed: result.failed + 1 }
}

/** 今 DOM にあるファイルだけを処理する。 */
const processLoaded = async (settings, handled, force) => {
  const matcher = createMatcher(settings)
  const entries = collectFileEntries(document)
  const targets = entries.filter(
    (entry) => (force || !handled.has(entry.element)) && matcher(entry.path).matched
  )

  let result = { ...emptyResult(), scanned: entries.length, matched: targets.length }

  for (const entry of targets) {
    // 失敗しても同じ要素を延々と再試行しないよう、処理前に記録する
    handled.add(entry.element)

    const { status } = await markAsViewed(entry)
    result = applyStatus(result, entry, status)

    if (isMarked(status) && settings.collapse) {
      const collapsed = await collapseIfExpanded(entry.element)
      if (collapsed) {
        result = { ...result, collapsed: result.collapsed + 1 }
      }
    }

    if (settings.clickIntervalMs > 0) {
      await delay(settings.clickIntervalMs)
    }
  }

  return result
}

/** まだ DOM に載っていない差分がありそうか。 */
const hasUnloadedFiles = () => countKnownFiles(document) > collectFileEntries(document).length

const executeOnce = async (settings, handled, force, allowScroll) => {
  let result = await processLoaded(settings, handled, force)

  // 遅延読み込みされた差分は、スクロールして DOM に載せながら順に処理する
  if (settings.loadAllFiles && allowScroll && hasUnloadedFiles()) {
    await scanWhileScrolling(
      async () => {
        result = mergeResults(result, await processLoaded(settings, handled, false))
      },
      {
        countFiles: () => collectFileEntries(document).length,
        targetCount: countKnownFiles(document)
      }
    )
  }

  if (result.matched > 0 && result.marked === 0 && result.failed > 0) {
    logWarn(
      `キーワードに一致した ${result.matched} 件を Viewed にできませんでした。` +
        'Viewed ボタンを見つけられていない可能性があります（tools/diagnose-dom.js で確認できます）。',
      result
    )
  }

  return result
}

/**
 * 実行管理を持つランナーを作る。
 * 自分のクリックが DOM 変更を起こして再実行が連鎖するため、
 * 多重実行を禁止し、実行中に来た要求は 1 回だけ後追いで処理する。
 */
export const createRunner = () => {
  const handled = new WeakSet()
  let running = false
  let pendingSettings = null
  /** スクロール走査を済ませたページ。同じページで何度もスクロールしないための記録 */
  let scrolledPath = null

  const scheduleRerun = () => {
    if (pendingSettings === null) {
      return
    }
    const next = pendingSettings
    pendingSettings = null
    setTimeout(() => {
      void run(next)
    }, RERUN_DELAY_MS)
  }

  /**
   * @param {object} settings
   * @param {{force?: boolean}} options force=true で処理済み記録を無視し、スクロール走査もやり直す
   */
  const run = async (settings, { force = false } = {}) => {
    if (!isFilesPage()) {
      return { ...EMPTY_RESULT }
    }
    if (running) {
      pendingSettings = settings
      return { ...EMPTY_RESULT, busy: true }
    }

    running = true
    try {
      // 画面を動かす操作なので、1 ページにつき 1 回（手動実行なら毎回）に限る
      const allowScroll = force || scrolledPath !== location.pathname
      if (allowScroll) {
        scrolledPath = location.pathname
      }

      return await executeOnce(settings, handled, force, allowScroll)
    } catch (error) {
      logError('Viewed の自動設定に失敗しました', error)
      return { ...EMPTY_RESULT, error: 'ページの操作に失敗しました。再読み込みしてください。' }
    } finally {
      running = false
      scheduleRerun()
    }
  }

  return { run }
}
