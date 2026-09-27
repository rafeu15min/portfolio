<script setup lang="ts">
import SectionTitle from '@/components/SectionTitle.vue'
import ProjectCard from '@/components/ProjectCard.vue'
import { projects } from '@/lib/content'

// rotações fixas: caos controlado, igual em todo render
const tilts = [0.8, -1.2, 0.4, -0.7, 1.1, -0.9]
const tapes = ['tl', 'top', 'tr'] as const
</script>

<template>
  <section id="projetos" class="section wrap">
    <SectionTitle title="Projetos" color="cyan" />
    <p class="lede">Projetos pessoais e de estudo, com link para o código quando ele é público.</p>
    <ul class="grid">
      <li v-for="(p, i) in projects" :key="p.slug">
        <ProjectCard :project="p" :tilt="tilts[i % tilts.length]!" :tape="tapes[i % tapes.length]!" />
      </li>
    </ul>
  </section>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
  gap: clamp(1.75rem, 3.5vw, 2.75rem);
  margin: 2.5rem 0 0;
  padding: 0;
  list-style: none;
}
</style>
