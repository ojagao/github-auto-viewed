import assert from 'node:assert/strict'
import test from 'node:test'

import { MATCH_MODES, MATCH_TARGETS } from '../src/shared/constants.js'
import { createMatcher } from '../src/shared/matcher.js'
import { sanitizeSettings } from '../src/shared/validation.js'

const keywords = (...values) => values.map((value) => ({ value, enabled: true }))

const settingsWith = (patch) => sanitizeSettings(patch)

test('部分一致: パスのどこかに含まれていれば一致する', () => {
  const matcher = createMatcher(settingsWith({ keywords: keywords('test', '.snap') }))

  assert.deepEqual(matcher('src/user.test.ts'), { matched: true, keyword: 'test' })
  assert.deepEqual(matcher('src/__tests__/user.ts'), { matched: true, keyword: 'test' })
  assert.deepEqual(matcher('src/Button.tsx.snap'), { matched: true, keyword: '.snap' })
  assert.deepEqual(matcher('src/user.ts'), { matched: false, keyword: null })
})

test('既定では大文字小文字を区別しない', () => {
  const matcher = createMatcher(settingsWith({ keywords: keywords('test') }))

  assert.equal(matcher('src/UserTest.java').matched, true)
  assert.equal(matcher('src/TEST/user.ts').matched, true)
})

test('caseSensitive を立てると区別する', () => {
  const matcher = createMatcher(
    settingsWith({ keywords: keywords('Test'), caseSensitive: true })
  )

  assert.equal(matcher('src/UserTest.java').matched, true)
  assert.equal(matcher('src/user.test.ts').matched, false)
})

test('無効なキーワードは照合に使われない', () => {
  const matcher = createMatcher(
    settingsWith({
      keywords: [
        { value: 'test', enabled: false },
        { value: 'spec', enabled: true }
      ]
    })
  )

  assert.equal(matcher('src/user.test.ts').matched, false)
  assert.equal(matcher('src/user.spec.ts').matched, true)
})

test('すべて無効なら何にも一致しない', () => {
  const matcher = createMatcher(
    settingsWith({ keywords: [{ value: 'test', enabled: false }] })
  )

  assert.equal(matcher('src/user.test.ts').matched, false)
})

test('/tests/ のようなディレクトリ指定はリポジトリ直下でも一致する', () => {
  const matcher = createMatcher(settingsWith({ keywords: keywords('/tests/') }))

  assert.equal(matcher('tests/e2e/login.ts').matched, true, 'リポジトリ直下')
  assert.equal(matcher('src/tests/login.ts').matched, true, '途中のディレクトリ')
  assert.equal(matcher('src/latests/login.ts').matched, false, '部分的に似た名前は除く')
  assert.equal(matcher('src/tests.ts').matched, false, 'ディレクトリではないので除く')
})

test('照合対象をファイル名に絞ってもスラッシュを含むキーワードはパス全体で見る', () => {
  const matcher = createMatcher(
    settingsWith({
      keywords: keywords('test', '/tests/'),
      matchTarget: MATCH_TARGETS.FILENAME
    })
  )

  assert.equal(matcher('src/user.test.ts').matched, true, 'ファイル名に test を含む')
  assert.equal(matcher('src/__tests__/user.ts').matched, false, 'ファイル名には含まれない')
  assert.equal(matcher('tests/e2e/login.ts').keyword, '/tests/', 'スラッシュ付きは拾える')
})

test('正規表現モード', () => {
  const matcher = createMatcher(
    settingsWith({
      keywords: keywords('\\.(test|spec)\\.[jt]sx?$'),
      matchMode: MATCH_MODES.REGEX
    })
  )

  assert.equal(matcher('src/user.test.ts').matched, true)
  assert.equal(matcher('src/user.spec.tsx').matched, true)
  assert.equal(matcher('src/test-helper.ts').matched, false)
})

test('正規表現モード: パスは先頭スラッシュ付きで照合される', () => {
  const matcher = createMatcher(
    settingsWith({ keywords: keywords('^/tests/'), matchMode: MATCH_MODES.REGEX })
  )

  assert.equal(matcher('tests/e2e/login.ts').matched, true)
  assert.equal(matcher('src/tests/login.ts').matched, false)
})

test('正規表現モード: 解釈できないキーワードは無視して残りで判定する', () => {
  const matcher = createMatcher(
    settingsWith({ keywords: keywords('[invalid', 'spec$'), matchMode: MATCH_MODES.REGEX })
  )

  assert.equal(matcher('src/user.spec').matched, true)
  assert.equal(matcher('src/[invalid').matched, false)
})

test('キーワードが空、またはパスが取得できない場合は一致しない', () => {
  const empty = createMatcher(settingsWith({ keywords: [] }))
  assert.equal(empty('src/user.test.ts').matched, false)

  const matcher = createMatcher(settingsWith({ keywords: keywords('test') }))
  assert.equal(matcher('').matched, false)
  assert.equal(matcher(undefined).matched, false)
})

test('先に登録したキーワードが優先して返る', () => {
  const matcher = createMatcher(settingsWith({ keywords: keywords('spec', 'test') }))

  assert.equal(matcher('src/user.spec.test.ts').keyword, 'spec')
})
