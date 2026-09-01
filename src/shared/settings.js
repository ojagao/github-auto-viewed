import { DEFAULT_SETTINGS, STORAGE_AREA, STORAGE_KEY } from './constants.js'
import { logError } from './logger.js'
import { sanitizeSettings } from './validation.js'

/**
 * 設定の読み書き。呼び出し側には常に正規化済みのイミュータブルな値を返す。
 */

/** @returns {Promise<typeof DEFAULT_SETTINGS>} */
export const loadSettings = async () => {
  try {
    const stored = await chrome.storage[STORAGE_AREA].get(STORAGE_KEY)
    return sanitizeSettings(stored?.[STORAGE_KEY])
  } catch (error) {
    logError('設定の読み込みに失敗したため既定値で動作します', error)
    return sanitizeSettings(undefined)
  }
}

/**
 * 差分だけを渡して保存する。保存後の全体設定を返す。
 * @param {Partial<typeof DEFAULT_SETTINGS>} patch
 */
export const saveSettings = async (patch) => {
  const current = await loadSettings()
  const next = sanitizeSettings({ ...current, ...patch })

  try {
    await chrome.storage[STORAGE_AREA].set({ [STORAGE_KEY]: next })
    return next
  } catch (error) {
    logError('設定の保存に失敗しました', error)
    throw new Error('設定を保存できませんでした。同期容量の上限やパターン数を確認してください。')
  }
}

/** 既定値に戻す。 */
export const resetSettings = async () => {
  const next = sanitizeSettings(undefined)

  try {
    await chrome.storage[STORAGE_AREA].set({ [STORAGE_KEY]: next })
    return next
  } catch (error) {
    logError('設定の初期化に失敗しました', error)
    throw new Error('設定を初期化できませんでした。')
  }
}

/**
 * 設定変更を購読する。
 * @param {(settings: typeof DEFAULT_SETTINGS) => void} onChange
 * @returns {() => void} 購読解除関数
 */
export const watchSettings = (onChange) => {
  const listener = (changes, areaName) => {
    if (areaName !== STORAGE_AREA || !(STORAGE_KEY in changes)) {
      return
    }
    onChange(sanitizeSettings(changes[STORAGE_KEY].newValue))
  }

  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}
