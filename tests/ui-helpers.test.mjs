import assert from 'node:assert/strict'
import test from 'node:test'

import { EMPTY_RESULT } from '../src/shared/messages.js'
import { sanitizeSettings } from '../src/shared/validation.js'
import { formatPageState, formatRunResult } from '../src/popup/format.js'
import { evaluateSamples } from '../src/options/preview.js'

test('ページ状態の文言', () => {
  assert.match(
    formatPageState({ onFilesPage: false, total: 0, matched: 0, pending: 0 }),
    /Files changed/
  )
  assert.match(formatPageState({ onFilesPage: true, total: 0, matched: 0, pending: 0 }), /読み込/)
  assert.equal(
    formatPageState({ onFilesPage: true, total: 12, matched: 3, pending: 2 }),
    '対象 3 / 12 ファイル（未 Viewed 2 件）'
  )
})

test('実行結果の文言', () => {
  assert.equal(formatRunResult({ ...EMPTY_RESULT, error: '失敗しました' }), '失敗しました')
  assert.match(formatRunResult({ ...EMPTY_RESULT, busy: true }), /処理中/)
  assert.equal(
    formatRunResult({ ...EMPTY_RESULT, matched: 3, marked: 3 }),
    '3 件を Viewed にしました'
  )
  assert.equal(
    formatRunResult({ ...EMPTY_RESULT, matched: 3, marked: 2, failed: 1 }),
    '2 件を Viewed にしました（1 件は失敗）'
  )
  assert.match(formatRunResult({ ...EMPTY_RESULT, matched: 3, alreadyViewed: 3 }), /すべて Viewed/)
  assert.match(formatRunResult({ ...EMPTY_RESULT }), /一致するファイルはありません/)
})

test('プレビューは一致したキーワードを添えて返す', () => {
  const settings = sanitizeSettings({ keywords: [{ value: 'test', enabled: true }] })
  const results = evaluateSamples(settings, 'src/user.test.ts\n\nsrc/user.ts\n')

  assert.deepEqual(results, [
    { path: 'src/user.test.ts', matched: true, keyword: 'test' },
    { path: 'src/user.ts', matched: false, keyword: null }
  ])
})

test('プレビューは無効なキーワードを反映しない', () => {
  const settings = sanitizeSettings({ keywords: [{ value: 'test', enabled: false }] })
  const results = evaluateSamples(settings, 'src/user.test.ts')

  assert.equal(results[0].matched, false)
})
