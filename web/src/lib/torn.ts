// Borda rasgada determinística: mesmo seed → mesmo rasgo em todo render.
function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
}

export type Side = 'top' | 'right' | 'bottom' | 'left'

/** `clip-path: polygon(...)` com dentes irregulares nos lados pedidos; os demais ficam retos. */
export function tornClip(sides: Side[], seed = 7, depth = 6, teeth = 28): string {
  const r = rng(seed)
  const jag = () => `${(r() * depth).toFixed(1)}px`
  const steps = (fn: (t: string) => string) =>
    Array.from({ length: teeth }, (_, i) => fn(`${((i / teeth) * 100).toFixed(2)}%`))

  // percorre o retângulo no sentido horário, canto a canto
  const pts = [
    ...(sides.includes('top') ? steps((t) => `${t} ${jag()}`) : ['0% 0%']),
    ...(sides.includes('right') ? steps((t) => `calc(100% - ${jag()}) ${t}`) : ['100% 0%']),
    ...(sides.includes('bottom') ? steps((t) => `calc(100% - ${t}) calc(100% - ${jag()})`) : ['100% 100%']),
    ...(sides.includes('left') ? steps((t) => `${jag()} calc(100% - ${t})`) : ['0% 100%']),
  ]
  return `polygon(${pts.join(', ')})`
}
