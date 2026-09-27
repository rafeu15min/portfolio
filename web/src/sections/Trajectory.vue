<script setup lang="ts">
import SectionTitle from '@/components/SectionTitle.vue'
import PaperCard from '@/components/collage/PaperCard.vue'
import { timeline } from '@/lib/content'
</script>

<template>
  <section id="trajetoria" class="section wrap">
    <SectionTitle title="Trajetória" color="pink" />
    <p class="lede">Formação e experiência profissional.</p>
    <ol class="line">
      <li v-for="(t, i) in timeline" :key="i" class="line__item">
        <PaperCard :tilt="i % 2 ? 0.9 : -0.9" :torn="['top', 'bottom']" :seed="i * 13 + 5" class="clip">
          <span class="kind" :class="t.kind === 'trabalho' ? 'kind--work' : 'kind--study'">{{ t.kind }}</span>
          <h3 class="clip__role stencil">{{ t.role }}</h3>
          <p v-if="t.org || t.period" class="clip__org">
            {{ t.org }}<template v-if="t.org && t.period"> · </template>{{ t.period }}
          </p>
          <p v-if="t.text" class="clip__text">{{ t.text }}</p>
        </PaperCard>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.line {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2.5rem 1.75rem;
  margin: 2.5rem 0 0;
  padding: 0;
  list-style: none;
}
.clip { height: 100%; padding-block: 1.6rem; }
.kind {
  display: inline-block;
  padding: 0 0.5rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--ink);
}
.kind--work { background: var(--neon-cyan); }
.kind--study { background: var(--neon-pink); }
.clip__role { margin: 0.5rem 0 0; font-size: 1.45rem; line-height: 1.1; }
.clip__org { margin: 0.2rem 0 0; font-weight: 700; }
.clip__text { margin: 0.6rem 0 0; font-size: 0.95rem; }

@media (max-width: 900px) { .line { grid-template-columns: 1fr 1fr; } }
@media (max-width: 560px) {
  .line { grid-template-columns: 1fr; padding-left: 1.4rem; }
  /* linha vertical no mobile */
  .line::before {
    content: '';
    position: absolute;
    left: 0.35rem;
    top: 0;
    bottom: 0;
    border-left: 3px dashed var(--on-bg);
  }
}
</style>
