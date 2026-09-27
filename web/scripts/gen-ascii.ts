// Gera as artes ASCII em build (figlet) e grava src/generated/ascii.ts.
// Assim nenhuma fonte figlet vai pro bundle e nada é calculado em runtime.
import figlet from 'figlet'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = new URL('..', import.meta.url)
const projects: { slug: string; name: string }[] = JSON.parse(
  readFileSync(new URL('../content/projects.json', root), 'utf8'),
)

// figlet não tem glifos acentuados: a arte usa a forma sem acento (caixa
// preservada) e o aria-label (no componente) carrega o texto correto.
const plain = (s: string) => s.normalize('NFD').replace(/\p{Mn}/gu, '')
const render = (text: string, font: figlet.Fonts) =>
  figlet
    .textSync(plain(text), { font, horizontalLayout: 'default' })
    .split('\n')
    .map((l) => l.trimEnd())
    .filter((l, i, all) => l.length > 0 || (i > 0 && i < all.length - 1))
    .join('\n')

const sections = ['Manifesto', 'Stack', 'Projetos', 'Trajetória', 'Devoção', 'Contato']

const out = {
  name: render('RaFeu', 'Small'),
  sections: Object.fromEntries(sections.map((s) => [s, render(s, 'Small')])),
  projects: Object.fromEntries(projects.map((p) => [p.slug, render(p.name, 'Small')])),
}

const dir = fileURLToPath(new URL('src/generated/', root))
mkdirSync(dir, { recursive: true })
writeFileSync(
  dir + 'ascii.ts',
  `// GERADO por scripts/gen-ascii.ts — não editar.\nexport const ascii = ${JSON.stringify(out, null, 2)} as const\n`,
)
console.log(`ascii: nome + ${sections.length} seções + ${projects.length} projetos`)
