<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import NeonAscii from '@/components/neon/NeonAscii.vue'
import { devocao } from '@/lib/content'
import { ascii } from '@/generated/ascii'
import type { Chapel } from '@/components/devotion/chapel'

const canvas = ref<HTMLCanvasElement>()
const chapel = shallowRef<Chapel>()
const selected = ref<string | null>(null)
const hovered = ref<string | null>(null)
const progress = ref({ loaded: 0, total: devocao.pieces.length })
const webglFailed = ref(false)

const piece = computed(() => devocao.pieces.find((p) => p.id === selected.value) ?? null)

// painel sem barra de rolagem visível: um esmaecimento embaixo avisa que há
// mais texto e some ao chegar ao fim
const panel = ref<HTMLElement>()
const hasMore = ref(false)
function checkMore() {
  const el = panel.value
  hasMore.value = !!el && el.scrollTop + el.clientHeight < el.scrollHeight - 2
}
watch(selected, async () => {
  await nextTick()
  if (panel.value) panel.value.scrollTop = 0
  checkMore()
})
let panelObserver: ResizeObserver | undefined
// legenda da cena: a imagem sob o mouse; senão a selecionada; senão as instruções
const caption = computed(
  () =>
    devocao.pieces.find((p) => p.id === hovered.value)?.name ??
    piece.value?.name ??
    'arraste para girar · clique numa imagem',
)
const loading = computed(() => progress.value.loaded < progress.value.total)

function select(id: string | null) {
  selected.value = id
  chapel.value?.focus(id)
}

onMounted(async () => {
  document.title = 'Devoção · Rafeu'
  try {
    // three.js só é baixado aqui
    const { createChapel } = await import('@/components/devotion/chapel')
    chapel.value = createChapel({
      canvas: canvas.value!,
      pieces: devocao.pieces,
      reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
      onSelect: (id) => (selected.value = id),
      onHover: (id) => (hovered.value = id),
      onProgress: (loaded, total) => (progress.value = { loaded, total }),
    })
  } catch {
    webglFailed.value = true
  }
})
onMounted(() => {
  panelObserver = new ResizeObserver(checkMore)
  if (panel.value) panelObserver.observe(panel.value)
  checkMore()
})
onBeforeUnmount(() => {
  chapel.value?.dispose()
  panelObserver?.disconnect()
})
</script>

<template>
  <div class="devotion">
    <div class="wrap devotion__head">
      <RouterLink to="/#devocao" class="back">← voltar</RouterLink>
      <NeonAscii :art="ascii.sections['Devoção']" label="Devoção" color="purple" :max="12" tag="h1" />
    </div>

    <div class="stage wrap">
      <div class="stage__view">
        <canvas
          v-show="!webglFailed"
          ref="canvas"
          class="stage__canvas"
          role="img"
          aria-label="Composição em 3D: o Espírito Santo no alto, os arcanjos Gabriel, Miguel e Rafael em volta, e a Sagrada Família ao centro."
        />
        <p v-if="webglFailed" class="stage__fallback">
          Seu navegador não liberou WebGL, então a composição 3D não pôde ser exibida. As informações de cada peça
          continuam ao lado.
        </p>
        <div v-if="loading && !webglFailed" class="stage__loading" role="status">
          carregando modelos {{ progress.loaded }}/{{ progress.total }}
        </div>
        <p class="stage__hint" aria-hidden="true">
          {{ caption }}
        </p>
        <button v-if="selected" class="btn stage__reset" @click="select(null)">visão geral</button>
      </div>

      <aside ref="panel" class="panel" :class="{ 'has-more': hasMore }" aria-live="polite" @scroll.passive="checkMore">
        <nav class="panel__list" aria-label="Peças da composição">
          <button
            v-for="p in devocao.pieces"
            :key="p.id"
            class="panel__item"
            :class="{ active: p.id === selected }"
            :aria-pressed="p.id === selected"
            @click="select(p.id === selected ? null : p.id)"
          >
            {{ p.name }}
          </button>
        </nav>

        <article v-if="piece" class="plaque tex-newsprint">
          <h2 class="plaque__name stencil">{{ piece.name }}</h2>
          <p class="plaque__sub">{{ piece.subtitle }}</p>
          <dl class="plaque__facts">
            <template v-if="piece.meaning"><dt>Nome</dt><dd>“{{ piece.meaning }}”</dd></template>
            <dt>Festa</dt><dd>{{ piece.feast }}</dd>
            <dt>Escritura</dt><dd>{{ piece.refs }}</dd>
          </dl>
          <p>{{ piece.text }}</p>
          <blockquote v-if="piece.prayer" class="plaque__prayer">{{ piece.prayer }}</blockquote>
          <p v-if="piece.credit" class="plaque__credit">
            Modelo 3D:
            <a v-if="piece.creditUrl" :href="piece.creditUrl" target="_blank" rel="noopener">{{ piece.credit }} ↗</a>
            <template v-else>{{ piece.credit }}</template>
          </p>
        </article>
        <!-- estado padrão da placa: a apresentação da composição -->
        <article v-else class="plaque tex-newsprint">
          <p class="plaque__intro">{{ devocao.intro }}</p>
          <p class="plaque__hint">Clique numa imagem ou num nome da lista para ler sobre ela.</p>
        </article>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.devotion { --stage-h: clamp(420px, calc(100svh - 9.5rem), 880px); padding-bottom: 2rem; }
/* cabeçalho compacto: a cena cabe na tela sem rolar */
.devotion__head { display: flex; align-items: center; gap: 1.5rem; padding-top: 1rem; margin-bottom: 1rem; }
.back { flex-shrink: 0; font-family: var(--font-mono); font-weight: 700; color: var(--on-bg); }

.stage {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 1.5rem;
  align-items: start;
}
.stage__view {
  position: relative;
  height: var(--stage-h);
  border: 1px solid rgb(242 193 78 / 0.25);
  box-shadow: 0 0 40px rgb(242 193 78 / 0.08);
}
.stage__canvas { display: block; width: 100%; height: 100%; touch-action: none; }
.stage__fallback { padding: 2rem; color: var(--on-bg); }
.stage__loading,
.stage__hint {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  font-family: var(--font-mono);
  font-size: 0.85rem;
  color: var(--glass-gold-light);
  pointer-events: none;
  white-space: nowrap;
}
.stage__loading { top: 1rem; }
.stage__hint { bottom: 1rem; opacity: 0.8; }
.stage__reset { position: absolute; top: 1rem; right: 1rem; font-size: 0.95rem; }

/* mesma altura da cena; o texto longo rola dentro do painel, não a página */
.panel {
  display: grid;
  align-content: start;
  gap: 1.25rem;
  max-height: var(--stage-h);
  overflow-y: auto;
  /* rola pela roda/touchpad/toque, sem barra visível */
  scrollbar-width: none;
}
.panel::-webkit-scrollbar { display: none; }
.panel.has-more {
  mask-image: linear-gradient(to bottom, #000 calc(100% - 3.5rem), transparent);
}
.plaque__intro { margin: 0; }
.plaque__hint { margin: 0.8rem 0 0; font-size: 0.85rem; font-style: italic; color: var(--ink-soft); }
.panel__list { display: grid; gap: 0.4rem; }
.panel__item {
  display: grid;
  text-align: left;
  padding: 0.55rem 0.8rem;
  border: 1px solid rgb(243 238 230 / 0.2);
  background: transparent;
  color: var(--on-bg);
  font: 700 1rem var(--font-body);
  cursor: pointer;
}
.panel__item:hover { border-color: var(--glass-gold); }
.panel__item.active { border-color: var(--glass-gold); background: rgb(242 193 78 / 0.1); }

/* placa de museu: papel reto, sem rotação — é informação sacra */
.plaque { padding: 1.25rem 1.4rem; box-shadow: var(--paper-shadow); border-top: 4px solid var(--glass-gold); }
.plaque__name { margin: 0; font-size: 1.6rem; line-height: 1.1; }
.plaque__sub { margin: 0.2rem 0 0.8rem; font-weight: 700; }
.plaque__facts { display: grid; grid-template-columns: auto 1fr; gap: 0.2rem 0.8rem; margin: 0 0 0.8rem; font-size: 0.9rem; }
.plaque__facts dt { font-weight: 700; }
.plaque__facts dd { margin: 0; }
.plaque__prayer {
  margin: 0.8rem 0 0;
  padding-left: 0.9rem;
  border-left: 3px solid var(--glass-ruby);
  font-style: italic;
}
.plaque__credit { margin: 0.8rem 0 0; font-size: 0.8rem; color: var(--ink-soft); }

@media (max-width: 900px) {
  .stage { grid-template-columns: 1fr; }
  .stage__view { height: 62svh; }
  .panel { max-height: none; overflow: visible; }
}
</style>
