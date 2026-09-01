import { LIMITS } from './constants.js'

/**
 * キーワード（{ value, enabled }）を扱う純関数群。
 * 設定画面・ポップアップ・照合ロジックのどこからでも同じ規則で操作できるようにする。
 */

const createKeyword = (value, enabled = true) => ({
  value: value.trim().slice(0, LIMITS.MAX_KEYWORD_LENGTH),
  enabled
})

/** 大文字小文字を無視した比較キー。重複判定に使う。 */
export const toComparisonKey = (value) => value.trim().toLowerCase()

export const hasKeyword = (keywords, value) =>
  keywords.some((keyword) => toComparisonKey(keyword.value) === toComparisonKey(value))

/**
 * キーワードを追加した新しい配列を返す。
 * 既にある場合は追加せず、無効なら有効化する（同じ語を二重に持たせない）。
 */
export const addKeyword = (keywords, value) => {
  const normalized = createKeyword(value)

  if (normalized.value.length === 0) {
    return keywords
  }
  if (hasKeyword(keywords, normalized.value)) {
    return setKeywordEnabled(keywords, normalized.value, true)
  }
  if (keywords.length >= LIMITS.MAX_KEYWORDS) {
    return keywords
  }

  return [...keywords, normalized]
}

/** 複数のキーワードをまとめて追加する（プリセット用）。 */
export const addKeywords = (keywords, values) =>
  values.reduce((accumulated, value) => addKeyword(accumulated, value), keywords)

export const removeKeyword = (keywords, value) =>
  keywords.filter((keyword) => toComparisonKey(keyword.value) !== toComparisonKey(value))

export const setKeywordEnabled = (keywords, value, enabled) =>
  keywords.map((keyword) =>
    toComparisonKey(keyword.value) === toComparisonKey(value) ? { ...keyword, enabled } : keyword
  )

export const setAllEnabled = (keywords, enabled) =>
  keywords.map((keyword) => ({ ...keyword, enabled }))
