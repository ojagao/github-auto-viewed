import { createMatcher } from '../shared/matcher.js'

/** 設定画面のプレビュー判定。 */

export const DEFAULT_SAMPLES = Object.freeze([
  'src/components/Button.tsx',
  'src/components/Button.test.tsx',
  'src/__tests__/user.spec.ts',
  'tests/e2e/login.ts',
  'src/__snapshots__/Button.tsx.snap',
  'package-lock.json',
  'README.md'
])

export const toSampleText = (samples) => samples.join('\n')

/**
 * 入力されたパスを現在の設定で判定する。
 * @returns {{path: string, matched: boolean, keyword: string | null}[]}
 */
export const evaluateSamples = (settings, text) => {
  const matcher = createMatcher(settings)

  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((path) => ({ path, ...matcher(path) }))
}
