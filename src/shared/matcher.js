import { MATCH_MODES, MATCH_TARGETS } from './constants.js'
import { logWarn } from './logger.js'

/**
 * ファイルパスとキーワードの照合。DOM に依存しない純粋なロジック。
 *
 * 照合するパスは常に先頭にスラッシュを付けた形（/src/user.test.ts）に正規化する。
 * こうすることで `/tests/` のようなディレクトリ指定のキーワードが、
 * リポジトリ直下（tests/user.ts）でも期待どおり一致する。
 */

const toNormalizedPath = (path) => (path.startsWith('/') ? path : `/${path}`)

const toFileName = (path) => {
  const segments = path.split('/')
  return segments[segments.length - 1] ?? path
}

/**
 * キーワードが `/` を含む場合は、照合対象の設定に関わらずパス全体を見る。
 * `/tests/` のような指定をファイル名だけに当てると絶対に一致しないため。
 */
const pickTarget = (path, keywordValue, matchTarget) => {
  const usesFullPath = matchTarget === MATCH_TARGETS.PATH || keywordValue.includes('/')
  return usesFullPath ? toNormalizedPath(path) : toFileName(path)
}

const buildRegexTest = (value, caseSensitive) => {
  try {
    const regex = new RegExp(value, caseSensitive ? '' : 'i')
    return (target) => regex.test(target)
  } catch (error) {
    logWarn(`正規表現として解釈できないキーワードを無視しました: ${value}`, error)
    return null
  }
}

const buildSubstringTest = (value, caseSensitive) => {
  const needle = caseSensitive ? value : value.toLowerCase()
  return (target) => (caseSensitive ? target : target.toLowerCase()).includes(needle)
}

/**
 * 有効なキーワードだけを判定関数に変換する。
 * @param {{keywords: {value: string, enabled: boolean}[], matchMode: string, caseSensitive: boolean, matchTarget: string}} settings
 */
const compileKeywords = ({ keywords, matchMode, caseSensitive, matchTarget }) =>
  keywords
    .filter((keyword) => keyword.enabled)
    .map(({ value }) => ({
      value,
      test:
        matchMode === MATCH_MODES.REGEX
          ? buildRegexTest(value, caseSensitive)
          : buildSubstringTest(value, caseSensitive),
      pickTarget: (path) => pickTarget(path, value, matchTarget)
    }))
    .filter(({ test }) => test !== null)

/**
 * パスを受け取り、最初に一致したキーワードを返す判定関数を作る。
 * @returns {(path: string) => {matched: boolean, keyword: string | null}}
 */
export const createMatcher = (settings) => {
  const compiled = compileKeywords(settings)

  return (path) => {
    if (typeof path !== 'string' || path.length === 0 || compiled.length === 0) {
      return { matched: false, keyword: null }
    }

    const hit = compiled.find((entry) => entry.test(entry.pickTarget(path)))

    return hit ? { matched: true, keyword: hit.value } : { matched: false, keyword: null }
  }
}
