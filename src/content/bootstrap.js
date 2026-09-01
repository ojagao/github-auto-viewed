/**
 * content script のエントリポイント。
 *
 * Manifest V3 の content_scripts は ES modules を直接読み込めないため、
 * 唯一のクラシックスクリプトであるこのファイルから動的 import で本体を起動する。
 */
;(() => {
  const FLAG = '__githubAutoViewedLoaded'

  if (window[FLAG] === true) {
    return
  }
  window[FLAG] = true

  const boot = async () => {
    try {
      const moduleUrl = chrome.runtime.getURL('src/content/main.js')
      const { start } = await import(moduleUrl)
      await start()
    } catch (error) {
      window[FLAG] = false
      console.error('[GitHub Auto Viewed] 起動に失敗しました', error)
    }
  }

  void boot()
})()
