<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const links = [
  ['manifesto', 'manifesto'],
  ['stack', 'stack'],
  ['projetos', 'projetos'],
  ['trajetoria', 'trajetória'],
  ['devocao', 'devoção'],
  ['contato', 'contato'],
] as const

const open = ref(false)
const route = useRoute()
const href = (id: string) => (route.path === '/' ? `#${id}` : `/#${id}`)
</script>

<template>
  <header class="nav">
    <nav class="nav__strip tex-newsprint wrap" aria-label="Principal">
      <RouterLink to="/" class="nav__logo" @click="open = false">[RAFEU]</RouterLink>
      <button class="nav__toggle" :aria-expanded="open" aria-controls="nav-links" @click="open = !open">
        {{ open ? 'fechar' : 'menu' }}
      </button>
      <ul id="nav-links" class="nav__links" :class="{ open }">
        <li v-for="[id, text] in links" :key="id">
          <a :href="href(id)" @click="open = false">{{ text }}</a>
        </li>
      </ul>
    </nav>
  </header>
</template>

<style scoped>
.nav {
  position: sticky;
  top: 0;
  z-index: 50;
  padding-top: 0.5rem;
}
.nav__strip {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 3.2rem;
  box-shadow: var(--paper-shadow);
}
.nav__logo {
  font-family: var(--font-mono);
  font-weight: 700;
  text-decoration: none;
  letter-spacing: 0.05em;
}
.nav__links {
  display: flex;
  gap: clamp(0.75rem, 2vw, 1.75rem);
  margin: 0;
  padding: 0;
  list-style: none;
}
.nav__links a {
  font-family: var(--font-stencil);
  font-weight: 800;
  font-size: 1.1rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  text-decoration: none;
}
.nav__links a:hover {
  text-decoration: underline wavy var(--neon-pink);
  text-underline-offset: 5px;
}
.nav__toggle {
  display: none;
  border: 2px solid var(--ink);
  background: transparent;
  font-family: var(--font-mono);
  font-weight: 700;
  padding: 0.2rem 0.7rem;
  cursor: pointer;
}

@media (max-width: 720px) {
  .nav__toggle { display: block; min-height: 44px; min-width: 64px; }
  .nav__links {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    flex-direction: column;
    gap: 0;
    padding: 0.5rem var(--gutter) 1rem;
    background: var(--newsprint);
    box-shadow: var(--paper-shadow);
  }
  .nav__links.open { display: flex; }
  .nav__links a { display: block; padding: 0.7rem 0; min-height: 44px; }
}
</style>
