<script setup lang="ts">
import GothicWindow from '@/components/sacred/GothicWindow.vue'
import PaperCard from '@/components/collage/PaperCard.vue'
import Tape from '@/components/collage/Tape.vue'
import NeonAscii from '@/components/neon/NeonAscii.vue'
import { ascii } from '@/generated/ascii'
</script>

<template>
  <section id="inicio" class="hero wrap">
    <div class="hero__text">
      <h1 class="sr-only">Rafael de Paulo — Rafeu</h1>
      <NeonAscii :art="ascii.name" label="RaFeu" color="cyan" flicker :max="44" />

      <PaperCard class="hero__card" variant="notebook" :tilt="-1.1" crop>
        <Tape pos="tl" />
        <Tape pos="tr" :angle="3" />
        <p class="hero__role stencil">Engenheiro de Software · Integrador de IA</p>
        <p class="hero__claim">Desenvolvo em Rust, Python e Java, com foco em segurança e infraestrutura.</p>
      </PaperCard>

      <div class="hero__cta">
        <a class="btn" href="#projetos">ver projetos ↓</a>
        <a class="btn btn--neon" href="#contato">contato</a>
      </div>

    </div>

    <!-- vitral: ao lado, nada por cima (docs/03); leva à exposição de devoção -->
    <RouterLink to="/devocao" class="hero__window" aria-label="Ver a exposição 3D de devoção" title="Ver a exposição de devoção">
      <GothicWindow />
    </RouterLink>
  </section>
</template>

<style scoped>
.hero {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  align-items: center;
  gap: clamp(2rem, 6vw, 5rem);
  min-height: calc(100svh - 4rem);
  padding-block: clamp(2.5rem, 6vw, 4rem);
}
.hero__text { display: grid; gap: 1.75rem; justify-items: start; }
.hero__card { width: min(100%, 540px); }
.hero__role { margin: 0; font-size: clamp(1.3rem, 3vw, 1.9rem); line-height: 1.15; }
.hero__claim { margin: 0.6rem 0 0; }
.hero__cta { display: flex; flex-wrap: wrap; gap: 1rem; }
.hero__window {
  display: block;
  justify-self: center;
  width: min(100%, 340px);
  border-radius: 50% 50% 4px 4px / 30% 30% 4px 4px;
  transition: filter 0.3s ease;
  /* profundidade: desce mais devagar que o texto ao rolar */
  translate: 0 calc(var(--scroll, 0) * 0.18px);
  will-change: translate;
}
/* link: o vitral não se mexe (docs/03), só acende um pouco mais */
.hero__window:hover,
.hero__window:focus-visible { filter: brightness(1.12) drop-shadow(0 0 24px rgb(242 193 78 / 0.45)); }
.hero__window:focus-visible { outline-offset: 6px; }

@media (max-width: 820px) {
  .hero { grid-template-columns: 1fr; min-height: 0; gap: 1.75rem; padding-block: 1.5rem 3rem; }
  /* sem parallax no celular: a rolagem por inércia roda fora do JS, o
     --scroll chega atrasado e o vitral ficava deslocado sobre o título */
  .hero__window { grid-row: 1; width: min(42%, 170px); translate: none; will-change: auto; }
  /* fitas nos cantos sem cobrir o texto */
  .hero__card { padding: 1.9rem 1.5rem 1.4rem; }
  .hero__text { justify-items: center; text-align: center; }
}
</style>
