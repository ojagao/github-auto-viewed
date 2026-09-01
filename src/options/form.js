/** 設定画面のラジオボタン読み書き。 */

export const readRadio = (name) =>
  document.querySelector(`input[name="${name}"]:checked`)?.value ?? null

export const writeRadio = (name, value) => {
  const target = [...document.querySelectorAll(`input[name="${name}"]`)].find(
    (input) => input.value === value
  )
  if (target !== undefined) {
    target.checked = true
  }
}
