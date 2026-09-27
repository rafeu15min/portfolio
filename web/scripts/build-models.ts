// Pipeline dos modelos 3D da página Devoção:
//   3D/*.stl (fontes, fora do git) → Blender (orienta, funde, reduz) → GLB
//   ou, com "generator", um script Blender que GERA o modelo (ex.: a capela)
//   → gltf-transform (quantização KHR_mesh_quantization) → public/models/*.glb
// Quantização em vez de Draco/meshopt: o three.js lê nativamente, sem
// decoder WASM — a CSP continua sem 'wasm-unsafe-eval'.
// Uso: npm run models   (precisa do Blender no PATH)
import { execFileSync } from 'node:child_process'
import { readFileSync, statSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { NodeIO, PropertyType } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { quantize, weld, prune, dedup } from '@gltf-transform/functions'

const root = fileURLToPath(new URL('../../', import.meta.url))
const tools = root + 'tools/models/'
const out = root + 'web/public/models/'
const tmp = root + 'tools/models/.tmp/'
mkdirSync(out, { recursive: true })
mkdirSync(tmp, { recursive: true })

const models: { id: string; src?: string; front?: string; tris?: number; gold?: string; generator?: string }[] = JSON.parse(
  readFileSync(tools + 'models.json', 'utf8'),
)
const only = process.argv.slice(2)
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)

for (const m of models.filter((m) => !only.length || only.includes(m.id))) {
  const raw = tmp + m.id + '.glb'
  const blenderArgs = m.generator
    ? ['-b', '-P', tools + m.generator, '--', raw]
    : ['-b', '-P', tools + 'stl2glb.py', '--', root + m.src, raw, m.front!, String(m.tris), m.gold ?? '']
  const log = execFileSync('blender', blenderArgs, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  const line = log.split('\n').find((l) => l.startsWith('STL2GLB') || l.startsWith('GERADO'))
  if (!line) throw new Error(`${m.id}: Blender falhou\n${log.slice(-2000)}`)

  const doc = await io.read(raw)
  // dedup sem materiais: "ivory" e "gold" são idênticos exceto no nome (a cor
  // vem da cena) e seriam fundidos num só
  await doc.transform(
    dedup({ propertyTypes: [PropertyType.ACCESSOR, PropertyType.MESH, PropertyType.TEXTURE] }),
    weld(),
    // keepAttributes: o UV do vitral só ganha textura na cena — sem isso o
    // prune o descartaria por não haver textura no próprio GLB
    prune({ keepAttributes: true }),
    quantize({ quantizePosition: 14, quantizeNormal: 10 }),
  )
  await io.write(out + m.id + '.glb', doc)

  const mb = (f: string) => (statSync(f).size / 1e6).toFixed(1) + ' MB'
  console.log(`${m.id}: ${line.split(': ')[1]} · ${mb(raw)} → ${mb(out + m.id + '.glb')}`)
}
