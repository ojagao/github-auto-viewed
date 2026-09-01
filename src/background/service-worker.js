import { logError } from '../shared/logger.js'
import { MESSAGES } from '../shared/messages.js'
import { loadSettings, saveSettings } from '../shared/settings.js'

/**
 * service worker。バッジ表示と設定画面の起動だけを担当する軽量な役割。
 */

const BADGE_COLOR = '#2da44e'

const setBadge = async (tabId, text) => {
  if (typeof tabId !== 'number') {
    return
  }

  try {
    await chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOR })
    await chrome.action.setBadgeText({ tabId, text })
  } catch (error) {
    // タブが既に閉じられている場合などは実害がないため記録のみ
    logError('バッジの更新に失敗しました', error)
  }
}

const initializeSettings = async () => {
  try {
    const settings = await loadSettings()
    await saveSettings(settings)
  } catch (error) {
    logError('初期設定の書き込みに失敗しました', error)
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void initializeSettings()
})

chrome.runtime.onMessage.addListener((message, sender) => {
  switch (message?.type) {
    case MESSAGES.REPORT_RESULT: {
      const marked = Number(message.payload?.marked ?? 0)
      void setBadge(sender.tab?.id, marked > 0 ? String(marked) : '')
      break
    }
    case MESSAGES.CLEAR_BADGE: {
      void setBadge(sender.tab?.id, '')
      break
    }
    case MESSAGES.OPEN_OPTIONS: {
      chrome.runtime.openOptionsPage()
      break
    }
    default:
      break
  }

  return false
})
