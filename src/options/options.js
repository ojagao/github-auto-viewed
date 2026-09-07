import { KEYWORD_PRESETS, MATCH_MODES } from '../shared/constants.js'
import {
  addKeyword,
  addKeywords,
  hasKeyword,
  removeKeyword,
  setAllEnabled,
  setKeywordEnabled
} from '../shared/keywords.js'
import { logError } from '../shared/logger.js'
import { loadSettings, resetSettings, saveSettings } from '../shared/settings.js'
import { findInvalidRegexKeywords } from '../shared/validation.js'
import { readRadio, writeRadio } from './form.js'
import { renderKeywordList } from './keyword-list.js'
import { DEFAULT_SAMPLES, evaluateSamples, toSampleText } from './preview.js'

const dom = {
  enabled: document.getElementById('enabled'),
  autoRun: document.getElementById('auto-run'),
  collapse: document.getElementById('collapse'),
  loadAllFiles: document.getElementById('load-all-files'),
  caseSensitive: document.getElementById('case-sensitive'),
  clickInterval: document.getElementById('click-interval'),
  addForm: document.getElementById('add-form'),
  keywordInput: document.getElementById('keyword-input'),
  addMessage: document.getElementById('add-message'),
  keywordList: document.getElementById('keyword-list'),
  enableAll: document.getElementById('enable-all'),
  disableAll: document.getElementById('disable-all'),
  keywordWarning: document.getElementById('keyword-warning'),
  presetButtons: document.getElementById('preset-buttons'),
  samples: document.getElementById('samples'),
  previewList: document.getElementById('preview-list'),
  reset: document.getElementById('reset'),
  status: document.getElementById('status')
}

/** 画面の状態はここだけが持つ。保存後の値で必ず差し替える。 */
let settings = null

const setStatus = (text, isError = false) => {
  dom.status.textContent = text
  dom.status.classList.toggle('status--error', isError)
}

const setAddMessage = (text, isError = false) => {
  dom.addMessage.textContent = text
  dom.addMessage.classList.toggle('hint-message--error', isError)
}

const readInputs = () => ({
  enabled: dom.enabled.checked,
  autoRun: dom.autoRun.checked,
  collapse: dom.collapse.checked,
  loadAllFiles: dom.loadAllFiles.checked,
  caseSensitive: dom.caseSensitive.checked,
  matchMode: readRadio('match-mode'),
  matchTarget: readRadio('match-target'),
  clickIntervalMs: Number(dom.clickInterval.value)
})

const renderWarning = () => {
  if (settings.matchMode !== MATCH_MODES.REGEX) {
    dom.keywordWarning.textContent = ''
    return
  }

  const invalid = findInvalidRegexKeywords(settings.keywords)
  dom.keywordWarning.textContent =
    invalid.length > 0 ? `正規表現として無効なため無視されます: ${invalid.join(' , ')}` : ''
}

const renderPreview = () => {
  const items = evaluateSamples(settings, dom.samples.value).map((result) => {
    const badge = document.createElement('span')
    badge.className = `preview__badge${result.matched ? ' preview__badge--hit' : ''}`
    badge.textContent = result.matched ? 'Viewed' : 'そのまま'

    const path = document.createElement('span')
    path.textContent = result.path

    const item = document.createElement('li')
    item.append(badge, path)

    if (result.keyword !== null) {
      const reason = document.createElement('span')
      reason.className = 'preview__reason'
      reason.textContent = `← ${result.keyword}`
      item.append(reason)
    }

    return item
  })

  dom.previewList.replaceChildren(...items)
}

const renderKeywords = () => {
  renderKeywordList(dom.keywordList, settings.keywords, {
    onToggle: (value, enabled) => {
      void persist({ keywords: setKeywordEnabled(settings.keywords, value, enabled) })
    },
    onRemove: (value) => {
      void persist({ keywords: removeKeyword(settings.keywords, value) })
    }
  })
}

const renderAll = () => {
  dom.enabled.checked = settings.enabled
  dom.autoRun.checked = settings.autoRun
  dom.collapse.checked = settings.collapse
  dom.loadAllFiles.checked = settings.loadAllFiles
  dom.caseSensitive.checked = settings.caseSensitive
  dom.clickInterval.value = String(settings.clickIntervalMs)
  writeRadio('match-mode', settings.matchMode)
  writeRadio('match-target', settings.matchTarget)
  renderKeywords()
  renderWarning()
  renderPreview()
}

/**
 * 差分を保存し、保存後の値で画面を作り直す。
 * @param {object} patch
 */
const persist = async (patch) => {
  try {
    settings = await saveSettings(patch)
    renderAll()
    setStatus('保存しました')
  } catch (error) {
    logError('設定の保存に失敗しました', error)
    setStatus(error.message, true)
  }
}

const handleInputChange = () => {
  void persist(readInputs())
}

const handleAdd = (event) => {
  event.preventDefault()

  const value = dom.keywordInput.value.trim()
  if (value.length === 0) {
    setAddMessage('キーワードを入力してください', true)
    return
  }
  if (hasKeyword(settings.keywords, value)) {
    setAddMessage(`「${value}」は既に登録されています`, true)
    return
  }

  dom.keywordInput.value = ''
  setAddMessage(`「${value}」を追加しました`)
  void persist({ keywords: addKeyword(settings.keywords, value) })
}

const renderPresetButtons = () => {
  const buttons = KEYWORD_PRESETS.map((preset) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'button button--small'
    button.textContent = preset.label
    button.addEventListener('click', () => {
      void persist({ keywords: addKeywords(settings.keywords, [...preset.values]) })
    })
    return button
  })

  dom.presetButtons.replaceChildren(...buttons)
}

const handleReset = async () => {
  try {
    settings = await resetSettings()
    renderAll()
    setStatus('既定値に戻しました')
  } catch (error) {
    logError('設定の初期化に失敗しました', error)
    setStatus(error.message, true)
  }
}

const initialize = async () => {
  settings = await loadSettings()
  dom.samples.value = toSampleText(DEFAULT_SAMPLES)
  renderPresetButtons()
  renderAll()

  const inputs = [
    dom.enabled,
    dom.autoRun,
    dom.collapse,
    dom.loadAllFiles,
    dom.caseSensitive,
    dom.clickInterval,
    ...document.querySelectorAll('input[name="match-mode"], input[name="match-target"]')
  ]
  inputs.forEach((input) => input.addEventListener('change', handleInputChange))

  dom.addForm.addEventListener('submit', handleAdd)
  dom.samples.addEventListener('input', renderPreview)
  dom.enableAll.addEventListener('click', () => {
    void persist({ keywords: setAllEnabled(settings.keywords, true) })
  })
  dom.disableAll.addEventListener('click', () => {
    void persist({ keywords: setAllEnabled(settings.keywords, false) })
  })
  dom.reset.addEventListener('click', () => {
    void handleReset()
  })
}

initialize().catch((error) => {
  logError('設定画面の初期化に失敗しました', error)
  setStatus('設定を読み込めませんでした。拡張機能を再読み込みしてください。', true)
})
