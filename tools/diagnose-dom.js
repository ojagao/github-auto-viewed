/**
 * GitHub の差分ページの DOM 構造を調べる診断スクリプト。
 *
 * 使い方: 該当ページを開き、DevTools のコンソールにこのファイルの内容を貼って実行する。
 * 出力された JSON を渡してもらえば、セレクタを実際の構造に合わせられる。
 *
 * ページを変更する操作は一切行わない（読み取りのみ）。
 */
;(() => {
  const VIEWED_PATTERN = /viewed|表示済み|確認済み/i

  const describe = (element) => ({
    tag: element.tagName.toLowerCase(),
    type: element.getAttribute('type'),
    role: element.getAttribute('role'),
    id: element.id || null,
    className: typeof element.className === 'string' ? element.className.slice(0, 120) : null,
    testId: element.getAttribute('data-testid'),
    ariaLabel: element.getAttribute('aria-label'),
    title: element.getAttribute('title'),
    labelText: element.closest('label')?.textContent?.trim().slice(0, 60) ?? null,
    state: {
      checked: element.checked ?? null,
      ariaChecked: element.getAttribute('aria-checked'),
      ariaPressed: element.getAttribute('aria-pressed')
    }
  })

  const candidates = [
    ...document.querySelectorAll(
      'input[type="checkbox"], [role="checkbox"], [role="switch"], button[aria-pressed]'
    )
  ]

  const viewedCandidates = candidates
    .map(describe)
    .filter((info) => VIEWED_PATTERN.test(JSON.stringify(info)))

  const countOf = (selector) => {
    try {
      return document.querySelectorAll(selector).length
    } catch {
      return 'セレクタが無効'
    }
  }

  /** Viewed らしき要素から祖先を遡り、どこにファイルパスがあるかを調べる */
  const ancestorTrail = (() => {
    const toggle = candidates.find((element) => VIEWED_PATTERN.test(JSON.stringify(describe(element))))
    if (toggle === undefined) {
      return null
    }

    const trail = []
    let current = toggle.parentElement
    let depth = 0

    while (current !== null && current.tagName !== 'BODY' && depth < 12) {
      const pathSelector = '[data-file-path],[data-tagsearch-path],[data-path]'

      trail.push({
        depth,
        tag: current.tagName.toLowerCase(),
        testId: current.getAttribute('data-testid'),
        className: typeof current.className === 'string' ? current.className.slice(0, 80) : null,
        ownPathAttributes: ['data-file-path', 'data-tagsearch-path', 'data-path']
          .map((name) => [name, current.getAttribute(name)])
          .filter(([, value]) => value !== null),
        pathsInside: [...current.querySelectorAll(pathSelector)].slice(0, 3).map((node) => ({
          tag: node.tagName.toLowerCase(),
          value:
            node.getAttribute('data-file-path') ??
            node.getAttribute('data-tagsearch-path') ??
            node.getAttribute('data-path')
        })),
        titlesInside: [...current.querySelectorAll('[title]')]
          .slice(0, 3)
          .map((node) => node.getAttribute('title')),
        linkTextsInside: [...current.querySelectorAll('a[href*="#diff-"]')]
          .slice(0, 2)
          .map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 120))
      })
      current = current.parentElement
      depth += 1
    }

    return trail
  })()

  const report = {
    url: location.pathname,
    viewedCandidates,
    otherToggleCount: candidates.length - viewedCandidates.length,
    selectorCounts: {
      'copilot-diff-entry': countOf('copilot-diff-entry'),
      '[data-testid="diff-file-wrapper"]': countOf('[data-testid="diff-file-wrapper"]'),
      '.js-file': countOf('.js-file'),
      '[data-testid="file-header"]': countOf('[data-testid="file-header"]'),
      '[data-file-path]': countOf('[data-file-path]'),
      '[data-tagsearch-path]': countOf('[data-tagsearch-path]'),
      'a[href*="#diff-"]': countOf('a[href*="#diff-"]'),
      'button[class*="MarkAsViewedButton"]': countOf('button[class*="MarkAsViewedButton"]'),
      '[class*="diffEntry"]': countOf('[class*="diffEntry"]'),
      '[class*="diffTargetable"]': countOf('[class*="diffTargetable"]')
    },
    // パス要素から 1 ファイル分のコンテナへ遡り、その中に Viewed ボタンがあるか
    pathToToggle: [...document.querySelectorAll('[data-file-path],[data-tagsearch-path]')]
      .slice(0, 4)
      .map((element) => {
        const container = element.closest(
          '[class*="diffEntry"],[class*="diffTargetable"],copilot-diff-entry,.js-file'
        )
        return {
          path: element.getAttribute('data-file-path') ?? element.getAttribute('data-tagsearch-path'),
          containerClassName:
            typeof container?.className === 'string' ? container.className.slice(0, 80) : null,
          viewedButtonFound: container?.querySelector('button[class*="MarkAsViewedButton"]') !== null
        }
      }),
    // 遅延読み込みが進まない原因を調べる
    loadingHints: {
      progressiveListChildren:
        document.querySelector('[data-testid="progressive-diffs-list"]')?.children.length ?? null,
      dataFilePathCount: document.querySelectorAll('[data-file-path]').length,
      uniqueDiffAnchors: (() => {
        const hashes = new Set()
        for (const anchor of document.querySelectorAll('a[href*="#diff-"]')) {
          const match = anchor.getAttribute('href')?.match(/#diff-([0-9a-f]{16,})/i)
          if (match) {
            hashes.add(match[1].toLowerCase())
          }
        }
        return hashes.size
      })(),
      scroll: {
        documentScrollHeight: document.documentElement.scrollHeight,
        innerHeight: window.innerHeight,
        scrollY: window.scrollY
      },
      // 差分リストが内部でスクロールしていないかを確認する
      scrollableAncestors: (() => {
        const found = []
        let current =
          document.querySelector('[data-testid="progressive-diffs-list"]')?.parentElement ?? null
        let depth = 0

        while (current !== null && current !== document.body && depth < 12) {
          const { overflowY } = getComputedStyle(current)
          if (/(auto|scroll)/.test(overflowY)) {
            found.push({
              depth,
              className:
                typeof current.className === 'string' ? current.className.slice(0, 80) : null,
              testId: current.getAttribute('data-testid'),
              overflowY,
              scrollHeight: current.scrollHeight,
              clientHeight: current.clientHeight
            })
          }
          current = current.parentElement
          depth += 1
        }

        return found
      })(),
      // 「さらに読み込む」系のボタンが出ていないかを確認する
      buttonTexts: [
        ...new Set(
          [...document.querySelectorAll('button')]
            .filter((button) => button.offsetParent !== null)
            .map((button) => (button.textContent ?? '').replace(/\s+/g, ' ').trim())
            .filter((text) => text.length > 0 && text.length < 60)
        )
      ].slice(0, 40),
      fileCountText:
        (document.body.innerText ?? '').match(
          /(\d+)\s*(changed files?|files? changed|個のファイル)/i
        )?.[0] ?? null
    },
    // 折りたたみに使えるボタンと、差分本体の見つけ方を調べる
    collapseHints: (() => {
      const container = document.querySelector(
        '[class*="diffTargetable"],[class*="diffEntry"],copilot-diff-entry,.js-file'
      )
      if (container === null) {
        return null
      }

      return {
        containerClassName:
          typeof container.className === 'string' ? container.className.slice(0, 80) : null,
        childClassNames: [...container.children].map((child) =>
          typeof child.className === 'string' ? child.className.slice(0, 80) : child.tagName
        ),
        hasTable: container.querySelector('table') !== null,
        buttons: [...container.querySelectorAll('button')].slice(0, 12).map((button) => ({
          ariaLabel: button.getAttribute('aria-label'),
          ariaExpanded: button.getAttribute('aria-expanded'),
          ariaPressed: button.getAttribute('aria-pressed'),
          className: typeof button.className === 'string' ? button.className.slice(0, 80) : null
        }))
      }
    })(),
    ancestorTrail
  }

  const json = JSON.stringify(report, null, 2)

  // DevTools の copy() が使える場合はクリップボードへ入れる（全文が確実に取れる）
  if (typeof copy === 'function') {
    copy(json)
  }

  return json
})()
