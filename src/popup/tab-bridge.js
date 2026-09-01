import { MESSAGES } from '../shared/messages.js'

/**
 * popup から現在のタブの content script と通信する。
 * 拡張機能を入れた直後など content script が未注入のタブでも動くよう、
 * 送信に失敗したら 1 度だけ注入してから再送する。
 */

const CONTENT_SCRIPT_FILE = 'src/content/bootstrap.js'

export const getActiveTab = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  return tab ?? null
}

const sendMessage = async (tabId, message) => {
  try {
    return await chrome.tabs.sendMessage(tabId, message)
  } catch {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: [CONTENT_SCRIPT_FILE]
    })
    return await chrome.tabs.sendMessage(tabId, message)
  }
}

/** @returns {Promise<{onFilesPage: boolean, total: number, matched: number, pending: number}>} */
export const requestStatus = (tabId) => sendMessage(tabId, { type: MESSAGES.GET_STATUS })

/** @returns {Promise<import('../shared/messages.js').EMPTY_RESULT>} */
export const requestRun = (tabId) => sendMessage(tabId, { type: MESSAGES.RUN_NOW })
