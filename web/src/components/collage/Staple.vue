<script setup lang="ts">
withDefaults(defineProps<{ x?: string; angle?: number }>(), { x: '20%', angle: -3 })
</script>

<template>
  <svg class="staple" :style="{ left: x, transform: `rotate(${angle}deg)` }" viewBox="0 0 60 14" aria-hidden="true">
    <path d="M3 11 V4 Q3 2 5 2 H55 Q57 2 57 4 V11" fill="none" stroke="#6b7076" stroke-width="3" stroke-linecap="round" />
    <path d="M5 3.2 H55" stroke="#dfe3e6" stroke-width="1" />
  </svg>
</template>

<style scoped>
.staple {
  position: absolute;
  top: -6px;
  z-index: var(--z-neon);
  width: 52px;
  pointer-events: none;
  filter: drop-shadow(1px 1px 0 rgb(0 0 0 / 0.3));
  transition:
    opacity 0.2s ease calc(var(--reveal-delay, 0ms) + 500ms),
    translate 0.25s cubic-bezier(0.3, 1.6, 0.5, 1) calc(var(--reveal-delay, 0ms) + 500ms);
}
:global([data-reveal='out']) .staple {
  opacity: 0;
  translate: 0 -14px;
}
</style>
