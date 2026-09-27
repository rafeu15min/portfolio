<script setup lang="ts">
import SectionTitle from '@/components/SectionTitle.vue'
import PaperCard from '@/components/collage/PaperCard.vue'
import { devocao } from '@/lib/content'

// o retábulo em texto: mesma hierarquia da cena 3D
const tiers = [['Espírito Santo'], ['São Gabriel', 'São Miguel', 'São Rafael'], ['Sagrada Família']]
</script>

<template>
  <section id="devocao" class="section wrap">
    <SectionTitle title="Devoção" color="purple" />
    <p class="lede">{{ devocao.intro }}</p>
    <div class="devotion">
      <PaperCard variant="newsprint" class="retable">
        <ol class="retable__tiers">
          <li v-for="t in tiers" :key="t[0]">
            <span class="retable__names stencil">{{ t.join(' · ') }}</span>
          </li>
        </ol>
      </PaperCard>
      <RouterLink to="/devocao" class="btn btn--neon">entrar na exposição 3D →</RouterLink>
    </div>
  </section>
</template>

<style scoped>
.devotion { display: flex; flex-wrap: wrap; align-items: center; gap: 2rem; margin-top: 1.5rem; }
/* sem tilt: o conteúdo sacro fica reto */
.retable { flex: 1 1 360px; max-width: 620px; border-top: 4px solid var(--glass-gold); }
.retable__tiers { display: grid; gap: 0.9rem; margin: 0; padding: 0; list-style: none; text-align: center; }
.retable__names { font-size: clamp(1.2rem, 2.6vw, 1.6rem); line-height: 1.15; }
</style>
