/**
 * content script のエントリポイント。
 *
 * Manifest V3 の content_scripts は ES modules を直接読み込めないため、
 * 唯一のクラシックスクリプトであるこのファイルから動的 import で本体を起動する。
 *
 * 二重起動を「読み込み済みフラグ」で防ぐと、拡張機能を再読み込みした後に
 * ポップアップから再注入しても復活できない（フラグだけが残り、リスナーは死んでいる）。
 * そのため停止関数を保持し、前のインスタンスを止めてから起動し直す。
 */
;(() => {
  const STOP_KEY = '__githubAutoViewedStop'

  const stopPrevious = () => {
    const stop = window[STOP_KEY]
    if (typeof stop !== 'function') {
      return
    }

    try {
      stop()
    } catch {
      // 拡張機能の再読み込みで無効になった古いインスタンス。止められなくても続行する
    }
    window[STOP_KEY] = undefined
  }

  const boot = async () => {
    try {
      stopPrevious()
      const moduleUrl = chrome.runtime.getURL('src/content/main.js')
      const { start } = await import(moduleUrl)
      window[STOP_KEY] = await start()
    } catch (error) {
      console.error('[GitHub Auto Viewed] 起動に失敗しました', error)
    }
  }

  void boot()
})()
