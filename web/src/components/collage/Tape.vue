<script setup lang="ts">
// Fita crepe digital: decorativa, fora da árvore de acessibilidade.
const props = withDefaults(
  defineProps<{ pos?: 'tl' | 'tr' | 'top' | 'bl' | 'br'; angle?: number; width?: string }>(),
  { pos: 'top', angle: -4, width: '110px' },
)
</script>

<template>
  <span class="tape" :class="`tape--${props.pos}`" :style="{ '--angle': `${props.angle}deg`, '--w': props.width }" aria-hidden="true" />
</template>

<style scoped>
.tape {
  position: absolute;
  z-index: var(--z-neon);
  width: var(--w);
  height: 30px;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 0.25), transparent 40%, rgb(0 0 0 / 0.05)),
    var(--tape);
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.15);
  pointer-events: none;
  transition:
    opacity 0.25s ease calc(var(--reveal-delay, 0ms) + 450ms),
    scale 0.35s cubic-bezier(0.3, 1.4, 0.5, 1) calc(var(--reveal-delay, 0ms) + 450ms);
  clip-path: polygon(
    0 8%, 4% 0, 8% 10%, 12% 2%, 16% 8%, 20% 0, 80% 0, 84% 7%, 88% 1%, 92% 9%, 96% 0, 100% 6%,
    100% 92%, 96% 100%, 92% 91%, 88% 99%, 84% 92%, 80% 100%, 20% 100%, 16% 93%, 12% 100%, 8% 91%, 4% 100%, 0 94%
  );
}
.tape--top { top: -14px; left: 50%; transform: translateX(-50%) rotate(var(--angle)); }
.tape--tl { top: -10px; left: -22px; transform: rotate(calc(var(--angle) - 38deg)); }
.tape--tr { top: -10px; right: -22px; transform: rotate(calc(var(--angle) + 42deg)); }
.tape--bl { bottom: -10px; left: -22px; transform: rotate(calc(var(--angle) + 40deg)); }
.tape--br { bottom: -10px; right: -22px; transform: rotate(calc(var(--angle) - 40deg)); }
</style>
