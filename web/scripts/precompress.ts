// Pós-build: grava .br e .gz ao lado de cada arquivo comprimível do dist/.
// A API (ServeDir::precompressed_*) entrega a versão certa pelo
// Accept-Encoding, sem comprimir nada em tempo de requisição.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { brotliCompressSync, gzipSync, constants } from 'node:zlib'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = fileURLToPath(new URL('../dist/', import.meta.url))
const worth = /\.(glb|js|css|html|svg|json)$/

let before = 0
let after = 0
const walk = (dir: string) => {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path)
    else if (worth.test(name)) {
      const raw = readFileSync(path)
      if (raw.length < 1024) continue
      const br = brotliCompressSync(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } })
      writeFileSync(path + '.br', br)
      writeFileSync(path + '.gz', gzipSync(raw, { level: 9 }))
      before += raw.length
      after += br.length
    }
  }
}
walk(dist)
console.log(`precompress: ${(before / 1e6).toFixed(1)} MB → ${(after / 1e6).toFixed(1)} MB (brotli)`)
