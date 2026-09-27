<script setup lang="ts">
import SectionTitle from '@/components/SectionTitle.vue'
import PaperCard from '@/components/collage/PaperCard.vue'
import Staple from '@/components/collage/Staple.vue'

const pillars = [
  ['01', 'Segurança', 'Segurança de memória, menor privilégio e atenção às dependências.'],
  ['02', 'Performance', 'Otimização orientada por medição e profiling.'],
  ['03', 'Governança', 'Tratamento de dados pessoais de acordo com a LGPD desde o projeto do sistema.'],
] as const
</script>

<template>
  <section id="manifesto" class="section wrap">
    <SectionTitle title="Manifesto" color="pink" />
    <div class="manifesto">
      <PaperCard variant="notebook" :tilt="-0.8" class="manifesto__sheet">
        <Staple x="12%" :angle="-4" />
        <Staple x="80%" :angle="3" />
        <ol class="pillars">
          <li v-for="[n, title, text] in pillars" :key="n">
            <span class="pillars__n">{{ n }}</span>
            <strong class="pillars__t stencil">{{ title }}</strong>
            <span class="pillars__d">{{ text }}</span>
          </li>
        </ol>
      </PaperCard>
    </div>
  </section>
</template>

<style scoped>
.manifesto { display: grid; justify-items: center; gap: 1.5rem; }
.manifesto__sheet { width: min(100%, 760px); padding-left: 3.4rem; }
.pillars { margin: 0; padding: 0; list-style: none; display: grid; gap: 1.2rem; }
.pillars li {
  display: grid;
  grid-template-columns: 2.5rem minmax(7rem, 11rem) 1fr;
  gap: 0.25rem 1rem;
  align-items: baseline;
}
.pillars__n { font-family: var(--font-mono); font-weight: 700; color: var(--glass-ruby); }
.pillars__t { font-size: 1.6rem; line-height: 1; }
@media (max-width: 600px) {
  .pillars li { grid-template-columns: 2rem 1fr; }
  .pillars__d { grid-column: 2; }
}
</style>
