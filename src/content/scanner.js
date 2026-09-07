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
 * GitHub は旧 UI と新しい差分ビューで DOM がまるごと違い、
 * ファイルの種類（テキスト / バイナリ / 大きすぎる差分など）でも構造が変わる。
 * そのため 2 つの経路の結果を統合し、どちらか一方でしか拾えないファイルも取りこぼさない。
 *
 * 1. ファイルパス属性を起点に、1 ファイル分の囲みへ遡って Viewed ボタンを探す
 * 2. Viewed ボタンを起点に、祖先からパスを探す
 *
 * どちらも空なら、最後の手段としてファイルの囲みを起点に走査する。
 */

/** 現在の URL が Pull Request の差分ページかどうか。 */
export const isFilesPage = (pathname = location.pathname) => FILES_PAGE_PATTERN.test(pathname)

/** 差分へのアンカー（#diff-<ハッシュ>）。行番号が付くこともあるのでハッシュ部分だけを見る。 */
const DIFF_ANCHOR_PATTERN = /#diff-([0-9a-f]{16,})/i

/**
 * この Pull Request に含まれるファイル数を推定する。
 * ファイル一覧のリンクは全ファイル分あるため、走査漏れの検知に使う。
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

/** 経路 1: パス属性を持つ要素から組み立てる。 */
const collectFromPaths = (root) =>
  [...root.querySelectorAll(PATH_HOLDER_SELECTOR)]
    .map(fromPathElement)
    .filter((entry) => entry !== null)

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

/** 最後の手段: 差分ファイルを包む要素を集める。最初にヒットしたセレクタの結果だけを使う。 */
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
 * 2 つの経路の結果を、ファイルごとに 1 件へまとめる収集器を作る。
 * 同じ Viewed ボタンを二重に扱わないことと、確実に取れたパスを優先することを保証する。
 */
const createCollector = () => {
  const byElement = new Map()
  const seenToggles = new Set()

  const add = (entry) => {
    if (entry === null) {
      return
    }

    // 同じボタンを 2 つのエントリで操作しないようにする
    if (entry.toggle !== null) {
      if (seenToggles.has(entry.toggle)) {
        return
      }
      seenToggles.add(entry.toggle)
    }

    const existing = byElement.get(entry.element)
    if (existing === undefined) {
      byElement.set(entry.element, entry)
      return
    }

    // 既にある方はパスが確実。ボタンだけを補う
    if (existing.toggle === null && entry.toggle !== null) {
      byElement.set(entry.element, {
        ...existing,
        toggle: entry.toggle,
        viewed: entry.viewed
      })
    }
  }

  return { add, entries: () => [...byElement.values()] }
}

/**
 * ファイルエントリの一覧を取得する。
 * @param {ParentNode} root
 * @returns {{element: Element, path: string, toggle: Element | null, viewed: boolean}[]}
 */
export const collectFileEntries = (root = document) => {
  const collector = createCollector()

  // パス起点を先に入れる（パスとボタンの対応が確実なため）
  for (const entry of collectFromPaths(root)) {
    collector.add(entry)
  }

  // ボタン起点で、パス属性を持たないファイルを補う
  for (const toggle of collectToggles(root)) {
    collector.add(fromToggle(toggle))
  }

  const entries = collector.entries()
  if (entries.length > 0) {
    return entries
  }

  return collectFileElements(root)
    .map(fromContainer)
    .filter((entry) => entry !== null)
}
