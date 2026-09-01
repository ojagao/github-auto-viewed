/** ポップアップのキーワード ON/OFF リストの描画。 */

const buildRow = (keyword, onToggle) => {
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

  const row = document.createElement('li')
  row.className = `keyword${keyword.enabled ? '' : ' keyword--off'}`
  row.append(label)

  return row
}

/**
 * @param {HTMLElement} container
 * @param {{value: string, enabled: boolean}[]} keywords
 * @param {(value: string, enabled: boolean) => void} onToggle
 */
export const renderKeywordToggles = (container, keywords, onToggle) => {
  container.replaceChildren(...keywords.map((keyword) => buildRow(keyword, onToggle)))
}
