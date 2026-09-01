import { logError } from '../shared/logger.js'
import { createMatcher } from '../shared/matcher.js'
import { EMPTY_RESULT, MESSAGES } from '../shared/messages.js'
import { loadSettings, watchSettings } from '../shared/settings.js'
import { createDomWatcher, createUrlWatcher } from './observer.js'
import { createRunner } from './runner.js'
import { collectFileEntries, isFilesPage } from './scanner.js'

/**
 * content script 本体。設定・監視・メッセージ応答を束ねる。
 */

/** popup に見せるための現在ページの状況。 */
const buildStatus = (settings) => {
  if (!isFilesPage()) {
    return { onFilesPage: false, total: 0, matched: 0, pending: 0 }
  }

  const matcher = createMatcher(settings)
  const entries = collectFileEntries(document)
  const matchedEntries = entries.filter((entry) => matcher(entry.path).matched)

  return {
    onFilesPage: true,
    total: entries.length,
    matched: matchedEntries.length,
    pending: matchedEntries.filter((entry) => !entry.viewed).length
  }
}

const notifyBackground = (type, payload) => {
  // 受け取り手が居ない場合の reject は無害なので黙って捨てる
  chrome.runtime.sendMessage({ type, payload }).catch(() => undefined)
}

export const start = async () => {
  let settings = await loadSettings()
  const runner = createRunner()

  /**
   * @param {{force?: boolean}} options
   *   force=true は処理済みの記録を無視して再評価する。
   *   キーワードを変えた直後は、既に走査したファイルもやり直す必要がある。
   */
  const runAuto = async (options = {}) => {
    if (!settings.enabled || !settings.autoRun) {
      return
    }

    const result = await runner.run(settings, options)
    if (result.marked > 0) {
      notifyBackground(MESSAGES.REPORT_RESULT, result)
    }
  }

  const runManually = async () => {
    const result = await runner.run(settings, { force: true })
    if (result.marked > 0) {
      notifyBackground(MESSAGES.REPORT_RESULT, result)
    }
    return result
  }

  const domWatcher = createDomWatcher(() => {
    void runAuto()
  })

  const urlWatcher = createUrlWatcher(() => {
    notifyBackground(MESSAGES.CLEAR_BADGE)
    void runAuto()
  })

  watchSettings((next) => {
    settings = next
    void runAuto({ force: true })
  })

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === MESSAGES.RUN_NOW) {
      runManually()
        .then(sendResponse)
        .catch((error) => {
          logError('手動実行に失敗しました', error)
          sendResponse({ ...EMPTY_RESULT, error: '実行に失敗しました。ページを再読み込みしてください。' })
        })
      return true
    }

    if (message?.type === MESSAGES.GET_STATUS) {
      sendResponse(buildStatus(settings))
      return false
    }

    return false
  })

  notifyBackground(MESSAGES.CLEAR_BADGE)
  domWatcher.start()
  urlWatcher.start()
}
