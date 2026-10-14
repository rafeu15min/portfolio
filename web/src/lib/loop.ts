// v-loop: vídeo curto em repetição contínua, como um GIF — mas só enquanto pelo menos
// metade dele está na tela. Ao sair, pausa e volta ao início, então quem rola de volta
// vê o vídeo desde o começo. Nada baixa antes de aparecer (o <video> usa preload="none").
// Nunca ganha controles: não há play, pausa nem barra de progresso.
// Com prefers-reduced-motion o vídeo fica parado na capa.
import type { Directive } from 'vue'

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

// vídeos na tela cujo autoplay o navegador barrou (iOS em modo de economia, por
// exemplo): tocam no primeiro toque ou tecla em qualquer lugar da página
const blocked = new Set<HTMLVideoElement>()
const retry = () => {
  for (const v of blocked) v.play().then(() => blocked.delete(v), () => {})
}
const listen = () => {
  for (const ev of ['pointerdown', 'keydown'] as const) addEventListener(ev, retry, { passive: true })
}

// fração do vídeo que precisa estar na tela para contar como "sendo visto"
const SEEN = 0.5

let io: IntersectionObserver | undefined
const observer = () =>
  (io ??= (listen(),
  new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const v = e.target as HTMLVideoElement
        if (e.intersectionRatio >= SEEN) v.play().then(() => blocked.delete(v), () => blocked.add(v))
        else {
          blocked.delete(v)
          v.pause()
          v.currentTime = 0
        }
      }
    },
    { threshold: [0, SEEN] },
  )))

export const loop: Directive<HTMLVideoElement> = {
  mounted(v) {
    if (reduced()) return
    observer().observe(v)
  },
  unmounted(v) {
    blocked.delete(v)
    io?.unobserve(v)
  },
}
