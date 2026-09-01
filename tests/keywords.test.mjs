import assert from 'node:assert/strict'
import test from 'node:test'

import { LIMITS } from '../src/shared/constants.js'
import {
  addKeyword,
  addKeywords,
  hasKeyword,
  removeKeyword,
  setAllEnabled,
  setKeywordEnabled
} from '../src/shared/keywords.js'

const base = () => [
  { value: 'test', enabled: true },
  { value: 'spec', enabled: false }
]

test('追加: 前後の空白を落として末尾に足す', () => {
  const keywords = base()
  const result = addKeyword(keywords, '  /tests/  ')

  assert.deepEqual(result.at(-1), { value: '/tests/', enabled: true })
  assert.deepEqual(keywords, base(), '元の配列は変更しない')
})

test('追加: 空文字は無視する', () => {
  const keywords = base()

  assert.deepEqual(addKeyword(keywords, '   '), keywords)
})

test('追加: 既にある語は重複させず、無効なら有効化する', () => {
  const result = addKeyword(base(), 'SPEC')

  assert.equal(result.length, 2)
  assert.deepEqual(result[1], { value: 'spec', enabled: true })
})

test('追加: 上限を超えたら追加しない', () => {
  const many = Array.from({ length: LIMITS.MAX_KEYWORDS }, (_, index) => ({
    value: `keyword-${index}`,
    enabled: true
  }))

  assert.equal(addKeyword(many, 'overflow').length, LIMITS.MAX_KEYWORDS)
})

test('複数追加: 重複を除いてまとめて足す', () => {
  const result = addKeywords(base(), ['test', 'yarn.lock', '/dist/'])

  assert.deepEqual(
    result.map((keyword) => keyword.value),
    ['test', 'spec', 'yarn.lock', '/dist/']
  )
})

test('削除: 大文字小文字を無視して消す', () => {
  const result = removeKeyword(base(), 'TEST')

  assert.deepEqual(
    result.map((keyword) => keyword.value),
    ['spec']
  )
})

test('有効・無効の切り替え', () => {
  const keywords = base()
  const disabled = setKeywordEnabled(keywords, 'test', false)

  assert.equal(disabled[0].enabled, false)
  assert.equal(keywords[0].enabled, true, '元の配列は変更しない')

  const allOn = setAllEnabled(keywords, true)
  assert.deepEqual(
    allOn.map((keyword) => keyword.enabled),
    [true, true]
  )
})

test('存在確認は大文字小文字を無視する', () => {
  assert.equal(hasKeyword(base(), 'Test'), true)
  assert.equal(hasKeyword(base(), 'snap'), false)
})
