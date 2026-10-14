<script setup lang="ts">
// Painel de evidências: prints do projeto impressos em papel e colados com fita num
// quadro de cartaz escuro. Só o papel gira (docs/03); a imagem e a legenda ficam retas
// dentro dele. Clicar abre o print em tamanho real.
import Tape from './collage/Tape.vue'
import type { Evidence } from '@/lib/content'

defineProps<{ items: Evidence[] }>()

const tilts = [-1.6, 1.2, -0.8, 1.7]
const tapes = ['tl', 'tr', 'top'] as const
</script>

<template>
  <section class="board tex-poster" aria-labelledby="board-title">
    <h2 id="board-title" class="board__title stencil">Evidências</h2>
    <ul class="board__grid">
      <li v-for="(e, i) in items" :key="e.src" :class="{ wide: e.width / e.height > 2.5 }">
        <figure v-reveal class="print tex-newsprint" :style="{ '--tilt': `${tilts[i % tilts.length]}deg` }">
          <Tape :pos="tapes[i % tapes.length]" :angle="tilts[i % tilts.length]! * -3" width="92px" />
          <a :href="e.src" target="_blank" rel="noopener" class="print__link">
            <img :src="e.src" :width="e.width" :height="e.height" :alt="e.alt" loading="lazy" decoding="async" />
          </a>
          <figcaption class="print__caption">{{ e.caption }}</figcaption>
        </figure>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.board {
  position: relative;
  z-index: var(--z-collage);
  margin-top: 2.5rem;
  padding: clamp(1.5rem, 4vw, 2.75rem);
  background-color: var(--poster-raised);
  border-top: 4px solid var(--neon-pink);
}
.board__title {
  margin: 0 0 1.75rem;
  color: var(--on-bg);
  font-size: clamp(1.5rem, 3vw, 2rem);
  letter-spacing: 0.04em;
}
.board__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 380px), 1fr));
  gap: clamp(2rem, 4vw, 3rem);
  margin: 0;
  padding: 0;
  list-style: none;
  align-items: start;
}
/* print largo e baixo (tela de terminal): ocupa a linha inteira */
.board__grid .wide { grid-column: 1 / -1; }

.print {
  position: relative;
  margin: 0;
  padding: 0.7rem 0.7rem 0.9rem;
  rotate: var(--tilt);
  box-shadow: var(--paper-shadow);
  transition:
    rotate 0.25s ease,
    translate 0.25s ease,
    opacity 0.5s ease var(--reveal-delay, 0ms);
}
.print:hover,
.print:focus-within { rotate: 0deg; translate: 0 -3px; }
.print[data-reveal='out'] { opacity: 0; translate: 0 -20px; }
.print__link { display: block; }
.print img { display: block; width: 100%; height: auto; border: 1px solid var(--ink); }
.print__caption {
  margin: 0.7rem 0.1rem 0;
  font-size: 0.9rem;
  line-height: 1.45;
  color: var(--ink);
}
@media (prefers-reduced-motion: reduce) {
  .print { transition: none; }
  .print[data-reveal='out'] { opacity: 1; translate: none; }
}
</style>
