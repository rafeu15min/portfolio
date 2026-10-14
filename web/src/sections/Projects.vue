<script setup lang="ts">
import SectionTitle from '@/components/SectionTitle.vue'
import ProjectCard from '@/components/ProjectCard.vue'
import FeaturedProject from '@/components/FeaturedProject.vue'
import { projects } from '@/lib/content'

const featured = projects.filter((p) => p.featured)
const others = projects.filter((p) => !p.featured)

// rotações fixas: caos controlado, igual em todo render
const tilts = [0.8, -1.2, 0.4, -0.7, 1.1, -0.9]
const featTilts = [-0.6, 0.7, 0.5, -0.8]
const tapes = ['tl', 'top', 'tr'] as const
</script>

<template>
  <section id="projetos" class="section wrap">
    <SectionTitle title="Projetos" color="cyan" />
    <p class="lede">Projetos pessoais e de estudo, com link para o código quando ele é público.</p>

    <ul class="featured">
      <li v-for="(p, i) in featured" :key="p.slug">
        <FeaturedProject :project="p" :tilt="featTilts[i % featTilts.length]!" :seed="i * 7 + 3" />
      </li>
    </ul>

    <h3 class="others-title stencil">Outros projetos e estudos</h3>
    <ul class="grid">
      <li v-for="(p, i) in others" :key="p.slug">
        <ProjectCard :project="p" :tilt="tilts[i % tilts.length]!" :tape="tapes[i % tapes.length]!" compact />
      </li>
    </ul>
  </section>
</template>

<style scoped>
.featured {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 460px), 1fr));
  gap: clamp(2rem, 4vw, 3.25rem);
  margin: 2.75rem 0 0;
  padding: 0;
  list-style: none;
}
.others-title {
  margin: clamp(3.5rem, 7vw, 5rem) 0 0;
  color: var(--on-bg);
  font-size: clamp(1.4rem, 2.6vw, 1.9rem);
  letter-spacing: 0.03em;
}
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
  gap: clamp(1.5rem, 3vw, 2.25rem);
  margin: 1.5rem 0 0;
  padding: 0;
  list-style: none;
}
</style>
