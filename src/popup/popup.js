import { setKeywordEnabled } from '../shared/keywords.js'
import { logError, logWarn } from '../shared/logger.js'
import { MESSAGES } from '../shared/messages.js'
import { loadSettings, saveSettings } from '../shared/settings.js'
import { formatPageState, formatRunResult } from './format.js'
import { renderKeywordToggles } from './keyword-toggles.js'
import { getActiveTab, requestRun, requestStatus } from './tab-bridge.js'

const PULL_REQUEST_URL_PATTERN = /^https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/

const dom = {
  pageState: document.getElementById('page-state'),
  enabled: document.getElementById('enabled'),
  autoRun: document.getElementById('auto-run'),
  collapse: document.getElementById('collapse'),
  keywordList: document.getElementById('keyword-list'),
  runNow: document.getElementById('run-now'),
  result: document.getElementById('result'),
  openOptions: document.getElementById('open-options')
}

/** 画面の状態はここだけが持つ。 */
let settings = null
let activeTab = null

const setPageState = (text, isWarning = false) => {
  dom.pageState.textContent = text
  dom.pageState.classList.toggle('panel__state--warn', isWarning)
}

const setResult = (text, isError = false) => {
  dom.result.textContent = text
  dom.result.classList.toggle('result--error', isError)
}

const renderAll = () => {
  dom.enabled.checked = settings.enabled
  dom.autoRun.checked = settings.autoRun
  dom.collapse.checked = settings.collapse

  renderKeywordToggles(dom.keywordList, settings.keywords, (value, enabled) => {
    void persist({ keywords: setKeywordEnabled(settings.keywords, value, enabled) })
  })
}

const refreshPageState = async () => {
  if (activeTab === null || !PULL_REQUEST_URL_PATTERN.test(activeTab.url ?? '')) {
    setPageState('GitHub の Pull Request ページで開いてください', true)
    dom.runNow.disabled = true
    return
  }

  try {
    const status = await requestStatus(activeTab.id)
    setPageState(formatPageState(status))
    dom.runNow.disabled = !status.onFilesPage
  } catch (error) {
    // 拡張機能を再読み込みした直後などに起きる。ページのリロードで回復する
    logWarn('ページと通信できませんでした', error)
    setPageState('ページを再読み込みしてください（拡張機能の更新後は必要です）', true)
    dom.runNow.disabled = true
  }
}

/** 差分を保存し、保存後の値で画面を作り直す。 */
const persist = async (patch) => {
  try {
    settings = await saveSettings(patch)
    renderAll()
    await refreshPageState()
  } catch (error) {
    logError('設定の更新に失敗しました', error)
    setResult(error.message, true)
  }
}

const runNow = async () => {
  dom.runNow.disabled = true
  setResult('実行中…')

  try {
    const result = await requestRun(activeTab.id)
    setResult(formatRunResult(result), Boolean(result.error))
    await refreshPageState()
  } catch (error) {
    logWarn('ページと通信できませんでした', error)
    setResult('ページを再読み込みしてから、もう一度お試しください', true)
  } finally {
    dom.runNow.disabled = false
  }
}

const initialize = async () => {
  const [loaded, tab] = await Promise.all([loadSettings(), getActiveTab()])
  settings = loaded
  activeTab = tab

  renderAll()
  setResult('')

  dom.enabled.addEventListener('change', () => {
    void persist({ enabled: dom.enabled.checked })
  })
  dom.autoRun.addEventListener('change', () => {
    void persist({ autoRun: dom.autoRun.checked })
  })
  dom.collapse.addEventListener('change', () => {
    void persist({ collapse: dom.collapse.checked })
  })
  dom.runNow.addEventListener('click', () => {
    if (activeTab !== null) {
      void runNow()
    }
  })
  dom.openOptions.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: MESSAGES.OPEN_OPTIONS }).catch(() => {
      chrome.runtime.openOptionsPage()
    })
  })

  await refreshPageState()
}

initialize().catch((error) => {
  logError('ポップアップの初期化に失敗しました', error)
  setResult('初期化に失敗しました。拡張機能を再読み込みしてください。', true)
})
