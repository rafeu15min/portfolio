<script setup lang="ts">
// Cartaz preto colado: a única base permitida para neon (contraste).
import { computed } from 'vue'
import { tornClip, type Side } from '@/lib/torn'

const props = withDefaults(defineProps<{ tilt?: number; torn?: Side[]; seed?: number }>(), {
  tilt: 0,
  torn: () => ['top', 'bottom'],
  seed: 3,
})
const clip = computed(() => tornClip(props.torn, props.seed, 9, 40))
</script>

<template>
  <div v-reveal class="poster-wrap" :style="{ transform: `rotate(${tilt}deg)` }">
    <div class="poster tex-poster" :style="{ clipPath: clip }">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.poster-wrap {
  position: relative;
  z-index: var(--z-collage);
  transition:
    opacity 0.5s ease var(--reveal-delay, 0ms),
    translate 0.8s cubic-bezier(0.2, 0.9, 0.25, 1.1) var(--reveal-delay, 0ms),
    rotate 0.8s cubic-bezier(0.2, 0.9, 0.25, 1.1) var(--reveal-delay, 0ms);
  filter: drop-shadow(2px 4px 0 rgb(0 0 0 / 0.35)) drop-shadow(6px 14px 18px rgb(40 20 0 / 0.35));
}
.poster-wrap[data-reveal='out'] {
  opacity: 0;
  translate: 0 -32px;
  rotate: -5deg;
}
.poster {
  background-color: var(--poster-raised);
  padding: clamp(1.5rem, 4vw, 3rem) clamp(1rem, 4vw, 3rem);
  color: #f3eee6;
}
</style>
