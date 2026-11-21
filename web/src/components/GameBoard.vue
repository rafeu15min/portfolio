<script setup lang="ts">
// Painel "Jogar": o jogo do projeto (web/public/jogos/<nome>/) num iframe, no mesmo
// quadro de cartaz das evidências, com os créditos e o aviso de licença embaixo
// (content/projects.json → play). O iframe só carrega depois do clique: o jogo baixa
// ~17 MB (artes, música e o cache offline dele), e quem só lê a página não paga isso.
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import PaperCard from './collage/PaperCard.vue'
import Tape from './collage/Tape.vue'
import type { Play } from '@/lib/content'

defineProps<{ play: Play; name: string }>()

const playing = ref(false)
const frame = ref<HTMLIFrameElement | null>(null)
const startButton = ref<HTMLButtonElement | null>(null)
// o botão "tela cheia" some onde o navegador não a oferece (iPhone), como o do jogo
const canFullscreen = document.fullscreenEnabled

// o foco vai para o jogo: teclado (setas, Esc, I) funciona sem outro clique
async function start() {
  playing.value = true
  await nextTick()
  frame.value?.focus()
}

// tela cheia do quadro do jogo (o botão do próprio jogo faz o mesmo por dentro)
function fullscreen() {
  frame.value?.requestFullscreen().catch(() => {})
}

// "Sair" dentro do jogo: ele avisa a página, que fecha o quadro e volta ao botão "jogar",
// com o foco nele. Só vale mensagem da mesma origem e vinda do próprio iframe.
async function onMessage(e: MessageEvent) {
  if (e.origin !== window.location.origin || e.source !== frame.value?.contentWindow) return
  if (e.data?.tipo !== 'doce-orcamento:sair') return
  if (document.fullscreenElement) void document.exitFullscreen()
  playing.value = false
  await nextTick()
  startButton.value?.focus()
}
onMounted(() => window.addEventListener('message', onMessage))
onBeforeUnmount(() => window.removeEventListener('message', onMessage))
</script>

<template>
  <section id="jogar" class="game tex-poster" aria-labelledby="game-title">
    <h2 id="game-title" class="game__title stencil">Jogar</h2>
    <div class="game__screen">
      <!-- allow="fullscreen" vale no Chrome e no Firefox; o Safari só entende o allowfullscreen -->
      <iframe v-if="playing" ref="frame" :src="play.path" :title="name" allow="fullscreen" allowfullscreen />
      <button v-else ref="startButton" type="button" class="game__start" :aria-label="`jogar ${name} nesta página`" @click="start">
        <img :src="play.cover" alt="" width="1920" height="1080" loading="lazy" decoding="async" />
        <span class="btn btn--neon">jogar ▶</span>
      </button>
    </div>
    <p class="game__info">
      <span>{{ play.hint }}</span>
      <span class="game__links">
        <button v-if="playing && canFullscreen" type="button" class="game__link" @click="fullscreen">tela cheia ⛶</button>
        <a :href="play.path" target="_blank" rel="noopener">abrir em outra aba ↗</a>
      </span>
    </p>

    <PaperCard :tilt="-0.4" crop class="game__credits">
      <Tape pos="tr" :angle="4" />
      <h3 class="game__credits-title stencil">Créditos</h3>
      <dl>
        <template v-for="c in play.credits" :key="c.who">
          <dt>{{ c.who }}</dt>
          <dd>
            <a v-if="c.url" :href="c.url" target="_blank" rel="noopener">{{ c.text }} ↗</a>
            <template v-else>{{ c.text }}</template>
          </dd>
        </template>
      </dl>
      <p class="game__license">{{ play.license }}</p>
    </PaperCard>
  </section>
</template>

<style scoped>
.game {
  position: relative;
  z-index: var(--z-collage);
  margin-top: 2.5rem;
  padding: clamp(1.5rem, 4vw, 2.75rem);
  background-color: var(--poster-raised);
  border-top: 4px solid var(--neon-pink);
}
.game__title {
  margin: 0 0 1.5rem;
  color: var(--on-bg);
  font-size: clamp(1.5rem, 3vw, 2rem);
  letter-spacing: 0.04em;
}
/* a tela do jogo é 16:9 (1920x1080 com tarja); o neon fica no cartaz, nunca no papel */
.game__screen {
  aspect-ratio: 16 / 9;
  background: #000;
  border: 2px solid var(--ink);
  box-shadow: 0 0 0 1px var(--neon-pink), 0 0 22px color-mix(in srgb, var(--neon-pink) 35%, transparent);
}
.game__screen iframe { display: block; width: 100%; height: 100%; border: 0; }
.game__start {
  position: relative;
  display: grid;
  /* botão embaixo, nas listras: o logo da capa fica livre */
  place-items: end center;
  width: 100%;
  height: 100%;
  padding: 0 0 8%;
  border: 0;
  background: none;
  cursor: pointer;
}
.game__start img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.game__start .btn { position: relative; }
.game__start:hover .btn { transform: translate(-1px, -1px); box-shadow: 0 0 0 1px var(--neon-pink), 0 0 28px var(--neon-pink); }
.game__info {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.5rem 1.5rem;
  margin: 1rem 0 0;
  color: var(--on-bg);
  font-size: 0.95rem;
}
.game__info a,
.game__link { color: var(--on-bg); font-family: var(--font-mono); font-weight: 700; white-space: nowrap; }
.game__links { display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem; }
/* o botão imita o link ao lado (sublinhado na mesma altura do `a` do base.css) */
.game__link { padding: 0; border: 0; background: none; font-size: inherit; text-decoration: underline; text-underline-offset: 0.18em; cursor: pointer; }

.game__credits { margin-top: 2rem; }
.game__credits-title { margin: 0 0 0.9rem; font-size: 1.4rem; }
.game__credits dl {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 0.4rem 1.1rem;
  margin: 0;
}
.game__credits dt { font-family: var(--font-mono); font-size: 0.85rem; font-weight: 700; line-height: 1.6; }
.game__credits dd { margin: 0; overflow-wrap: anywhere; }
.game__license { margin: 1.1rem 0 0; font-size: 0.92rem; }

/* celular: o quadro vai de borda a borda, como o das evidências; créditos em uma coluna */
@media (max-width: 600px) {
  .game { margin-inline: calc(-1 * var(--gutter)); padding: 1.25rem 0.75rem 1.5rem; }
  .game__credits dl { grid-template-columns: minmax(0, 1fr); gap: 0.1rem; }
  .game__credits dd + dt { margin-top: 0.55rem; }
}
</style>
