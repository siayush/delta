#!/usr/bin/env node
// Usage: node generate-json.js <size> <unit> [outputFile]
//   <size>       number, e.g. 5
//   <unit>       "kb" or "mb"
//   [outputFile] optional, defaults to output.json
// Example: node generate-json.js 10 mb big.json

const fs = require('fs')
const path = require('path')

const [, , sizeArg, unitArg, fileArg] = process.argv

if (!sizeArg || !unitArg) {
  console.error('Usage: node generate-json.js <size> <kb|mb> [outputFile]')
  process.exit(1)
}

const size = Number(sizeArg)
const unit = unitArg.toLowerCase()

if (!Number.isFinite(size) || size <= 0) {
  console.error('Size must be a positive number')
  process.exit(1)
}
if (unit !== 'kb' && unit !== 'mb') {
  console.error('Unit must be "kb" or "mb"')
  process.exit(1)
}

const targetBytes = Math.floor(size * (unit === 'mb' ? 1024 * 1024 : 1024))
const outputFile = fileArg || 'output.json'
const outputPath = path.resolve(process.cwd(), outputFile)

function randomString(len) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let s = ''
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)]
  return s
}

function makeRecord(i) {
  return {
    id: i,
    uuid: randomString(16),
    name: randomString(12),
    email: `${randomString(8)}@example.com`,
    active: Math.random() > 0.5,
    score: Math.round(Math.random() * 10000) / 100,
    tags: Array.from({ length: 3 }, () => randomString(6)),
    description: randomString(80),
    createdAt: new Date(Date.now() - Math.floor(Math.random() * 1e10)).toISOString()
  }
}

const fd = fs.openSync(outputPath, 'w')
try {
  fs.writeSync(fd, '[\n')
  let written = 2 // for "[\n"
  let i = 0
  let first = true

  while (true) {
    const record = makeRecord(i++)
    const chunk = (first ? '' : ',\n') + '  ' + JSON.stringify(record)
    const chunkBytes = Buffer.byteLength(chunk, 'utf8')

    // Reserve 2 bytes for closing "\n]"
    if (written + chunkBytes + 2 > targetBytes) {
      // Pad the last record's description so we hit the target exactly.
      const remaining = targetBytes - written - 2 - (first ? 0 : 2) // 2 for ",\n"
      if (remaining > 50) {
        const overhead = chunkBytes - 80 // 80 is the default description length
        const padLen = Math.max(1, targetBytes - written - 2 - overhead - (first ? 0 : 2))
        record.description = randomString(padLen)
        const finalChunk = (first ? '' : ',\n') + '  ' + JSON.stringify(record)
        fs.writeSync(fd, finalChunk)
        written += Buffer.byteLength(finalChunk, 'utf8')
      }
      break
    }

    fs.writeSync(fd, chunk)
    written += chunkBytes
    first = false
  }

  fs.writeSync(fd, '\n]')
} finally {
  fs.closeSync(fd)
}

const finalSize = fs.statSync(outputPath).size
console.log(`Wrote ${outputPath}`)
console.log(`Target: ${targetBytes} bytes (${size} ${unit.toUpperCase()})`)
console.log(`Actual: ${finalSize} bytes`)
