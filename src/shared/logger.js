import { EXTENSION_LABEL } from './constants.js'

const prefix = `[${EXTENSION_LABEL}]`

/**
 * 想定外の例外を記録する。
 * 拡張機能はユーザーに気付かれないまま失敗しがちなので、原因追跡用に必ず残す。
 */
export const logError = (message, error) => {
  console.error(`${prefix} ${message}`, error)
}

/** 処理は継続できるが利用者に伝えたい状況を記録する。 */
export const logWarn = (message, detail) => {
  console.warn(`${prefix} ${message}`, detail ?? '')
}
