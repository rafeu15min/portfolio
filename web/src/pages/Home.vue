<script setup lang="ts">
import Hero from '@/sections/Hero.vue'
import Manifesto from '@/sections/Manifesto.vue'
import Stack from '@/sections/Stack.vue'
import Projects from '@/sections/Projects.vue'
import Trajectory from '@/sections/Trajectory.vue'
import Devotion from '@/sections/Devotion.vue'
import Contact from '@/sections/Contact.vue'
</script>

<template>
  <Hero />
  <!-- projetos primeiro: são o que o visitante veio ver -->
  <Projects />
  <Manifesto />
  <Stack />
  <Trajectory />
  <Devotion />
  <Contact />
</template>
