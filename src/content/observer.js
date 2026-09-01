/**
 * DOM の変化と SPA 遷移の監視。
 *
 * GitHub の Files changed は差分を遅延読み込みし、
 * さらに画面遷移でもページ全体はリロードされないため、
 * 「読み込み完了時に 1 回」では取りこぼす。
 */

const DEBOUNCE_MS = 350
const URL_POLL_MS = 1000

/**
 * @param {() => void} onChange まとまった DOM 変更のあとに呼ばれる
 */
export const createDomWatcher = (onChange) => {
  let timer = null

  const schedule = () => {
    if (timer !== null) {
      clearTimeout(timer)
    }
    timer = setTimeout(() => {
      timer = null
      onChange()
    }, DEBOUNCE_MS)
  }

  const observer = new MutationObserver(schedule)

  return {
    start: () => {
      observer.observe(document.body, { childList: true, subtree: true })
      schedule()
    },
    stop: () => {
      observer.disconnect()
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
    }
  }
}

/**
 * URL の変化を監視する。
 * content script は分離ワールドで動くためページ側の history API を差し替えられない。
 * イベントとポーリングを併用して確実に検知する。
 * @param {(url: string) => void} onChange
 */
export const createUrlWatcher = (onChange) => {
  let lastUrl = location.href

  const check = () => {
    if (location.href === lastUrl) {
      return
    }
    lastUrl = location.href
    onChange(lastUrl)
  }

  const events = ['popstate', 'pushstate', 'turbo:load', 'turbo:render', 'pjax:end']
  let intervalId = null

  return {
    start: () => {
      events.forEach((name) => window.addEventListener(name, check))
      intervalId = setInterval(check, URL_POLL_MS)
    },
    stop: () => {
      events.forEach((name) => window.removeEventListener(name, check))
      if (intervalId !== null) {
        clearInterval(intervalId)
        intervalId = null
      }
    }
  }
}
