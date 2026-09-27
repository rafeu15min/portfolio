<script setup lang="ts">
// Contêiner de papel. Só o contêiner gira — o texto dentro nunca (docs/03).
import { computed } from 'vue'
import { tornClip, type Side } from '@/lib/torn'

const props = withDefaults(
  defineProps<{
    tilt?: number
    variant?: 'newsprint' | 'kraft' | 'notebook'
    crop?: boolean
    torn?: Side[]
    seed?: number
    tag?: string
  }>(),
  { tilt: 0, variant: 'newsprint', crop: false, torn: () => [], seed: 7, tag: 'div' },
)

const style = computed(() => ({
  '--tilt': `${props.tilt}deg`,
  ...(props.torn.length ? { clipPath: tornClip(props.torn, props.seed) } : {}),
}))
</script>

<template>
  <component :is="tag" v-reveal class="paper" :class="[`tex-${variant}`, { crop }]" :style="style">
    <slot />
  </component>
</template>

<style scoped>
.paper {
  position: relative;
  z-index: var(--z-collage);
  padding: clamp(1.1rem, 2.5vw, 1.75rem);
  transform: rotate(var(--tilt));
  box-shadow: var(--paper-shadow);
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    opacity 0.5s ease var(--reveal-delay, 0ms),
    translate 0.75s cubic-bezier(0.2, 0.9, 0.25, 1.15) var(--reveal-delay, 0ms),
    rotate 0.75s cubic-bezier(0.2, 0.9, 0.25, 1.15) var(--reveal-delay, 0ms),
    scale 0.75s cubic-bezier(0.2, 0.9, 0.25, 1.15) var(--reveal-delay, 0ms);
}
/* chegando: cai de cima, girado, e assenta na inclinação dele (--tilt) */
.paper[data-reveal='out'] {
  opacity: 0;
  translate: 0 -28px;
  rotate: 7deg;
  scale: 1.05;
}
.tex-kraft { background-color: var(--kraft-dark); }
</style>
