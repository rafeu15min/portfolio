<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import SiteNav from './components/SiteNav.vue'
import SiteFooter from './components/SiteFooter.vue'

// Um único ouvinte de rolagem (passivo, no máximo um cálculo por quadro)
// publica --scroll (px) e --progress (0–1) para o CSS: barra de progresso e
// camadas de profundidade. Só transform/opacity mudam → nada é repintado.
let frame = 0
const root = document.documentElement
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches

function update() {
  frame = 0
  const max = root.scrollHeight - innerHeight
  root.style.setProperty('--progress', max > 0 ? (scrollY / max).toFixed(4) : '0')
  if (!reduced) root.style.setProperty('--scroll', String(Math.round(scrollY)))
}
const onScroll = () => {
  if (!frame) frame = requestAnimationFrame(update)
}

onMounted(() => {
  addEventListener('scroll', onScroll, { passive: true })
  addEventListener('resize', onScroll, { passive: true })
  update()
})
onBeforeUnmount(() => {
  removeEventListener('scroll', onScroll)
  removeEventListener('resize', onScroll)
  cancelAnimationFrame(frame)
})
</script>

<template>
  <div class="app tex-paper">
    <div class="progress" aria-hidden="true" />
    <!-- profundidade: luzes neon que andam mais devagar que o conteúdo -->
    <div class="depth" aria-hidden="true">
      <span class="glow glow--purple" />
      <span class="glow glow--cyan" />
      <span class="glow glow--pink" />
      <span class="glow glow--purple glow--low" />
    </div>
    <a class="skip" href="#conteudo">pular para o conteúdo</a>
    <SiteNav />
    <main id="conteudo">
      <RouterView />
    </main>
    <SiteFooter />
  </div>
</template>

<style scoped>
.app { position: relative; min-height: 100svh; overflow-x: clip; }
main { position: relative; z-index: 1; }

.progress {
  position: fixed;
  inset: 0 0 auto 0;
  z-index: 70;
  height: 3px;
  transform: scaleX(var(--progress, 0));
  transform-origin: left;
  background: linear-gradient(90deg, var(--neon-cyan), var(--neon-pink), var(--neon-purple));
  box-shadow: 0 0 8px var(--neon-pink), 0 0 18px color-mix(in srgb, var(--neon-purple) 60%, transparent);
  pointer-events: none;
}

.depth {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}
.glow {
  position: absolute;
  width: 70vmax;
  aspect-ratio: 1;
  border-radius: 50%;
  will-change: translate;
  /* sobe mais devagar que a página: parece estar mais ao fundo */
  translate: 0 calc(var(--scroll, 0) * var(--depth) * 1px);
}
.glow--purple { --depth: 0.45; top: -20vmax; left: -25vmax; background: radial-gradient(closest-side, rgb(176 38 255 / 0.14), transparent); }
.glow--cyan { --depth: 0.3; top: 38%; right: -30vmax; background: radial-gradient(closest-side, rgb(0 240 255 / 0.08), transparent); }
.glow--pink { --depth: 0.38; top: 62%; left: -30vmax; background: radial-gradient(closest-side, rgb(255 46 151 / 0.08), transparent); }
.glow--low { --depth: 0.22; top: 82%; left: auto; right: -20vmax; }

.skip {
  position: absolute;
  left: -999px;
  top: 0.5rem;
  z-index: 100;
  padding: 0.4rem 0.8rem;
  background: var(--ink);
  color: #fff;
}
.skip:focus { left: 0.5rem; }
</style>
