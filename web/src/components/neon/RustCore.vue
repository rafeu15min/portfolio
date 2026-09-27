<script setup lang="ts">
// Engrenagem estilizada com "R" — sinaliza Rust sem alterar o logo oficial
// (ver docs/05-assets.md). Única peça em --rust na dobra.
withDefaults(defineProps<{ size?: string; pulse?: boolean; label?: string }>(), {
  size: '120px',
  pulse: true,
  label: 'Rust',
})
const teeth = Array.from({ length: 28 }, (_, i) => (360 / 28) * i)
</script>

<template>
  <svg class="rust-core" :class="{ pulse }" :style="{ width: size, height: size }" viewBox="0 0 100 100" role="img" :aria-label="label">
    <g fill="var(--rust)">
      <rect v-for="a in teeth" :key="a" x="47" y="2" width="6" height="11" rx="1.2" :transform="`rotate(${a} 50 50)`" />
      <circle cx="50" cy="50" r="40" />
    </g>
    <circle cx="50" cy="50" r="31" fill="var(--poster)" />
    <circle cx="50" cy="50" r="31" fill="none" stroke="var(--rust)" stroke-width="2.5" stroke-dasharray="3 3.3" />
    <!-- "R" desenhado como traço, não como <text>: texto em SVG com filter,
         dentro de um cartaz que anima ao entrar na tela, fica com o brilho
         "congelado" deslocado no Chromium até o próximo redesenho -->
    <path d="M42 65V36h11a8 8 0 0 1 0 16H42M52 52l8 13" fill="none" stroke="var(--rust)" stroke-width="6.5" stroke-linecap="square" stroke-linejoin="miter" />
  </svg>
</template>

<style scoped>
.rust-core {
  display: block;
  flex-shrink: 0; /* não deixa o layout espremer a engrenagem */
  aspect-ratio: 1;
  filter: drop-shadow(0 0 6px var(--rust)) drop-shadow(0 0 18px color-mix(in srgb, var(--rust) 60%, transparent));
}
.pulse { animation: rust-pulse 4s ease-in-out infinite; }
/* celular: o pulso anima um filter, que repinta a cada quadro */
@media (max-width: 820px) {
  .pulse { animation: none; }
}
@media (prefers-reduced-motion: reduce) {
  .pulse { animation: none; }
}
</style>
