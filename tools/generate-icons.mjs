/**
 * 拡張機能アイコン（角丸の緑地＋白いチェック）を PNG で生成する。
 * 外部依存を持ち込まないため、PNG エンコードは自前で行う。
 *
 * 実行: node tools/generate-icons.mjs
 */
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const SIZES = [16, 32, 48, 128]
const SUPERSAMPLE = 3
const CORNER_RADIUS = 0.22
const STROKE_HALF_WIDTH = 0.085
const BACKGROUND = [31, 136, 61]
const FOREGROUND = [255, 255, 255]

/** チェックマークの折れ線（0〜1 の正規化座標） */
const CHECK_POINTS = [
  [0.27, 0.53],
  [0.43, 0.69],
  [0.75, 0.33]
]

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n += 1) {
    let c = n
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c >>> 0
  }
  return table
})()

const crc32 = (buffer) => {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

const buildChunk = (type, data) => {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)

  const typeBytes = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0)

  return Buffer.concat([length, typeBytes, data, crc])
}

const encodePng = (size, rgba) => {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // ビット深度
  header[9] = 6 // カラータイプ: RGBA
  header[10] = 0
  header[11] = 0
  header[12] = 0

  const stride = size * 4
  const raw = Buffer.alloc((stride + 1) * size)
  for (let y = 0; y < size; y += 1) {
    const rowStart = y * (stride + 1)
    raw[rowStart] = 0 // フィルタ種別: None
    rgba.copy(raw, rowStart + 1, y * stride, (y + 1) * stride)
  }

  return Buffer.concat([
    signature,
    buildChunk('IHDR', header),
    buildChunk('IDAT', deflateSync(raw, { level: 9 })),
    buildChunk('IEND', Buffer.alloc(0))
  ])
}

const isInsideRoundedSquare = (x, y) => {
  const dx = Math.max(CORNER_RADIUS - x, 0, x - (1 - CORNER_RADIUS))
  const dy = Math.max(CORNER_RADIUS - y, 0, y - (1 - CORNER_RADIUS))
  return Math.hypot(dx, dy) <= CORNER_RADIUS
}

const distanceToSegment = (px, py, [ax, ay], [bx, by]) => {
  const dx = bx - ax
  const dy = by - ay
  const lengthSquared = dx * dx + dy * dy
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

const isOnCheckMark = (x, y) =>
  distanceToSegment(x, y, CHECK_POINTS[0], CHECK_POINTS[1]) < STROKE_HALF_WIDTH ||
  distanceToSegment(x, y, CHECK_POINTS[1], CHECK_POINTS[2]) < STROKE_HALF_WIDTH

const renderIcon = (size) => {
  const rgba = Buffer.alloc(size * size * 4)
  const samplesPerPixel = SUPERSAMPLE * SUPERSAMPLE

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let red = 0
      let green = 0
      let blue = 0
      let coverage = 0

      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const x = (px + (sx + 0.5) / SUPERSAMPLE) / size
          const y = (py + (sy + 0.5) / SUPERSAMPLE) / size

          if (!isInsideRoundedSquare(x, y)) {
            continue
          }

          const color = isOnCheckMark(x, y) ? FOREGROUND : BACKGROUND
          red += color[0]
          green += color[1]
          blue += color[2]
          coverage += 1
        }
      }

      const offset = (py * size + px) * 4
      if (coverage === 0) {
        continue
      }

      rgba[offset] = Math.round(red / coverage)
      rgba[offset + 1] = Math.round(green / coverage)
      rgba[offset + 2] = Math.round(blue / coverage)
      rgba[offset + 3] = Math.round((coverage / samplesPerPixel) * 255)
    }
  }

  return encodePng(size, rgba)
}

const iconsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'icons')

for (const size of SIZES) {
  const filePath = join(iconsDir, `icon${size}.png`)
  writeFileSync(filePath, renderIcon(size))
  console.log(`generated: ${filePath}`)
}
