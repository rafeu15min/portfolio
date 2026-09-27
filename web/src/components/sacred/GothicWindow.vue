<script setup lang="ts">
// Vitral: janela gótica em arco ogival com uma cruz latina dourada ao centro,
// sobre vidros em losango (quarry glass) unidos por chumbo.
// Regras (docs/03): estático, sem glitch; nada é posicionado sobre a cruz.
const W = 240
const H = 400
const SPRING = 150 // altura onde o arco começa
const R = 160 // raio dos dois arcos do ogiva

// contorno em arco ogival, recuado `inset` para dentro (moldura).
// Cada arco tem centro na linha de nascença, do lado oposto; o ápice fica
// onde os dois se cruzam, no eixo central.
function arch(inset: number) {
  const x0 = inset
  const x1 = W - inset
  const r = R - inset
  const mid = W / 2
  const apexY = SPRING - Math.sqrt(r * r - (x0 + r - mid) ** 2)
  return `M${x0} ${H - inset} V${SPRING} A${r} ${r} 0 0 1 ${mid} ${apexY.toFixed(2)} A${r} ${r} 0 0 1 ${x1} ${SPRING} V${H - inset} Z`
}

const outer = arch(0)
const inner = arch(14)

// vidros em losango: grade diagonal, tons claros variando (luz atrás)
const tints = ['#9dbbe8', '#86a8de', '#b8cdef', '#a7c4c9', '#c9d8f2']
const S = 26
const quarries: { d: string; fill: string }[] = []
let k = 7
for (let row = -1; row * (S / 2) < H + S; row++) {
  for (let col = -1; col * S < W + S; col++) {
    const cx = col * S + (row % 2 ? S / 2 : 0)
    const cy = row * (S / 2)
    k = (k * 1103515245 + 12345) & 0x7fffffff
    quarries.push({
      d: `M${cx} ${cy - S / 2}L${cx + S / 2} ${cy}L${cx} ${cy + S / 2}L${cx - S / 2} ${cy}Z`,
      fill: tints[k % tints.length]!,
    })
  }
}

// cruz latina: haste 30 de largura, braço à altura de ~1/3
const cross = {
  v: { x: 105, y: 78, w: 30, h: 262 },
  h: { x: 58, y: 140, w: 124, h: 30 },
}
const crossPath = `M${cross.v.x} ${cross.v.y}H${cross.v.x + cross.v.w}V${cross.h.y}H${cross.h.x + cross.h.w}V${cross.h.y + cross.h.h}H${cross.v.x + cross.v.w}V${cross.v.y + cross.v.h}H${cross.v.x}V${cross.h.y + cross.h.h}H${cross.h.x}V${cross.h.y}H${cross.v.x}Z`
</script>

<template>
  <div class="window" aria-hidden="true">
    <div class="window__light" />
    <svg class="window__svg" :viewBox="`-8 -8 ${W + 16} ${H + 16}`">
      <defs>
        <clipPath id="gw-inner"><path :d="inner" /></clipPath>
        <radialGradient id="gw-glow" cx="50%" cy="38%" r="60%">
          <stop offset="0" stop-color="#fff6d6" stop-opacity=".85" />
          <stop offset=".5" stop-color="#fff" stop-opacity=".15" />
          <stop offset="1" stop-color="#000" stop-opacity=".25" />
        </radialGradient>
        <linearGradient id="gw-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#ffe7a3" />
          <stop offset=".5" stop-color="var(--glass-gold)" />
          <stop offset="1" stop-color="#d99a1e" />
        </linearGradient>
      </defs>

      <!-- moldura: vidro azul-profundo com a borda de chumbo -->
      <path :d="outer" fill="#1b2f7a" />

      <!-- losangos -->
      <g clip-path="url(#gw-inner)" stroke="#1a1a1a" stroke-width="2">
        <path v-for="(q, i) in quarries" :key="i" :d="q.d" :fill="q.fill" />
        <rect x="0" y="0" :width="W" :height="H" fill="url(#gw-glow)" stroke="none" />
      </g>

      <!-- cruz: ouro com filete rubi, chumbo em volta -->
      <path :d="crossPath" fill="url(#gw-gold)" stroke="#1a1a1a" stroke-width="5" stroke-linejoin="miter" />
      <path
        :d="`M${cross.v.x + 15} ${cross.v.y + 12}V${cross.v.y + cross.v.h - 12}M${cross.h.x + 12} ${cross.h.y + 15}H${cross.h.x + cross.h.w - 12}`"
        stroke="var(--glass-ruby)"
        stroke-width="5"
        stroke-linecap="round"
        fill="none"
      />

      <!-- moldura interna e externa de chumbo; peitoril -->
      <path :d="inner" fill="none" stroke="#1a1a1a" stroke-width="4" />
      <path :d="outer" fill="none" stroke="#1a1a1a" stroke-width="7" />
      <rect x="-6" :y="H - 6" :width="W + 12" height="12" fill="#2a2330" stroke="#1a1a1a" stroke-width="3" />
    </svg>
  </div>
</template>

<style scoped>
.window {
  position: relative;
  z-index: var(--z-glass);
  aspect-ratio: 256 / 416;
  pointer-events: none;
}
.window__svg {
  position: relative;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 22px rgb(242 193 78 / 0.35)) drop-shadow(0 0 60px rgb(91 130 255 / 0.25));
}
/* celular: um halo só (dois drop-shadows grandes pesavam na rolagem) */
@media (max-width: 820px) {
  .window__svg { filter: drop-shadow(0 0 18px rgb(242 193 78 / 0.35)); }
}
/* luz que atravessa o vidro e banha a parede */
.window__light {
  position: absolute;
  left: 50%;
  top: 40%;
  width: 240%;
  aspect-ratio: 1;
  transform: translate(-50%, -50%);
  background: radial-gradient(
    circle,
    rgb(255 226 154 / 0.28) 0%,
    rgb(91 130 255 / 0.12) 30%,
    transparent 62%
  );
}
</style>
