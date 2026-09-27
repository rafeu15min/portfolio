<script setup lang="ts">
import PaperCard from './collage/PaperCard.vue'
import Tape from './collage/Tape.vue'
import type { Project } from '@/lib/content'

defineProps<{ project: Project; tilt: number; tape: 'tl' | 'tr' | 'top' }>()
</script>

<template>
  <PaperCard tag="article" :tilt="tilt" class="card" :class="`card--${project.accent}`" crop>
    <Tape :pos="tape" :angle="tilt * 2" />
    <header class="card__head">
      <h3 class="card__name stencil">
        <RouterLink :to="`/projetos/${project.slug}`" class="card__link">{{ project.name }}</RouterLink>
      </h3>
      <span class="card__status">{{ project.status }}</span>
    </header>
    <p class="card__tagline">{{ project.tagline }}</p>
    <ul class="card__stack" aria-label="Stack">
      <li v-for="s in project.stack" :key="s" class="tag" :class="{ 'tag--rust': s === 'Rust' }">{{ s }}</li>
    </ul>
    <footer class="card__foot">
      <a v-if="project.visibility === 'public' && project.repo" :href="`https://github.com/${project.repo}`" target="_blank" rel="noopener">código ↗</a>
      <span v-else-if="project.repo" class="card__private">🔒 repo privado</span>
      <span v-else class="card__private">sem repo público</span>
      <span aria-hidden="true" class="card__more">detalhes →</span>
    </footer>
  </PaperCard>
</template>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  height: 100%;
  border-top: 5px solid var(--accent);
}
.card:hover,
.card:focus-within {
  transform: rotate(0deg) translateY(-3px);
  box-shadow: 2px 3px 0 rgb(0 0 0 / 0.3), 8px 16px 22px rgb(40 25 5 / 0.3);
}
.card--rust { --accent: var(--rust); }
.card--cyan { --accent: var(--neon-cyan); }
.card--pink { --accent: var(--neon-pink); }
.card--purple { --accent: var(--neon-purple); }

.card__head { display: flex; justify-content: space-between; align-items: baseline; gap: 0.75rem; }
.card__name { margin: 0; font-size: 1.7rem; line-height: 1.05; }
.card__link { text-decoration: none; }
/* o card inteiro é clicável pelo link do título */
.card__link::after { content: ''; position: absolute; inset: 0; z-index: 1; }
.card__status {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0 0.4rem;
  border: 1.5px dashed var(--ink);
}
.card__tagline { margin: 0; flex: 1; }
.card__stack { display: flex; flex-wrap: wrap; gap: 0.4rem; margin: 0; padding: 0; list-style: none; }
.card__foot {
  display: flex;
  justify-content: space-between;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  font-weight: 700;
}
.card__foot a { position: relative; z-index: 2; }
.card__private { color: var(--ink-soft); }
</style>
