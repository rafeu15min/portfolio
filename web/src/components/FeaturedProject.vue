<script setup lang="ts">
// Projeto em destaque: tira de cartaz com o nome em ASCII neon (o neon nunca toca
// o papel) + papel com os pontos principais e o carimbo do mês da última atividade.
import { computed } from 'vue'
import PaperCard from './collage/PaperCard.vue'
import Tape from './collage/Tape.vue'
import NeonAscii from './neon/NeonAscii.vue'
import { tornClip } from '@/lib/torn'
import { monthLabel, type Project } from '@/lib/content'
import { ascii } from '@/generated/ascii'

const props = defineProps<{ project: Project; tilt: number; seed: number }>()

const art = computed(() => (ascii.projects as Record<string, string>)[props.project.slug] ?? '')
const glow = computed(() => props.project.accent)
// a tira só rasga embaixo: em cima ela continua o papel
const stripClip = computed(() => tornClip(['bottom'], props.seed, 7, 34))
</script>

<template>
  <PaperCard tag="article" :tilt="tilt" variant="notebook" class="feat" :class="`feat--${project.accent}`" crop>
    <Tape pos="tl" :angle="-8 + tilt" width="96px" />
    <Tape pos="tr" :angle="7 + tilt" width="80px" />

    <header class="feat__strip tex-poster" :style="{ clipPath: stripClip }">
      <h3 class="feat__title">
        <RouterLink :to="`/projetos/${project.slug}`" class="feat__link">
          <NeonAscii :art="art" :label="project.name" :color="glow" :max="13" />
        </RouterLink>
      </h3>
      <span class="feat__status">{{ project.status }}</span>
    </header>

    <div class="feat__lead">
      <p class="feat__tagline">{{ project.tagline }}</p>
      <time v-if="project.updated" class="feat__stamp" :datetime="project.updated">
        <span class="feat__stamp-k">atualizado</span>
        <span class="feat__stamp-v">{{ monthLabel(project.updated) }}</span>
      </time>
    </div>
    <ul v-if="project.highlights.length" class="feat__hl">
      <li v-for="h in project.highlights.slice(0, 3)" :key="h">{{ h }}</li>
    </ul>
    <ul class="feat__stack" aria-label="Stack">
      <li v-for="s in project.stack" :key="s" class="tag" :class="{ 'tag--rust': s === 'Rust' }">{{ s }}</li>
    </ul>
    <footer class="feat__foot">
      <a v-if="project.visibility === 'public' && project.repo" :href="`https://github.com/${project.repo}`" target="_blank" rel="noopener">código ↗</a>
      <span v-else-if="project.repo" class="feat__private">repositório privado</span>
      <span v-else class="feat__private">sem repo público</span>
      <!-- o cartão inteiro leva aos detalhes; o leitor de tela já tem o link do título -->
      <RouterLink :to="`/projetos/${project.slug}`" class="feat__more" tabindex="-1" aria-hidden="true">detalhes →</RouterLink>
    </footer>
  </PaperCard>
</template>

<style scoped>
.feat {
  --accent: var(--neon-cyan);
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  height: 100%;
  padding-top: 0;
}
.feat--rust { --accent: var(--rust); }
.feat--cyan { --accent: var(--neon-cyan); }
.feat--pink { --accent: var(--neon-pink); }
.feat--purple { --accent: var(--neon-purple); }
.feat:hover,
.feat:focus-within {
  transform: rotate(0deg) translateY(-3px);
  box-shadow: 2px 3px 0 rgb(0 0 0 / 0.3), 8px 16px 22px rgb(40 25 5 / 0.3);
}

/* tira de cartaz colada no alto do papel, de borda a borda */
.feat__strip {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin: 0 calc(-1 * clamp(1.1rem, 2.5vw, 1.75rem));
  padding: 1.4rem clamp(1.1rem, 2.5vw, 1.75rem) 1.9rem;
  background-color: var(--poster-raised);
  border-top: 4px solid var(--accent);
}
.feat__title { margin: 0; min-width: 0; flex: 1; font-size: 1rem; }
.feat__link { display: block; text-decoration: none; }
/* o cartão inteiro é clicável: o "detalhes" se estende por ele. Não dá para ser o
   link do título, porque o recorte rasgado da tira cortaria a área clicável. */
.feat__more { color: inherit; text-decoration: none; }
.feat__more::after { content: ''; position: absolute; inset: 0; z-index: 1; }
.feat__status {
  flex-shrink: 0;
  margin-top: 0.15rem;
  padding: 0 0.45rem;
  border: 1.5px dashed var(--on-bg-soft);
  color: var(--on-bg);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
}

/* carimbo de borracha: tinta rubi do vitral, um pouco torta e gasta */
.feat__stamp {
  position: absolute;
  right: -0.3rem;
  top: -0.4rem;
  display: grid;
  justify-items: center;
  padding: 0.2rem 0.55rem 0.25rem;
  border: 2.5px double var(--glass-ruby);
  color: var(--glass-ruby);
  font-family: var(--font-stencil);
  font-weight: 800;
  line-height: 1;
  text-transform: uppercase;
  rotate: -5deg;
  opacity: 0.88;
  mix-blend-mode: multiply;
  pointer-events: none;
}
.feat__stamp-k { font-size: 0.68rem; letter-spacing: 0.12em; }
.feat__stamp-v { font-size: 1.15rem; letter-spacing: 0.04em; }

.feat__lead { position: relative; }
.feat__tagline { margin: 0; padding-right: 6.5rem; font-size: 1.08rem; font-weight: 700; }
.feat__hl {
  display: grid;
  gap: 0.45rem;
  margin: 0;
  padding: 0;
  list-style: none;
  flex: 1;
  font-size: 0.95rem;
}
.feat__hl li { position: relative; padding-left: 1.3rem; }
/* marcador: losango do vitral na cor do projeto, contornado a tinta */
.feat__hl li::before {
  content: '';
  position: absolute;
  left: 0.15rem;
  top: 0.45em;
  width: 0.55rem;
  height: 0.55rem;
  background: var(--accent);
  border: 1.5px solid var(--ink);
  rotate: 45deg;
}
.feat__stack { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0; padding: 0; list-style: none; }
.feat__foot {
  display: flex;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 700;
}
.feat__foot a { position: relative; z-index: 2; }
.feat__private { color: var(--ink-soft); }

@media (max-width: 520px) {
  .feat__tagline { padding-right: 0; padding-top: 2.6rem; }
}
</style>
