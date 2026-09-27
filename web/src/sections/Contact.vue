<script setup lang="ts">
import { reactive, ref } from 'vue'
import SectionTitle from '@/components/SectionTitle.vue'
import Poster from '@/components/collage/Poster.vue'
import { sendContact, type ContactResult } from '@/lib/api'

const form = reactive({ name: '', email: '', message: '', consent: false, website: '' })
const state = ref<'idle' | 'sending' | ContactResult>('idle')

const messages: Record<ContactResult, string> = {
  ok: 'Recebido. Respondo em breve.',
  rate_limited: 'Calma — muitas mensagens em pouco tempo. Tenta de novo em um minuto.',
  invalid: 'Confere os campos: nome, e-mail válido e uma mensagem de até 4000 caracteres.',
  error: 'Não deu pra enviar agora. Me chama direto pelo GitHub.',
}

async function submit() {
  state.value = 'sending'
  state.value = await sendContact({ ...form })
  if (state.value === 'ok') Object.assign(form, { name: '', email: '', message: '', consent: false })
}
</script>

<template>
  <section id="contato" class="section wrap">
    <SectionTitle title="Contato" color="pink" />
    <p class="lede">Projeto, vaga ou problema cabeludo de infraestrutura? Escreve.</p>

    <Poster class="term" :tilt="-0.4" :seed="17" :torn="['top', 'bottom']">
      <form class="term__form" @submit.prevent="submit">
        <p class="term__prompt neon neon--cyan" aria-hidden="true">&gt; CONTATO_</p>

        <label class="term__row">
          <span>nome</span>
          <input v-model.trim="form.name" name="name" required maxlength="120" autocomplete="name" />
        </label>
        <label class="term__row">
          <span>e-mail</span>
          <input v-model.trim="form.email" name="email" type="email" required maxlength="200" autocomplete="email" />
        </label>
        <label class="term__row">
          <span>msg</span>
          <textarea v-model="form.message" name="message" required maxlength="4000" rows="5" />
        </label>

        <!-- honeypot: invisível pra humanos, bots preenchem -->
        <label class="hp" aria-hidden="true">
          website <input v-model="form.website" name="website" tabindex="-1" autocomplete="off" />
        </label>

        <label class="term__consent">
          <input v-model="form.consent" type="checkbox" required />
          <span>Autorizo o uso destes dados exclusivamente para responder esta mensagem. Nada é armazenado no servidor.</span>
        </label>

        <div class="term__actions">
          <button class="btn btn--neon" type="submit" :disabled="state === 'sending'">
            {{ state === 'sending' ? 'enviando…' : 'enviar' }}
          </button>
          <p class="term__status" role="status" aria-live="polite">
            {{ state in messages ? messages[state as ContactResult] : '' }}
          </p>
        </div>
      </form>
    </Poster>

    <p class="links">
      <a href="https://github.com/rafeu15min" target="_blank" rel="noopener">github.com/rafeu15min ↗</a>
    </p>
  </section>
</template>

<style scoped>
.term { width: min(100%, 760px); margin-top: 2rem; }
.term__form { display: grid; gap: 1rem; font-family: var(--font-mono); }
.term__prompt { margin: 0 0 0.5rem; font-weight: 700; font-size: 1.4rem; }
.term__row { display: grid; grid-template-columns: 5rem 1fr; gap: 0.75rem; align-items: start; }
.term__row span { padding-top: 0.45rem; color: var(--neon-cyan); font-weight: 700; }
.term input:not([type='checkbox']),
.term textarea {
  width: 100%;
  padding: 0.5rem 0.7rem;
  border: 1px solid color-mix(in srgb, var(--neon-cyan) 50%, transparent);
  background: rgb(255 255 255 / 0.04);
  color: #fff;
  font: inherit;
  font-weight: 400;
  resize: vertical;
}
.term input:focus-visible,
.term textarea:focus-visible {
  outline: none;
  border-color: var(--neon-cyan);
  box-shadow: 0 0 0 1px var(--neon-cyan), 0 0 14px color-mix(in srgb, var(--neon-cyan) 50%, transparent);
}
.term__consent { display: flex; gap: 0.7rem; align-items: flex-start; font-size: 0.85rem; color: #d8d2c8; }
.term__consent input { margin-top: 0.3rem; accent-color: var(--neon-pink); }
.term__actions { display: flex; flex-wrap: wrap; align-items: center; gap: 1rem; }
.term__status { margin: 0; font-size: 0.9rem; color: var(--neon-cyan); }
.hp { position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; }
.links { margin-top: 1.5rem; font-family: var(--font-mono); font-weight: 700; color: var(--on-bg); }
@media (max-width: 480px) {
  .term__row { grid-template-columns: 1fr; gap: 0.25rem; }
  .term__row span { padding-top: 0; }
}
</style>
