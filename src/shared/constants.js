/**
 * 拡張機能全体で共有する定数。
 * すべて凍結して、意図しない書き換えを防ぐ。
 */

export const EXTENSION_LABEL = 'GitHub Auto Viewed'

export const STORAGE_AREA = 'sync'

export const STORAGE_KEY = 'settings'

/** キーワードの照合方式 */
export const MATCH_MODES = Object.freeze({
  SUBSTRING: 'substring',
  REGEX: 'regex'
})

/** キーワードを当てる対象 */
export const MATCH_TARGETS = Object.freeze({
  /** リポジトリルートからの相対パス全体（例: /src/__tests__/user.ts） */
  PATH: 'path',
  /** ファイル名のみ（例: user.test.ts） */
  FILENAME: 'filename'
})

export const LIMITS = Object.freeze({
  MAX_KEYWORDS: 200,
  MAX_KEYWORD_LENGTH: 200,
  MIN_CLICK_INTERVAL_MS: 0,
  MAX_CLICK_INTERVAL_MS: 3000
})

const keyword = (value, enabled) => Object.freeze({ value, enabled })

/**
 * 既定のキーワード。
 * よく使うものは有効、状況によって使うものは無効で並べておき、
 * 設定画面のチェックボックスですぐ切り替えられるようにする。
 */
const DEFAULT_KEYWORDS = Object.freeze([
  keyword('test', true),
  keyword('spec', true),
  keyword('.spec', true),
  keyword('/tests/', false),
  keyword('/__tests__/', false),
  keyword('__mocks__', false),
  keyword('fixture', false),
  keyword('package-lock.json', false),
  keyword('yarn.lock', false),
  keyword('pnpm-lock.yaml', false)
])

export const DEFAULT_SETTINGS = Object.freeze({
  /** 拡張機能全体の有効・無効 */
  enabled: true,
  /** Files changed を開いたときに自動実行するか */
  autoRun: true,
  /** Viewed にした後、差分が開いたままなら閉じるか */
  collapse: true,
  /**
   * 遅延読み込みされた差分も処理するか。
   * GitHub は差分を順次読み込むため、これを切ると画面に出ている分しか対象にならない。
   */
  loadAllFiles: true,
  /** キーワードの大文字小文字を区別するか（既定は区別しない） */
  caseSensitive: false,
  matchMode: MATCH_MODES.SUBSTRING,
  matchTarget: MATCH_TARGETS.PATH,
  keywords: DEFAULT_KEYWORDS,
  /** 連続クリックの間隔（GitHub 側への負荷を避けるため） */
  clickIntervalMs: 120
})

/** 設定画面から一括追加できるキーワードのプリセット */
export const KEYWORD_PRESETS = Object.freeze([
  Object.freeze({
    id: 'tests',
    label: 'テスト',
    values: Object.freeze(['test', 'spec', '/tests/', '/__tests__/', '.snap', '__mocks__'])
  }),
  Object.freeze({
    id: 'lockfiles',
    label: 'ロックファイル',
    values: Object.freeze([
      'package-lock.json',
      'pnpm-lock.yaml',
      'yarn.lock',
      'composer.lock',
      'Gemfile.lock',
      'Cargo.lock',
      'poetry.lock'
    ])
  }),
  Object.freeze({
    id: 'generated',
    label: '自動生成',
    values: Object.freeze([
      '.generated.',
      '.gen.go',
      '.pb.go',
      '_pb2.py',
      'schema.graphql',
      '/dist/',
      '/build/'
    ])
  }),
  Object.freeze({
    id: 'assets',
    label: 'アセット・ドキュメント',
    values: Object.freeze(['.svg', '.png', '.jpg', '.min.js', '.min.css', 'CHANGELOG.md'])
  })
])
