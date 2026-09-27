<script setup lang="ts">
// Stack derivada dos projetos: cada tecnologia aponta onde é usada.
import SectionTitle from '@/components/SectionTitle.vue'
import PaperCard from '@/components/collage/PaperCard.vue'
import Poster from '@/components/collage/Poster.vue'
import RustCore from '@/components/neon/RustCore.vue'
import { stack, findProject } from '@/lib/content'

const name = (slug: string) => findProject(slug)?.name ?? slug
const tilts = [-0.8, 0.7, -0.5, 0.9]
</script>

<template>
  <section id="stack" class="section wrap">
    <SectionTitle title="Stack" color="purple" />
    <p class="lede">Tecnologias usadas nos meus projetos, com link para cada um.</p>

    <div class="stack">
      <Poster class="stack__main" :tilt="-0.6" :seed="9" :torn="['top', 'right', 'bottom', 'left']">
        <span class="stack__label">linguagem principal</span>
        <div class="stack__rust">
          <RustCore size="clamp(48px, 4.4vw, 64px)" :pulse="false" />
          <p class="stack__rust-name neon neon--rust">{{ stack.main.name }}</p>
        </div>
        <p class="stack__rust-text">{{ stack.main.text }}</p>
        <p class="used used--dark">
          <RouterLink v-for="s in stack.main.projects" :key="s" :to="`/projetos/${s}`">{{ name(s) }}</RouterLink>
        </p>
      </Poster>

      <div class="stack__groups">
        <PaperCard v-for="(g, i) in stack.groups" :key="g.title" :tilt="tilts[i % tilts.length]!" class="group">
          <h3 class="group__title stencil">{{ g.title }}</h3>
          <ul class="group__items">
            <li v-for="it in g.items" :key="it.name">
              <strong>{{ it.name }}</strong>
              <span class="used">
                <RouterLink v-for="s in it.projects" :key="s" :to="`/projetos/${s}`">{{ name(s) }}</RouterLink>
              </span>
            </li>
          </ul>
        </PaperCard>
      </div>
    </div>
  </section>
</template>

<style scoped>
.stack {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2.4fr);
  gap: clamp(1.5rem, 3.5vw, 2.75rem);
  align-items: start;
  margin-top: 1.5rem;
}
.stack__main { position: sticky; top: 5rem; }
.stack__main :deep(.poster) { display: grid; gap: 1rem; }
.stack__label {
  width: fit-content;
  padding: 0 0.5rem;
  border: 1.5px solid var(--rust);
  color: var(--rust);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.stack__rust { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 0.75rem; }
.stack__rust-name {
  margin: 0;
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: clamp(2rem, 4.5vw, 3rem);
  letter-spacing: 0.12em;
  line-height: 1;
}
.stack__rust-text { margin: 0; }

.stack__groups {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1.6rem;
  align-items: start;
}
.group { padding: 1rem 1.2rem 1.2rem; }
.group__title { margin: 0 0 0.6rem; font-size: 1.45rem; line-height: 1; }
.group__items { display: grid; gap: 0.55rem; margin: 0; padding: 0; list-style: none; }
.group__items strong { display: block; font-size: 1rem; line-height: 1.25; }

/* "usado em": links discretos para os projetos */
.used { display: flex; flex-wrap: wrap; gap: 0.1rem 0.6rem; margin: 0.1rem 0 0; font-family: var(--font-mono); font-size: 0.74rem; }
.used a { color: var(--ink-soft); text-decoration-style: dotted; }
.used a:hover { color: var(--ink); }
.used--dark a { color: var(--on-bg-soft); font-size: 0.8rem; }
.used--dark a:hover { color: var(--on-bg); }

@media (max-width: 900px) {
  .stack { grid-template-columns: 1fr; }
  .stack__main { position: static; }
}
@media (max-width: 560px) {
  .stack__groups { grid-template-columns: 1fr; }
}
</style>
