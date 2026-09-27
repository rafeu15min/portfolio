// Vitral do fundo do nicho, desenhado por código num canvas (sem imagem
// externa): mosaico de vidro no estilo da Sainte-Chapelle — azul profundo
// dominante, bordas de pérolas, medalhões com raios coloridos e chumbo
// escuro entre as peças. A mesma textura cobre o vidro (UV da janela,
// ver tools/models/capela.py) e é projetada pela luz que entra na cena.
import * as THREE from 'three'

// janela em "unidades de desenho" do gerador da capela: x ∈ [-32, 32], z ∈ [96, 177]
const X0 = -32
const Z1 = 177
const S = 16 // px por unidade → 1024 × 1296
const W = 64 * S
const H = 81 * S

const LEAD = '#0b0806'
const BLUES = ['#1c3aa8', '#2447c4', '#15308f', '#3056d6', '#1a2c86', '#2a4fd0']
const RUBIES = ['#a8102b', '#c01d3a', '#8a0c22']
const GOLDS = ['#d99a2b', '#e8b447']
const GREENS = ['#1c7a42', '#23904f']
const PALE = '#a9bde8'

function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32
}

const px = (x: number, z: number): [number, number] => [(x - X0) * S, (Z1 - z) * S]

/** arco ogival (mesma construção do gerador da capela) */
function archPoints(cx: number, hw: number, floor: number, spring: number, rise: number, n = 36) {
  const r = (rise * rise + hw * hw) / (2 * hw)
  const c = r - hw
  const a0 = Math.PI
  const a1 = Math.atan2(rise, -c)
  const left: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n
    left.push([cx + c + r * Math.cos(a), spring + r * Math.sin(a)])
  }
  const right = left.map(([x, z]) => [2 * cx - x, z] as [number, number]).reverse()
  return [[cx - hw, floor] as [number, number], ...left, ...right.slice(1), [cx + hw, floor] as [number, number]]
}

export function stainedGlassTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const g = canvas.getContext('2d')!
  const rand = rng(1248)
  const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)]!
  const jitter = (hex: string) => {
    // cada peça de vidro tem um tom um pouco diferente
    const c = new THREE.Color(hex)
    c.offsetHSL(0, (rand() - 0.5) * 0.08, (rand() - 0.5) * 0.09)
    return `#${c.getHexString()}`
  }
  const piece = (pts: [number, number][], color: string, lead = 3.5) => {
    g.beginPath()
    pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
    g.closePath()
    g.fillStyle = jitter(color)
    g.fill()
    g.lineWidth = lead
    g.strokeStyle = LEAD
    g.stroke()
  }
  const disc = (x: number, z: number, r: number, color: string, lead = 3.5) => {
    const [cx, cy] = px(x, z)
    g.beginPath()
    g.arc(cx, cy, r * S, 0, Math.PI * 2)
    g.fillStyle = jitter(color)
    g.fill()
    g.lineWidth = lead
    g.strokeStyle = LEAD
    g.stroke()
  }

  // ---- fundo: losangos de vidro, azul dominante ----
  g.fillStyle = LEAD
  g.fillRect(0, 0, W, H)
  const step = 2.3 * S
  for (let row = -1; row * (step / 2) < H + step; row++) {
    for (let col = -1; col * step < W + step; col++) {
      const cx = col * step + (row % 2 ? step / 2 : 0)
      const cy = row * (step / 2)
      const t = rand()
      const color = t < 0.82 ? pick(BLUES) : t < 0.93 ? pick(RUBIES) : t < 0.97 ? pick(GOLDS) : pick(GREENS)
      piece([[cx, cy - step / 2], [cx + step / 2, cy], [cx, cy + step / 2], [cx - step / 2, cy]], color, 3)
    }
  }

  // ---- lancetas: borda de pérolas + medalhões ----
  for (const cx of [-18.5, 18.5]) {
    // borda: pérolas rubi/douradas seguindo o contorno, um pouco para dentro
    const border = archPoints(cx, 13.5 - 1.3, 96 + 1.3, 128, 22 - 1.3, 60)
    let acc = 0
    for (let i = 1; i < border.length; i++) {
      const [ax, az] = border[i - 1]!
      const [bx, bz] = border[i]!
      const len = Math.hypot(bx - ax, bz - az)
      for (let d = 0; d < len; d += 0.4) {
        acc += 0.4
        if (acc < 1.9) continue
        acc = 0
        const t = d / len
        disc(ax + (bx - ax) * t, az + (bz - az) * t, 0.75, rand() < 0.5 ? pick(RUBIES) : pick(GOLDS), 2.5)
      }
    }

    // medalhões empilhados
    for (const mz of [103, 114.5, 126, 138.5]) {
      const R = mz > 134 ? 4.2 : 4.7
      disc(cx, mz, R + 0.55, pick(GOLDS), 4) // aro dourado
      disc(cx, mz, R, pick(RUBIES), 4) // campo rubi
      // raios coloridos (8 cunhas)
      const [ccx, ccy] = px(cx, mz)
      const inner = R * 0.72 * S
      for (let k = 0; k < 8; k++) {
        const a0 = (k / 8) * Math.PI * 2 + Math.PI / 8
        const a1 = a0 + Math.PI / 4
        piece(
          [
            [ccx, ccy],
            [ccx + Math.cos(a0) * inner, ccy + Math.sin(a0) * inner],
            [ccx + Math.cos((a0 + a1) / 2) * inner * 1.08, ccy + Math.sin((a0 + a1) / 2) * inner * 1.08],
            [ccx + Math.cos(a1) * inner, ccy + Math.sin(a1) * inner],
          ],
          [pick(GOLDS), pick(GREENS), PALE, pick(BLUES)][k % 4]!,
          3,
        )
      }
      disc(cx, mz, R * 0.26, pick(GOLDS), 3.5) // centro
      // pérolas no aro
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2
        disc(cx + Math.cos(a) * (R + 0.28), mz + Math.sin(a) * (R + 0.28), 0.32, PALE, 1.5)
      }
    }
  }

  // ---- rosácea (quadrifólio): lóbulos rubi e uma cruz no centro ----
  const Q = { x: 0, z: 163.5 }
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2
    const lx = Q.x + 6 * Math.cos(a)
    const lz = Q.z + 6 * Math.sin(a)
    disc(lx, lz, 3.3, pick(RUBIES), 4)
    disc(lx, lz, 1.5, pick(GOLDS), 3)
  }
  disc(Q.x, Q.z, 4.3, pick(GOLDS), 4.5)
  disc(Q.x, Q.z, 3.4, pick(BLUES), 3.5)
  // cruz rubi no centro
  const [qx, qy] = px(Q.x, Q.z)
  const arm = 2.6 * S
  const thick = 0.75 * S
  piece([[qx - thick, qy - arm], [qx + thick, qy - arm], [qx + thick, qy + arm], [qx - thick, qy + arm]], RUBIES[1]!, 3)
  piece([[qx - arm * 0.75, qy - thick - arm * 0.2], [qx + arm * 0.75, qy - thick - arm * 0.2], [qx + arm * 0.75, qy + thick - arm * 0.2], [qx - arm * 0.75, qy + thick - arm * 0.2]], RUBIES[1]!, 3)

  // ---- imperfeições do vidro: bolhas e estrias ----
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = rand() < 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'
    g.fillRect(rand() * W, rand() * H, 1 + rand() * 3, 1 + rand() * 6)
  }

  // ---- luz de fora: mais forte no centro (o sol atrás), mais fraca nas bordas ----
  const [sx, sy] = px(0, 142)
  g.globalCompositeOperation = 'lighter'
  const sun = g.createRadialGradient(sx, sy, 0, sx, sy, 46 * S)
  sun.addColorStop(0, 'rgba(255,236,200,0.34)')
  sun.addColorStop(0.5, 'rgba(255,220,170,0.1)')
  sun.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = sun
  g.fillRect(0, 0, W, H)
  g.globalCompositeOperation = 'multiply'
  const edge = g.createRadialGradient(sx, sy, 20 * S, sx, sy, 62 * S)
  edge.addColorStop(0, 'rgba(255,255,255,1)')
  edge.addColorStop(1, 'rgba(120,120,150,1)')
  g.fillStyle = edge
  g.fillRect(0, 0, W, H)
  g.globalCompositeOperation = 'source-over'

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.flipY = false // UV do glTF: v=0 no topo da janela
  tex.anisotropy = 8
  return tex
}
