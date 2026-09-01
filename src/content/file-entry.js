import {
  FILE_CONTAINER_SELECTOR,
  PATH_ATTRIBUTES,
  PATH_FALLBACK_SELECTORS,
  PATH_HOLDER_SELECTOR,
  VIEWED_CANDIDATE_SELECTOR,
  VIEWED_LABEL_PATTERN,
  VIEWED_TOGGLE_SELECTORS
} from './selectors.js'
import { isChecked } from './toggle-state.js'

/**
 * DOM 要素を「ファイルエントリ」に読み替える層。
 * DOM は読むだけで、ここでは一切変更しない。
 */

/** 祖先を遡る深さの上限。無限に遡ってページ全体を掴まないための歯止め。 */
const MAX_ANCESTOR_DEPTH = 12

/**
 * 双方向制御文字とゼロ幅文字を取り除く。
 * 新しい差分ビューはファイル名を U+200E（左書き記号）で囲んで描画するため、
 * 取り除かないと正規表現の行末指定などが一致しなくなる。
 */
const INVISIBLE_CHARACTERS = /[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g

const normalizePath = (value) => value.replace(INVISIBLE_CHARACTERS, '').trim()

const readPathAttribute = (element) => {
  for (const name of PATH_ATTRIBUTES) {
    const value = element.getAttribute(name)
    if (value) {
      const normalized = normalizePath(value)
      if (normalized) {
        return normalized
      }
    }
  }
  return ''
}

/**
 * ファイルパスとして使えそうな文字列か。
 * ヘッダーのテキストから拾うため、説明文やラベルを誤って掴まないようにする。
 */
const looksLikePath = (value) =>
  value.length > 0 &&
  value.length < 400 &&
  !/\s/.test(value) &&
  (value.includes('/') || /\.[A-Za-z0-9]+$/.test(value))

const readPathFromFallback = (element) => {
  for (const selector of PATH_FALLBACK_SELECTORS) {
    const node = element.querySelector(selector)
    if (node === null) {
      continue
    }

    // 新しい差分ビューはパスをディレクトリとファイル名に分けて描画するため、
    // title 属性が無い場合はテキストの空白を詰めて 1 本のパスに戻す。
    const candidates = [
      normalizePath(node.getAttribute('title') ?? ''),
      normalizePath((node.textContent ?? '').replace(/\s+/g, ''))
    ]

    const value = candidates.find(looksLikePath)
    if (value !== undefined) {
      return value
    }
  }

  return ''
}

/**
 * 要素からファイルパスを取り出す。取得できなければ空文字。
 * @param {Element} element
 * @returns {string}
 */
const readFilePath = (element) => {
  const own = readPathAttribute(element)
  if (own) {
    return own
  }

  const holder = element.querySelector(PATH_HOLDER_SELECTOR)
  if (holder) {
    const nested = readPathAttribute(holder)
    if (nested) {
      return nested
    }
  }

  return readPathFromFallback(element)
}

/**
 * Viewed かどうかを判断するための手がかりを集める。
 * 新しい差分ビューのボタンはクラス名（MarkAsViewedButton-module__...）が
 * 最も確実な手がかりになるため、クラス名と data-testid も対象に含める。
 */
const readLabelTexts = (candidate) => {
  const ownerLabel = candidate.closest('label')?.textContent ?? ''
  const linkedLabel = candidate.id
    ? (document.querySelector(`label[for="${CSS.escape(candidate.id)}"]`)?.textContent ?? '')
    : ''

  return [
    candidate.getAttribute('aria-label') ?? '',
    candidate.getAttribute('title') ?? '',
    candidate.getAttribute('data-testid') ?? '',
    typeof candidate.className === 'string' ? candidate.className : '',
    ownerLabel,
    linkedLabel
  ].join(' ')
}

/** ラベルの文言から Viewed の切り替え要素だと判断できるか。 */
export const looksLikeViewedToggle = (candidate) =>
  VIEWED_LABEL_PATTERN.test(readLabelTexts(candidate))

const findToggleByLabel = (element) =>
  [...element.querySelectorAll(VIEWED_CANDIDATE_SELECTOR)].find(looksLikeViewedToggle) ?? null

/**
 * Viewed の切り替え要素を探す。
 * @param {Element} element
 * @returns {Element | null}
 */
const findViewedToggle = (element) => {
  for (const selector of VIEWED_TOGGLE_SELECTORS) {
    const found = element.querySelector(selector)
    if (found !== null) {
      return found
    }
  }

  return findToggleByLabel(element)
}

/**
 * 祖先を遡りながらファイルパスを探す。
 * DOM の階層が変わっても動くよう、特定の構造を前提にしない。
 * @returns {{container: Element | null, path: string}}
 */
const findPathFromAncestors = (element) => {
  let current = element.parentElement
  let depth = 0

  while (current !== null && current.tagName !== 'BODY' && depth < MAX_ANCESTOR_DEPTH) {
    const path = readFilePath(current)
    if (path) {
      return { container: current, path }
    }
    current = current.parentElement
    depth += 1
  }

  return { container: null, path: '' }
}

/**
 * ファイルパスを持つ要素からファイルエントリを組み立てる。
 *
 * 新しい差分ビューでは Viewed ボタンの祖先にパス属性が無く、パスは別の枝にあるため、
 * パス側を起点にして 1 ファイル分のコンテナへ遡り、その中からボタンを探すのが確実。
 * @param {Element} element
 * @returns {{element: Element, path: string, toggle: Element | null, viewed: boolean} | null}
 */
export const fromPathElement = (element) => {
  const path = readPathAttribute(element)
  if (!path) {
    return null
  }

  // 囲みの候補を内側から外側へ辿り、Viewed ボタンを含むものを採用する。
  // FILE_CONTAINER_SELECTOR は 1 ファイル分の囲みしか拾わないため、
  // 遡っても他のファイルのボタンを掴むことはない。
  let container = element.closest(FILE_CONTAINER_SELECTOR) ?? element
  let toggle = findViewedToggle(container)
  let depth = 0

  while (toggle === null && depth < MAX_ANCESTOR_DEPTH) {
    const outer = container.parentElement?.closest(FILE_CONTAINER_SELECTOR) ?? null
    if (outer === null || outer === container) {
      break
    }
    container = outer
    toggle = findViewedToggle(container)
    depth += 1
  }

  return {
    element: container,
    path,
    toggle,
    viewed: toggle !== null && isChecked(toggle)
  }
}

/**
 * Viewed の切り替え要素からファイルエントリを組み立てる（パス起点で取れなかった場合）。
 * @param {Element} toggle
 * @returns {{element: Element, path: string, toggle: Element, viewed: boolean} | null}
 */
export const fromToggle = (toggle) => {
  const container = toggle.closest(FILE_CONTAINER_SELECTOR)
  const fromContainer = container !== null ? readFilePath(container) : ''

  if (container !== null && fromContainer) {
    return { element: container, path: fromContainer, toggle, viewed: isChecked(toggle) }
  }

  const ancestor = findPathFromAncestors(toggle)
  const element = container ?? ancestor.container
  if (element === null) {
    return null
  }

  return { element, path: ancestor.path, toggle, viewed: isChecked(toggle) }
}

/**
 * ファイルを包む要素からファイルエントリを組み立てる（Viewed が見つからない構造への保険）。
 * @param {Element} element
 * @returns {{element: Element, path: string, toggle: Element | null, viewed: boolean} | null}
 */
export const fromContainer = (element) => {
  const path = readFilePath(element)
  const toggle = findViewedToggle(element)

  if (!path && toggle === null) {
    return null
  }

  return {
    element,
    path,
    toggle,
    viewed: toggle !== null && isChecked(toggle)
  }
}
