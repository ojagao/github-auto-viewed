import assert from 'node:assert/strict'
import test from 'node:test'

import { DEFAULT_SETTINGS, LIMITS } from '../src/shared/constants.js'
import { findInvalidRegexKeywords, sanitizeSettings } from '../src/shared/validation.js'

const defaultKeywords = () => DEFAULT_SETTINGS.keywords.map((keyword) => ({ ...keyword }))

test('未保存・不正な入力は既定値になる', () => {
  assert.deepEqual(sanitizeSettings(undefined).keywords, defaultKeywords())
  assert.deepEqual(sanitizeSettings(null).keywords, defaultKeywords())
  assert.equal(sanitizeSettings('壊れた値').enabled, DEFAULT_SETTINGS.enabled)
})

test('既定のキーワードは test と spec が有効', () => {
  const enabled = DEFAULT_SETTINGS.keywords
    .filter((keyword) => keyword.enabled)
    .map((keyword) => keyword.value)

  assert.ok(enabled.includes('test'))
  assert.ok(enabled.includes('spec'))
})

test('既定では大文字小文字を区別しない', () => {
  assert.equal(DEFAULT_SETTINGS.caseSensitive, false)
})

test('列挙値は既知の値以外を受け付けない', () => {
  assert.equal(sanitizeSettings({ matchMode: 'glob' }).matchMode, DEFAULT_SETTINGS.matchMode)
  assert.equal(sanitizeSettings({ matchTarget: 'dir' }).matchTarget, DEFAULT_SETTINGS.matchTarget)
  assert.equal(sanitizeSettings({ matchMode: 'regex' }).matchMode, 'regex')
})

test('真偽値以外は既定値で埋める', () => {
  assert.equal(sanitizeSettings({ enabled: 'true' }).enabled, DEFAULT_SETTINGS.enabled)
  assert.equal(sanitizeSettings({ enabled: false }).enabled, false)
  assert.equal(sanitizeSettings({ loadAllFiles: 'no' }).loadAllFiles, DEFAULT_SETTINGS.loadAllFiles)
  assert.equal(sanitizeSettings({ loadAllFiles: false }).loadAllFiles, false)
})

test('遅延読み込みされた差分も既定で処理する', () => {
  assert.equal(DEFAULT_SETTINGS.loadAllFiles, true)
})

test('キーワードは空白を落とし、空と重複を除く', () => {
  const { keywords } = sanitizeSettings({
    keywords: [
      { value: '  test ', enabled: true },
      { value: 'TEST', enabled: false },
      { value: '', enabled: true },
      { value: '  ', enabled: true },
      { value: '/tests/', enabled: false },
      42,
      null
    ]
  })

  assert.deepEqual(keywords, [
    { value: 'test', enabled: true },
    { value: '/tests/', enabled: false }
  ])
})

test('enabled が欠けているキーワードは有効として扱う', () => {
  const { keywords } = sanitizeSettings({ keywords: [{ value: 'test' }] })

  assert.deepEqual(keywords, [{ value: 'test', enabled: true }])
})

test('旧形式（文字列の配列）も読み込める', () => {
  const { keywords } = sanitizeSettings({ keywords: ['test', 'spec'] })

  assert.deepEqual(keywords, [
    { value: 'test', enabled: true },
    { value: 'spec', enabled: true }
  ])
})

test('キーワードの数と長さに上限がある', () => {
  const many = Array.from({ length: LIMITS.MAX_KEYWORDS + 50 }, (_, index) => ({
    value: `keyword-${index}`,
    enabled: true
  }))
  assert.equal(sanitizeSettings({ keywords: many }).keywords.length, LIMITS.MAX_KEYWORDS)

  const long = 'a'.repeat(LIMITS.MAX_KEYWORD_LENGTH + 100)
  assert.equal(
    sanitizeSettings({ keywords: [{ value: long, enabled: true }] }).keywords[0].value.length,
    LIMITS.MAX_KEYWORD_LENGTH
  )
})

test('キーワードが配列でなければ既定値を使う', () => {
  assert.deepEqual(sanitizeSettings({ keywords: 'test' }).keywords, defaultKeywords())
})

test('クリック間隔は数値化して範囲内に収める', () => {
  assert.equal(sanitizeSettings({ clickIntervalMs: '250' }).clickIntervalMs, 250)
  assert.equal(
    sanitizeSettings({ clickIntervalMs: -100 }).clickIntervalMs,
    LIMITS.MIN_CLICK_INTERVAL_MS
  )
  assert.equal(
    sanitizeSettings({ clickIntervalMs: 99999 }).clickIntervalMs,
    LIMITS.MAX_CLICK_INTERVAL_MS
  )
  assert.equal(
    sanitizeSettings({ clickIntervalMs: 'abc' }).clickIntervalMs,
    DEFAULT_SETTINGS.clickIntervalMs
  )
  assert.equal(sanitizeSettings({ clickIntervalMs: 120.6 }).clickIntervalMs, 121)
})

test('正規化した設定は既定値や入力を書き換えない', () => {
  const input = { keywords: [{ value: 'test', enabled: true }] }
  const result = sanitizeSettings(input)

  result.keywords.push({ value: 'spec', enabled: true })
  result.keywords[0].enabled = false

  assert.equal(input.keywords.length, 1)
  assert.equal(input.keywords[0].enabled, true)
  assert.equal(DEFAULT_SETTINGS.keywords.length, defaultKeywords().length)
})

test('有効なキーワードの中から無効な正規表現を抽出する', () => {
  const keywords = [
    { value: 'ok$', enabled: true },
    { value: '[invalid', enabled: true },
    { value: '(disabled-but-bad', enabled: false }
  ]

  assert.deepEqual(findInvalidRegexKeywords(keywords), ['[invalid'])
})
