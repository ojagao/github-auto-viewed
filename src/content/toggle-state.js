/**
 * Viewed の切り替え要素の状態読み取り。
 * input[type=checkbox] / role="checkbox" / トグルボタン（aria-pressed）の
 * 表現の違いをここで吸収する。
 */

export const isChecked = (element) =>
  element.checked === true ||
  element.getAttribute('aria-checked') === 'true' ||
  element.getAttribute('aria-pressed') === 'true'

export const isDisabled = (element) =>
  element.disabled === true || element.getAttribute('aria-disabled') === 'true'
