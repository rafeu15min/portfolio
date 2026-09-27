// v-reveal: o elemento começa "fora" (data-reveal="out") e passa a "in" quando
// entra na tela — o CSS de cada componente decide como ele chega (papel
// assentando, neon acendendo...). Ao sair TOTALMENTE da tela ele volta a
// "out" (fora da vista, ninguém vê), então rolar de volta monta tudo de novo,
// nos dois sentidos. Entre 0% e 12% visível o estado não muda: sem piscar na
// borda da tela. Atributo data-* em vez de classe: o Vue
// reescreve `class` ao re-renderizar e apagaria a marcação.
import type { Directive } from 'vue'

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

const ENTER = 0.12 // fração visível para montar

let io: IntersectionObserver | undefined
const observer = () =>
  (io ??= new IntersectionObserver(
    (entries) => {
      // vários entrando juntos → cascata, um depois do outro
      let order = 0
      for (const e of entries) {
        const el = e.target as HTMLElement
        if (e.intersectionRatio >= ENTER && el.dataset.reveal !== 'in') {
          el.style.setProperty('--reveal-delay', `${Math.min(order++, 6) * 90}ms`)
          el.dataset.reveal = 'in'
        } else if (!e.isIntersecting && el.dataset.reveal !== 'out') {
          el.style.setProperty('--reveal-delay', '0ms')
          el.dataset.reveal = 'out'
        }
      }
    },
    { threshold: [0, ENTER] },
  ))

export const reveal: Directive<HTMLElement> = {
  mounted(el) {
    if (reduced() || !('IntersectionObserver' in window)) {
      el.dataset.reveal = 'in'
      return
    }
    el.dataset.reveal = 'out'
    observer().observe(el)
  },
  unmounted(el) {
    io?.unobserve(el)
  },
}
