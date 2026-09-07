/** popup の文言生成。表示だけを担う純関数。 */

export const formatPageState = (status) => {
  if (!status.onFilesPage) {
    return 'Pull Request の Files changed を開くと動作します'
  }
  if (status.total === 0) {
    return '差分ファイルが見つかりません（読み込み中か、GitHub の画面構成が変わった可能性）'
  }

  // GitHub は差分を遅延読み込みするため、DOM にある数と全体数がずれる
  const unloaded = Math.max(0, (status.known ?? 0) - status.total)
  const unloadedNote = unloaded > 0 ? `、未読み込み ${unloaded} 件` : ''

  return `対象 ${status.matched} / ${status.total} ファイル（未 Viewed ${status.pending} 件${unloadedNote}）`
}

export const formatRunResult = (result) => {
  if (result.error) {
    return result.error
  }
  if (result.busy) {
    return '処理中です。少し待ってからもう一度お試しください。'
  }
  if (result.marked > 0) {
    const failedNote = result.failed > 0 ? `（${result.failed} 件は失敗）` : ''
    return `${result.marked} 件を Viewed にしました${failedNote}`
  }
  if (result.matched > 0) {
    return `対象 ${result.matched} 件はすべて Viewed 済みです`
  }
  return 'キーワードに一致するファイルはありませんでした'
}
