import { DEFAULT_SETTINGS, LIMITS, MATCH_MODES, MATCH_TARGETS } from './constants.js'
import { toComparisonKey } from './keywords.js'

/**
 * chrome.storage から読んだ値の検証。
 * 外部（別バージョンの拡張機能・手動編集）由来の値を信用せず、必ずここを通す。
 * バンドラを使わない構成のため zod は使わず、純関数の検証で代替している。
 */

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

const asBoolean = (value, fallback) => (typeof value === 'boolean' ? value : fallback)

const asOneOf = (value, allowed, fallback) => (allowed.includes(value) ? value : fallback)

const normalizeKeywordValue = (value) => value.trim().slice(0, LIMITS.MAX_KEYWORD_LENGTH)

/**
 * 1 件のキーワードを正規化する。
 * 旧バージョンが保存した文字列配列も読めるよう、文字列を受け付ける。
 */
const asKeyword = (raw) => {
  if (typeof raw === 'string') {
    const value = normalizeKeywordValue(raw)
    return value.length > 0 ? { value, enabled: true } : null
  }

  if (typeof raw !== 'object' || raw === null || typeof raw.value !== 'string') {
    return null
  }

  const value = normalizeKeywordValue(raw.value)
  if (value.length === 0) {
    return null
  }

  return { value, enabled: asBoolean(raw.enabled, true) }
}

const dedupeKeywords = (keywords) => {
  const seen = new Set()

  return keywords.filter((keyword) => {
    const key = toComparisonKey(keyword.value)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

const asKeywords = (value, fallback) => {
  if (!Array.isArray(value)) {
    return fallback.map((keyword) => ({ ...keyword }))
  }

  const normalized = value.map(asKeyword).filter((keyword) => keyword !== null)
  return dedupeKeywords(normalized).slice(0, LIMITS.MAX_KEYWORDS)
}

const asClickInterval = (value, fallback) => {
  const parsed = typeof value === 'string' ? Number(value) : value
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return clamp(Math.round(parsed), LIMITS.MIN_CLICK_INTERVAL_MS, LIMITS.MAX_CLICK_INTERVAL_MS)
}

/**
 * 任意の入力値を、欠損・不正値を既定値で埋めた設定オブジェクトに正規化する。
 * @param {unknown} raw
 * @returns {typeof DEFAULT_SETTINGS}
 */
export const sanitizeSettings = (raw) => {
  const source = typeof raw === 'object' && raw !== null ? raw : {}

  return {
    enabled: asBoolean(source.enabled, DEFAULT_SETTINGS.enabled),
    autoRun: asBoolean(source.autoRun, DEFAULT_SETTINGS.autoRun),
    collapse: asBoolean(source.collapse, DEFAULT_SETTINGS.collapse),
    caseSensitive: asBoolean(source.caseSensitive, DEFAULT_SETTINGS.caseSensitive),
    matchMode: asOneOf(source.matchMode, Object.values(MATCH_MODES), DEFAULT_SETTINGS.matchMode),
    matchTarget: asOneOf(
      source.matchTarget,
      Object.values(MATCH_TARGETS),
      DEFAULT_SETTINGS.matchTarget
    ),
    keywords: asKeywords(source.keywords, DEFAULT_SETTINGS.keywords),
    clickIntervalMs: asClickInterval(source.clickIntervalMs, DEFAULT_SETTINGS.clickIntervalMs)
  }
}

/**
 * 正規表現モードで使えないキーワードを洗い出す。設定画面での事前警告に使う。
 * @param {{value: string, enabled: boolean}[]} keywords
 * @returns {string[]} 不正なキーワードの一覧
 */
export const findInvalidRegexKeywords = (keywords) =>
  keywords
    .filter((keyword) => keyword.enabled)
    .filter((keyword) => {
      try {
        new RegExp(keyword.value)
        return false
      } catch {
        return true
      }
    })
    .map((keyword) => keyword.value)
