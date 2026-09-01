/** 非同期処理の小道具。 */

export const delay = (ms) =>
  new Promise((resolve) => {
    setTimeout(resolve, Math.max(0, ms))
  })

/**
 * 条件が満たされるまでポーリングする。
 * @param {() => boolean} predicate
 * @param {{timeoutMs: number, intervalMs: number}} options
 * @returns {Promise<boolean>} タイムアウト前に満たされたか
 */
export const waitUntil = async (predicate, { timeoutMs, intervalMs }) => {
  const deadline = performance.now() + timeoutMs

  while (performance.now() < deadline) {
    if (predicate()) {
      return true
    }
    await delay(intervalMs)
  }

  return predicate()
}
