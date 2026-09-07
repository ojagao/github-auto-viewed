import { fromContainer, fromPathElement, fromToggle, looksLikeViewedToggle } from './file-entry.js'
import {
  FILE_ENTRY_SELECTORS,
  FILES_PAGE_PATTERN,
  PATH_HOLDER_SELECTOR,
  VIEWED_CANDIDATE_SELECTOR,
  VIEWED_TOGGLE_SELECTORS
} from './selectors.js'

/**
 * ページ全体からファイルエントリを収集する。
 *
 * GitHub は旧 UI と新しい差分ビューで DOM がまるごと違うため、3 通りの経路を順に試す。
 * 1. ファイルパス属性を起点に、1 ファイル分のコンテナへ遡って Viewed ボタンを探す（新旧どちらでも最も確実）
 * 2. Viewed の切り替え要素を起点に、祖先からパスを探す
 * 3. ファイルを包む要素を起点に、その中からパスとボタンを探す
 */

/** 現在の URL が Pull Request の差分ページかどうか。 */
export const isFilesPage = (pathname = location.pathname) => FILES_PAGE_PATTERN.test(pathname)

/** 差分へのアンカー（#diff-<ハッシュ>）。行番号が付くこともあるのでハッシュ部分だけを見る。 */
const DIFF_ANCHOR_PATTERN = /#diff-([0-9a-f]{16,})/i

/**
 * この Pull Request に含まれるファイル数を推定する。
 *
 * GitHub は差分を遅延読み込みするため、DOM にある差分の数だけでは全体像が分からない。
 * ファイル一覧のリンクは最初から全ファイル分あるため、その数を総数として扱う。
 * @returns {number} 判定できない場合は 0
 */
export const countKnownFiles = (root = document) => {
  const hashes = new Set()

  for (const anchor of root.querySelectorAll('a[href*="#diff-"]')) {
    const match = anchor.getAttribute('href')?.match(DIFF_ANCHOR_PATTERN)
    if (match) {
      hashes.add(match[1].toLowerCase())
    }
  }

  return hashes.size
}

/** 経路 1: パス属性を持つ要素から組み立てる。同じパスは 1 件にまとめる。 */
const collectFromPaths = (root) => {
  const byPath = new Map()

  for (const element of root.querySelectorAll(PATH_HOLDER_SELECTOR)) {
    const entry = fromPathElement(element)
    if (entry === null) {
      continue
    }

    // 同じパスが複数の要素から取れることがある（ファイル一覧のリンクと差分本体など）。
    // Viewed ボタンまで辿れた方を優先し、辿れない要素で上書きしない。
    const existing = byPath.get(entry.path)
    if (existing === undefined || (existing.toggle === null && entry.toggle !== null)) {
      byPath.set(entry.path, entry)
    }
  }

  return [...byPath.values()]
}

/** 経路 2: Viewed の切り替え要素を集める。 */
const collectToggles = (root) => {
  const toggles = new Set()

  for (const selector of VIEWED_TOGGLE_SELECTORS) {
    for (const element of root.querySelectorAll(selector)) {
      toggles.add(element)
    }
  }

  for (const candidate of root.querySelectorAll(VIEWED_CANDIDATE_SELECTOR)) {
    if (looksLikeViewedToggle(candidate)) {
      toggles.add(candidate)
    }
  }

  return [...toggles]
}

/** 経路 3: 差分ファイルを包む要素を集める。最初にヒットしたセレクタの結果だけを使う。 */
const collectFileElements = (root) => {
  for (const selector of FILE_ENTRY_SELECTORS) {
    const found = [...root.querySelectorAll(selector)]
    if (found.length > 0) {
      return found
    }
  }
  return []
}

/**
 * ファイルエントリの一覧を取得する。
 * @param {ParentNode} root
 * @returns {{element: Element, path: string, toggle: Element | null, viewed: boolean}[]}
 */
export const collectFileEntries = (root = document) => {
  const byPath = collectFromPaths(root)
  // ボタンまで辿れているなら、パスとボタンの対応が保証されるこの経路を使う
  if (byPath.some((entry) => entry.toggle !== null)) {
    return byPath
  }

  const byToggle = collectToggles(root)
    .map(fromToggle)
    .filter((entry) => entry !== null)
  if (byToggle.length > 0) {
    return byToggle
  }

  if (byPath.length > 0) {
    return byPath
  }

  return collectFileElements(root)
    .map(fromContainer)
    .filter((entry) => entry !== null)
}
