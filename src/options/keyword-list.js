/** キーワード一覧の描画。 */

const buildRow = (keyword, { onToggle, onRemove }) => {
  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.checked = keyword.enabled
  checkbox.addEventListener('change', () => onToggle(keyword.value, checkbox.checked))

  const value = document.createElement('span')
  value.className = 'keyword__value'
  value.textContent = keyword.value

  const label = document.createElement('label')
  label.className = 'keyword__label'
  label.append(checkbox, value)

  const remove = document.createElement('button')
  remove.type = 'button'
  remove.className = 'keyword__remove'
  remove.textContent = '削除'
  remove.setAttribute('aria-label', `${keyword.value} を削除`)
  remove.addEventListener('click', () => onRemove(keyword.value))

  const row = document.createElement('li')
  row.className = `keyword${keyword.enabled ? '' : ' keyword--off'}`
  row.append(label, remove)

  return row
}

/**
 * @param {HTMLElement} container
 * @param {{value: string, enabled: boolean}[]} keywords
 * @param {{onToggle: (value: string, enabled: boolean) => void, onRemove: (value: string) => void}} handlers
 */
export const renderKeywordList = (container, keywords, handlers) => {
  container.replaceChildren(...keywords.map((keyword) => buildRow(keyword, handlers)))
}
