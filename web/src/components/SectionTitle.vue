<script setup lang="ts">
// Título de seção: só o neon, traço sem preenchimento, direto sobre o fundo.
import NeonAscii from './neon/NeonAscii.vue'
import { ascii } from '@/generated/ascii'

withDefaults(defineProps<{ title: keyof typeof ascii.sections; color?: 'cyan' | 'pink' | 'purple' }>(), {
  color: 'cyan',
})
</script>

<template>
  <div class="section-title">
    <NeonAscii :art="ascii.sections[title]" :label="title" :color="color" :max="17" tag="h2" />
  </div>
</template>

<style scoped>
.section-title { margin-bottom: clamp(1.25rem, 3vw, 2rem); }
</style>
