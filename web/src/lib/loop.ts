// v-loop: vídeo curto em repetição contínua, como um GIF — mas só enquanto está na
// tela (ao sair, pausa; nada baixa antes de aparecer, porque o <video> usa
// preload="none"). Com prefers-reduced-motion o vídeo fica parado na capa e
// ganha os controles, para a pessoa tocar se quiser.
import type { Directive } from 'vue'

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

let io: IntersectionObserver | undefined
const observer = () =>
  (io ??= new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const v = e.target as HTMLVideoElement
        if (e.isIntersecting) v.play().catch(() => (v.controls = true)) // autoplay barrado: deixa o play à mão
        else v.pause()
      }
    },
    { threshold: 0.25 },
  ))

export const loop: Directive<HTMLVideoElement> = {
  mounted(v) {
    if (reduced()) {
      v.controls = true
      return
    }
    observer().observe(v)
  },
  unmounted(v) {
    io?.unobserve(v)
  },
}
