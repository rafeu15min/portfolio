// Pós-build: grava o conteúdo do site em HTML puro dentro do <div id="app">
// do dist/index.html. Quem lê a página sem executar JavaScript (preview de
// link, leitores de IA, triagem de currículo) passa a ver nome, projetos,
// stack e trajetória. No navegador, o Vue limpa o #app ao montar e o site
// segue igual. Mesma fonte do front: content/*.json.
// Roda antes do precompress, para o .br/.gz já sair com o HTML novo.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SITE = 'https://portfolio.rafeu.dev'
const read = (name: string) => JSON.parse(readFileSync(fileURLToPath(new URL(`../../content/${name}`, import.meta.url)), 'utf8'))
const indexPath = fileURLToPath(new URL('../dist/index.html', import.meta.url))

interface Project {
  slug: string
  name: string
  tagline: string
  summary: string
  highlights: string[]
  stack: string[]
  status: string
  visibility: 'public' | 'private'
  repo: string | null
}
interface StackItem { name: string; projects: string[] }
interface TimelineEntry { kind: string; org: string | null; role: string; period: string | null; text: string }

const projects = read('projects.json') as Project[]
const stack = read('stack.json') as { main: StackItem & { text: string }; groups: { title: string; items: StackItem[] }[] }
const timeline = read('timeline.json') as TimelineEntry[]

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const projectHtml = (p: Project) => {
  const code =
    p.visibility === 'public' && p.repo
      ? `<a href="https://github.com/${esc(p.repo)}">código no GitHub</a>`
      : 'repositório privado'
  return `<article id="projeto-${esc(p.slug)}">
<h3><a href="/projetos/${esc(p.slug)}">${esc(p.name)}</a></h3>
<p><strong>${esc(p.tagline)}</strong></p>
<p>${esc(p.summary)}</p>
<ul>${p.highlights.map((h) => `<li>${esc(h)}</li>`).join('')}</ul>
<p>Stack: ${p.stack.map(esc).join(', ')} · Status: ${esc(p.status)} · ${code}</p>
</article>`
}

const body = `<div class="prerender">
<header>
<h1>Rafael de Paulo (Rafeu)</h1>
<p>Engenheiro de Software · Integrador de IA</p>
<p>Desenvolvo em Rust, Python e Java, com foco em segurança e infraestrutura.</p>
<nav><a href="#projetos">Projetos</a> · <a href="#stack">Stack</a> · <a href="#trajetoria">Trajetória</a> · <a href="https://github.com/rafeu15min">github.com/rafeu15min</a></nav>
</header>
<section id="projetos">
<h2>Projetos</h2>
${projects.map(projectHtml).join('\n')}
</section>
<section id="stack">
<h2>Stack</h2>
<p><strong>Linguagem principal: ${esc(stack.main.name)}.</strong> ${esc(stack.main.text)}</p>
${stack.groups.map((g) => `<p><strong>${esc(g.title)}:</strong> ${g.items.map((i) => esc(i.name)).join(', ')}</p>`).join('\n')}
</section>
<section id="trajetoria">
<h2>Trajetória</h2>
<ul>${timeline
  .map((t) => `<li><strong>${esc(t.role)}</strong>${t.org ? ` · ${esc(t.org)}` : ''}${t.period ? ` (${esc(t.period)})` : ''}: ${esc(t.text)}</li>`)
  .join('')}</ul>
</section>
</div>`

const person = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  name: 'Rafael de Paulo',
  alternateName: 'Rafeu',
  jobTitle: 'Engenheiro de Software',
  url: SITE,
  sameAs: ['https://github.com/rafeu15min'],
  knowsAbout: [stack.main.name, ...stack.groups.flatMap((g) => g.items.map((i) => i.name))],
}
// "<" escapado: o JSON não consegue fechar a tag <script> por engano
const jsonLd = `<script type="application/ld+json">${JSON.stringify(person).replace(/</g, '\\u003c')}</script>`

let html = readFileSync(indexPath, 'utf8')
if (!html.includes('<div id="app"></div>')) throw new Error('prerender: <div id="app"></div> não encontrado no dist/index.html')
html = html.replace('<div id="app"></div>', `<div id="app">${body}</div>`).replace('</head>', `${jsonLd}\n</head>`)
writeFileSync(indexPath, html)
console.log(`prerender: ${projects.length} projetos gravados no index.html`)
