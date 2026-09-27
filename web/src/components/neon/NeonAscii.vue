<script setup lang="ts">
// ASCII art em neon: só o traço dos caracteres acende, sem fundo.
// O tamanho da fonte segue a largura disponível (container query), e o
// contêiner nunca passa da largura natural da arte → sem scroll horizontal.
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    art: string
    label: string
    color?: 'cyan' | 'pink' | 'purple' | 'rust'
    flicker?: boolean
    /** tamanho máximo da fonte em px */
    max?: number
    tag?: string
  }>(),
  { color: 'cyan', flicker: false, max: 18, tag: 'div' },
)

const cols = computed(() => Math.max(...props.art.split('\n').map((l) => [...l].length)))
</script>

<template>
  <component
    :is="tag"
    v-reveal
    class="ascii-box"
    :aria-label="label"
    role="img"
    :style="{ '--cols': cols, '--max': `${max}px` }"
  >
    <pre class="ascii neon" :class="[`neon--${color}`, { 'neon--flicker': flicker }]" aria-hidden="true">{{ art }}</pre>
  </component>
</template>

<style scoped>
.ascii-box {
  container-type: inline-size;
  position: relative;
  z-index: var(--z-neon);
  /* largura natural da arte no tamanho máximo, limitada ao espaço disponível */
  width: min(100%, calc(var(--cols) * var(--max) * 0.605));
  margin: 0;
}
.ascii {
  margin: 0;
  font-family: var(--font-mono);
  font-weight: 700;
  /* JetBrains Mono: avanço de 0.6em por caractere */
  font-size: min(var(--max), calc(100cqw / var(--cols) / 0.605));
  line-height: 1.1;
  white-space: pre;
  overflow: visible;
  font-variant-ligatures: none;
}
/* apagado até entrar na tela; então acende piscando, como tubo ligando */
.ascii-box[data-reveal='out'] .ascii {
  opacity: 0.06;
}
.ascii-box[data-reveal='in'] .ascii {
  animation: neon-ignite 1s ease-out var(--reveal-delay, 0ms) both;
}
/* o nome continua com o flicker de sempre depois de acender */
.ascii-box[data-reveal='in'] .ascii.neon--flicker {
  animation:
    neon-ignite 1s ease-out var(--reveal-delay, 0ms) both,
    neon-flicker 7s calc(var(--reveal-delay, 0ms) + 1s) infinite;
}
</style>
