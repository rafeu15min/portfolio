<script setup lang="ts">
import SectionTitle from '@/components/SectionTitle.vue'
import PaperCard from '@/components/collage/PaperCard.vue'
import Tape from '@/components/collage/Tape.vue'
import { devocao } from '@/lib/content'

// o retábulo em texto: mesma hierarquia da cena 3D
const tiers = [['Espírito Santo'], ['São Gabriel', 'São Miguel', 'São Rafael'], ['Sagrada Família']]
</script>

<template>
  <section id="devocao" class="section wrap">
    <SectionTitle title="Devoção" color="purple" />
    <p class="lede">{{ devocao.intro }}</p>
    <div class="devotion">
      <div class="devotion__text">
        <PaperCard variant="newsprint" class="retable">
          <ol class="retable__tiers">
            <li v-for="t in tiers" :key="t[0]">
              <span class="retable__names stencil">{{ t.join(' · ') }}</span>
            </li>
          </ol>
        </PaperCard>
        <RouterLink to="/devocao" class="btn btn--neon">entrar na exposição 3D →</RouterLink>
      </div>

      <!-- foto impressa da cena, reta (conteúdo sacro não gira); a fita fica na margem do
           papel, nunca sobre a imagem (docs/00, lei 4) -->
      <RouterLink to="/devocao" class="devotion__photo" aria-label="Entrar na exposição 3D">
        <PaperCard tag="figure" variant="notebook" class="photo">
          <Tape pos="top" :angle="-2" width="96px" />
          <img
            src="/img/devocao-capela.webp"
            width="784"
            height="596"
            loading="lazy"
            decoding="async"
            alt="A capela da exposição 3D: o Espírito Santo diante do vitral, os três Arcanjos em volta e a Sagrada Família no altar"
          />
        </PaperCard>
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.devotion {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  align-items: center;
  gap: clamp(2rem, 5vw, 4rem);
  margin-top: 1.5rem;
}
.devotion__text { display: grid; gap: 2rem; justify-items: start; }
/* sem tilt: o conteúdo sacro fica reto */
.retable { width: 100%; border-top: 4px solid var(--glass-gold); }
.retable__tiers { display: grid; gap: 0.9rem; margin: 0; padding: 0; list-style: none; text-align: center; }
.retable__names { font-size: clamp(1.2rem, 2.6vw, 1.6rem); line-height: 1.15; }

.devotion__photo { display: block; text-decoration: none; }
.photo { margin: 0; padding: 0.75rem 0.75rem 1.1rem; }
.photo img { display: block; width: 100%; height: auto; border: 1px solid var(--ink); }
/* link: só acende um pouco, como o vitral do topo; nada se mexe */
.devotion__photo:hover .photo img,
.devotion__photo:focus-visible .photo img { filter: brightness(1.08); }
.photo img { transition: filter 0.3s ease; }

@media (max-width: 820px) {
  .devotion { grid-template-columns: minmax(0, 1fr); }
  .devotion__photo { order: -1; }
}
</style>
