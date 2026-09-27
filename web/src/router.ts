import { createRouter, createWebHistory } from 'vue-router'
import Home from './pages/Home.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/devocao', component: () => import('./pages/Devotion.vue') },
    { path: '/projetos/:slug', component: () => import('./pages/ProjectDetail.vue'), props: true },
    { path: '/:rest(.*)*', redirect: '/' },
  ],
  scrollBehavior(to, _from, saved) {
    if (saved) return saved
    if (to.hash) return { el: to.hash, top: 64 }
    return { top: 0 }
  },
})
