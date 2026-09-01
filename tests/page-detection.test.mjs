import assert from 'node:assert/strict'
import test from 'node:test'

import { isFilesPage } from '../src/content/scanner.js'

test('差分ページの URL を判定する（旧 UI の /files と新しい /changes の両方）', () => {
  assert.equal(isFilesPage('/acme-inc/some_repo/pull/568/changes'), true)
  assert.equal(isFilesPage('/owner/repo/pull/123/files'), true)
  assert.equal(isFilesPage('/owner/repo/pull/1/changes/'), true)
  assert.equal(isFilesPage('/owner.with.dots/repo-name/pull/9999/files'), true)
})

test('差分ページ以外では動作しない', () => {
  assert.equal(isFilesPage('/owner/repo/pull/123'), false)
  assert.equal(isFilesPage('/owner/repo/pull/123/commits'), false)
  assert.equal(isFilesPage('/owner/repo/pull/123/checks'), false)
  assert.equal(isFilesPage('/owner/repo/issues/123'), false)
  assert.equal(isFilesPage('/owner/repo/commit/abc123'), false)
  assert.equal(isFilesPage('/'), false)
})
