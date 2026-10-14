<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import Poster from '@/components/collage/Poster.vue'
import PaperCard from '@/components/collage/PaperCard.vue'
import Tape from '@/components/collage/Tape.vue'
import NeonAscii from '@/components/neon/NeonAscii.vue'
import { findProject, monthLabel } from '@/lib/content'
import { fetchRepoStats, type RepoStats } from '@/lib/api'
import { ascii } from '@/generated/ascii'

const props = defineProps<{ slug: string }>()
const project = computed(() => findProject(props.slug))
const art = computed(() => (ascii.projects as Record<string, string>)[props.slug] ?? '')
const stats = ref<RepoStats | null>(null)

watchEffect(async () => {
  stats.value = null
  if (project.value?.visibility === 'public') stats.value = await fetchRepoStats(props.slug)
  document.title = project.value ? `${project.value.name} · Rafeu` : 'Rafeu'
})

// diagramas de arquitetura (content/diagrams/<slug>.svg), embutidos no build
const diagrams = import.meta.glob('@content/diagrams/*.svg', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const diagram = computed(() => Object.entries(diagrams).find(([path]) => path.endsWith(`/${props.slug}.svg`))?.[1])

const glow = computed(() => (project.value?.accent === 'rust' ? 'rust' : project.value?.accent ?? 'cyan'))
const date = (iso: string) => new Date(iso).toLocaleDateString('pt-BR')
</script>

<template>
  <div class="section wrap detail">
    <RouterLink to="/#projetos" class="back">← voltar</RouterLink>

    <template v-if="project">
      <Poster :tilt="-0.5" :seed="project.slug.length" :torn="['top', 'bottom', 'right']">
        <NeonAscii :art="art" :label="project.name" :color="glow" :max="16" tag="h1" />
        <p class="detail__tagline">{{ project.tagline }}</p>
      </Poster>

      <div class="detail__grid">
        <PaperCard variant="notebook" :tilt="0.5" class="detail__body" :style="{ '--accent': `var(--${glow === 'rust' ? 'rust' : `neon-${glow}`})` }">
          <Tape pos="tl" />
          <p>{{ project.summary }}</p>
          <ul v-if="project.highlights.length" class="detail__hl">
            <li v-for="h in project.highlights" :key="h">{{ h }}</li>
          </ul>
        </PaperCard>

        <PaperCard :tilt="-0.8" crop class="detail__meta">
          <dl>
            <dt class="stencil">Stack</dt>
            <dd class="detail__stack">
              <span v-for="s in project.stack" :key="s" class="tag" :class="{ 'tag--rust': s === 'Rust' }">{{ s }}</span>
            </dd>
            <dt class="stencil">Status</dt>
            <dd>{{ project.status }}</dd>
            <template v-if="project.updated">
              <dt class="stencil">Atualizado</dt>
              <dd><time :datetime="project.updated">{{ monthLabel(project.updated) }}</time></dd>
            </template>
            <dt class="stencil">Código</dt>
            <dd>
              <a v-if="project.visibility === 'public' && project.repo" :href="`https://github.com/${project.repo}`" target="_blank" rel="noopener">
                github.com/{{ project.repo }} ↗
              </a>
              <span v-else-if="project.repo">repositório privado</span>
              <span v-else>sem repositório público</span>
            </dd>
            <template v-if="stats">
              <dt class="stencil">GitHub</dt>
              <dd>★ {{ stats.stars }} · último push {{ date(stats.pushed_at) }}</dd>
            </template>
          </dl>
        </PaperCard>
      </div>

      <PaperCard v-if="diagram" tag="figure" :tilt="-0.3" crop class="detail__arch">
        <Tape pos="tr" :angle="5" />
        <figcaption class="detail__arch-title stencil">Arquitetura</figcaption>
        <!-- rolagem só dentro do papel em telas estreitas: abaixo de ~640px o texto do diagrama ficaria ilegível -->
        <div class="detail__arch-scroll" tabindex="0" aria-label="Diagrama de arquitetura (role para os lados no celular)">
          <div class="detail__arch-svg" v-html="diagram" />
        </div>
      </PaperCard>
    </template>

    <PaperCard v-else variant="notebook">
      <p>Esse projeto não existe (ainda). <RouterLink to="/#projetos">Ver todos</RouterLink>.</p>
    </PaperCard>
  </div>
</template>

<style scoped>
.back {
  display: inline-block;
  padding: 0.5rem 0;
  margin-bottom: 1.5rem;
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--on-bg);
}
.detail__tagline { margin: 1.2rem 0 0; font-size: 1.15rem; }
.detail__grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
  margin-top: 2.5rem;
  align-items: start;
}
.detail__body p { margin-top: 0; }
.detail__hl { margin: 0; padding: 0; list-style: none; }
.detail__hl li { position: relative; padding-left: 1.3rem; }
.detail__hl li + li { margin-top: 0.4rem; }
/* mesmo marcador dos cartões de destaque: losango do vitral na cor do projeto */
.detail__hl li::before {
  content: '';
  position: absolute;
  left: 0.15rem;
  top: 0.45em;
  width: 0.55rem;
  height: 0.55rem;
  background: var(--accent, var(--neon-cyan));
  border: 1.5px solid var(--ink);
  rotate: 45deg;
}
.detail__meta dl { margin: 0; }
.detail__meta dt { font-size: 1.15rem; margin-top: 0.9rem; }
.detail__meta dt:first-child { margin-top: 0; }
.detail__meta dd { margin: 0.2rem 0 0; }
.detail__stack { display: flex; flex-wrap: wrap; gap: 0.35rem; }
@media (max-width: 760px) { .detail__grid { grid-template-columns: minmax(0, 1fr); } }
.detail__body, .detail__meta { overflow-wrap: anywhere; }
.detail__arch { margin: 2.5rem 0 0; }
.detail__arch-title { margin: 0 0 1rem; font-size: 1.5rem; }
.detail__arch-scroll { overflow-x: auto; overscroll-behavior-x: contain; scrollbar-width: thin; scrollbar-color: var(--ink-soft) transparent; }
.detail__arch-svg { min-width: 640px; }
.detail__arch-svg :deep(svg) { display: block; width: 100%; height: auto; }
</style>
