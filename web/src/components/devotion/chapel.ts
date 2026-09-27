// Cena da exposição (three.js), sem Vue: cria, anima e descarta.
// Carregada só na rota /devocao (import dinâmico) — a home não paga o peso.
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import type { DevotionPiece } from '@/lib/content'
import { stainedGlassTexture } from './stainedGlass'

export interface Chapel {
  focus(id: string | null): void
  dispose(): void
}

interface Options {
  canvas: HTMLCanvasElement
  pieces: DevotionPiece[]
  reducedMotion: boolean
  onSelect(id: string | null): void
  onHover(id: string | null): void
  onProgress(loaded: number, total: number): void
}

const IVORY = new THREE.Color('#efe6d6')
const GOLD = new THREE.Color('#d9a93a')
// visão inicial: de baixo pra cima, perto — a composição sobe em perspectiva
const OVERVIEW = { target: new THREE.Vector3(0, 2.45, -1.3), position: new THREE.Vector3(0, 0.25, 4.7) }

// A Capela (models/capela.glb): nicho gótico ORIGINAL, gerado por
// tools/models/capela.py. Medidas em fração da altura, definidas no gerador:
// vão 0.304 de largura, piso interno a 0.088, recuo (frente → fundo do nicho)
// 0.26, profundidade total 0.292 — fundo o bastante para São Miguel ficar
// atrás da Sagrada Família.
const CHAPEL = { height: 11, floor: 0.088, halfNiche: 0.152, depth: 0.292, recess: 0.26 }
// vidro do frontão: do lado de fora, sem luz por trás — só reflete a cena
const FRONT_GLASS: Record<string, string> = { 'front-ruby': '#7e0f22', 'front-gold': '#a8781e' }
// piso do nicho em xadrez
const TILES: Record<string, string> = { 'tile-a': '#6b4a31', 'tile-b': '#2a1a10' }
const NICHE = {
  back: -3.05, // z do fundo do nicho (a frente da capela fica em ≈ -0.19)
  halfWidth: CHAPEL.halfNiche * CHAPEL.height, // ≈ 2.02
}
const HALF_WIDTH = 1.95 // meia-largura da composição, pra caber em telas estreitas

export function createChapel(o: Options): Chapel {
  const renderer = new THREE.WebGLRenderer({ canvas: o.canvas, antialias: true, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#141019')
  scene.fog = new THREE.Fog('#141019', 12, 24)

  // reflexo para o ouro: ambiente gerado na hora, sem arquivo HDR
  const pmrem = new THREE.PMREMGenerator(renderer)
  const envScene = new THREE.Scene()
  envScene.add(new THREE.HemisphereLight('#ffe2a8', '#140c1c', 3))
  const envRT = pmrem.fromScene(envScene, 0.04)
  scene.environment = envRT.texture
  scene.environmentIntensity = 0.6

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 60)
  camera.position.copy(OVERVIEW.position)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.copy(OVERVIEW.target)
  controls.enableDamping = true
  controls.enablePan = false
  controls.minDistance = 1.1
  controls.maxDistance = 11
  controls.minAzimuthAngle = -0.9
  controls.maxAzimuthAngle = 0.9
  // polar > 90°: permite olhar de baixo pra cima (a visão inicial fica em ~107°)
  controls.minPolarAngle = 1.15
  controls.maxPolarAngle = 2.05

  // ---- luz de capela: quente de cima, fria de lado, contraluz nas bordas ----
  scene.add(new THREE.HemisphereLight('#ffe9c7', '#1a1020', 0.5))
  const key = new THREE.SpotLight('#ffd9a0', 180, 30, 0.55, 0.6, 1.6)
  key.position.set(3.5, 8, 7)
  key.target.position.set(0, 2.2, -1.3)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.bias = -0.0004
  scene.add(key, key.target)
  const fill = new THREE.DirectionalLight('#9fb4ff', 0.55)
  fill.position.set(-6, 3, 4)
  scene.add(fill)
  const rim = new THREE.SpotLight('#ffcf7a', 90, 20, 0.9, 0.8, 1.6)
  rim.position.set(0, 5.5, -5)
  rim.target.position.set(0, 2.5, 0)
  scene.add(rim, rim.target)

  const loader = new GLTFLoader()
  const total = o.pieces.length + 1 // + a Capela
  let loaded = 0
  const progress = () => o.onProgress(++loaded, total)
  o.onProgress(0, total)

  // ---- arquitetura: a Capela; altar e mísulas na mesma pedra ----
  const stone = new THREE.MeshStandardMaterial({ color: '#4a2f1d', roughness: 0.8 })
  const trim = new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.35, metalness: 0.9 })
  // raios e glórias das imagens (faces rotuladas "gold" no pipeline)
  const gilded = new THREE.MeshStandardMaterial({ color: '#c9962a', roughness: 0.32, metalness: 0.9, emissive: '#5a3a06', emissiveIntensity: 0.4 })
  const disposables: { dispose(): void }[] = [stone, trim, gilded]

  // o vitral: textura de mosaico gerada por código, sem reagir às luzes da
  // cena e sem tone mapping — a cor sai inteira, como vidro contra o sol
  const glassTex = stainedGlassTexture()
  const windowGlass = new THREE.MeshBasicMaterial({ map: glassTex, toneMapped: false })
  disposables.push(glassTex, windowGlass)

  const tileCache = new Map<string, THREE.MeshStandardMaterial>()
  const tile = (label: string) => {
    let t = tileCache.get(label)
    if (!t) {
      t = new THREE.MeshStandardMaterial({ color: TILES[label], roughness: 0.55 })
      tileCache.set(label, t)
      disposables.push(t)
    }
    return t
  }

  const frontCache = new Map<string, THREE.MeshStandardMaterial>()
  const frontGlass = (label: string) => {
    let f = frontCache.get(label)
    if (!f) {
      f = new THREE.MeshStandardMaterial({ color: FRONT_GLASS[label], roughness: 0.25, metalness: 0.1 })
      frontCache.set(label, f)
      disposables.push(f)
    }
    return f
  }

  // ---- luz por trás do vitral ----
  const H = CHAPEL.height
  const windowY = (130 / 250 - CHAPEL.floor) * H // altura das lancetas no nicho
  // a luz que atravessa o vidro banha as imagens: azul de um lado, rubi do outro
  for (const [x, color] of [[-0.82, '#4a74ff'], [0.82, '#e0314f']] as const) {
    const l = new THREE.PointLight(color, 6, 5.5, 1.5)
    l.position.set(x, windowY, NICHE.back + 0.6)
    scene.add(l)
  }
  // a fonte: uma luz ATRÁS da janela que projeta o próprio vitral na cena —
  // as cores das peças caem no nicho, no altar e nas imagens. A Capela não
  // projeta sombra, então a parede não bloqueia; as imagens projetam.
  const behind = new THREE.SpotLight('#fff4e0', 140, 16, 0.62, 0.35, 1.3)
  behind.position.set(0, windowY + 0.9, NICHE.back - 1.6)
  behind.target.position.set(0, 0.6, 1.6)
  behind.map = glassTex
  behind.castShadow = true
  behind.shadow.mapSize.set(1024, 1024)
  behind.shadow.bias = -0.0006
  scene.add(behind, behind.target)
  // halo: a luz vazando pela janela e se espalhando no nicho
  const hazeCanvas = document.createElement('canvas')
  hazeCanvas.width = hazeCanvas.height = 256
  const hz = hazeCanvas.getContext('2d')!
  const hg = hz.createRadialGradient(128, 128, 0, 128, 128, 128)
  hg.addColorStop(0, 'rgba(255,236,196,0.3)')
  hg.addColorStop(0.45, 'rgba(255,214,150,0.1)')
  hg.addColorStop(1, 'rgba(255,214,150,0)')
  hz.fillStyle = hg
  hz.fillRect(0, 0, 256, 256)
  const hazeTex = new THREE.CanvasTexture(hazeCanvas)
  hazeTex.colorSpace = THREE.SRGBColorSpace
  const hazeMat = new THREE.MeshBasicMaterial({
    map: hazeTex,
    blending: THREE.AdditiveBlending,
    depthWrite: false, // atrás das imagens (com teste de profundidade), na frente do vidro
    fog: false,
  })
  const haze = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 4.6), hazeMat)
  haze.position.set(0, windowY + 0.35, NICHE.back + 0.15)
  haze.renderOrder = -1
  scene.add(haze)
  disposables.push(hazeTex, hazeMat, haze.geometry)

  loader.load(
    '/models/capela.glb',
    (gltf) => {
      const h = CHAPEL.height
      gltf.scene.scale.setScalar(h) // GLB normalizado: altura 1, base em y=0, centrado em x/z
      // piso do nicho em y=0 (o pedestal fica abaixo); fundo do nicho em NICHE.back
      gltf.scene.position.set(0, -CHAPEL.floor * h, NICHE.back - (CHAPEL.depth / 2 - CHAPEL.recess) * h)
      gltf.scene.traverse((n) => {
        if ((n as THREE.Mesh).isMesh) {
          const m = n as THREE.Mesh
          const label = (Array.isArray(m.material) ? m.material[0] : m.material)?.name ?? ''
          if (label === 'glass-window') {
            m.material = windowGlass // o vitral: mosaico aceso por trás
          } else {
            // cruz e remates: ouro metálico, sem brilho próprio (trim)
            m.material = label === 'gold' ? trim : label in FRONT_GLASS ? frontGlass(label) : label in TILES ? tile(label) : stone
            m.receiveShadow = true
          }
          m.renderOrder = -2 // arquitetura primeiro, depois a glória, depois as imagens
          disposables.push(m.geometry)
        }
      })
      scene.add(gltf.scene)
      progress()
    },
    undefined,
    progress,
  )

  // glória: disco de luz dourada (textura de canvas — sem blob:, sem rede)
  const glowCanvas = document.createElement('canvas')
  glowCanvas.width = glowCanvas.height = 256
  const g = glowCanvas.getContext('2d')!
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128)
  grad.addColorStop(0, 'rgba(255,220,140,0.12)')
  grad.addColorStop(0.3, 'rgba(242,190,90,0.04)')
  grad.addColorStop(1, 'rgba(242,193,78,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 256, 256)
  const glowTex = new THREE.CanvasTexture(glowCanvas)
  glowTex.colorSpace = THREE.SRGBColorSpace
  // A glória gira com o Espírito Santo e, vista de baixo, inclina e atravessa
  // a parede — o teste de profundidade a recortaria numa linha reta. Por isso
  // ela é desenhada logo após a arquitetura (renderOrder), sem depthTest, e
  // antes das imagens, que continuam cobrindo-a. Aditiva: soma luz.
  const glowMat = new THREE.MeshBasicMaterial({
    map: glowTex,
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false,
    fog: false,
  })
  disposables.push(glowTex, glowMat)

  // ---- peças ----
  const roots = new Map<string, THREE.Group>()
  // posição original e posição-alvo de cada peça (as outras se afastam no foco)
  const home = new Map<string, THREE.Vector3>()
  const goal = new Map<string, THREE.Vector3>()
  const billboards: THREE.Group[] = []
  const materials = new Map<string, THREE.MeshStandardMaterial>()

  for (const p of o.pieces) {
    const group = new THREE.Group()
    group.position.set(...p.position)
    group.rotation.y = p.rotationY
    group.userData.pieceId = p.id
    scene.add(group)
    roots.set(p.id, group)
    home.set(p.id, group.position.clone())
    goal.set(p.id, group.position.clone())
    if (p.billboard) {
      group.userData.rotationY = p.rotationY // orientação original, usada fora da visão geral
      billboards.push(group)
    }

    // base de cada peça conforme a hierarquia
    if (p.base === 'altar') {
      const altar = new THREE.Mesh(new THREE.BoxGeometry(2, p.position[1], 1.2), stone)
      altar.position.y = -p.position[1] / 2
      altar.castShadow = altar.receiveShadow = true
      const band = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.05, 1.24), trim)
      band.position.y = -0.03
      group.add(altar, band)
      disposables.push(altar.geometry, band.geometry)
    } else if (p.base === 'corbel') {
      const corbel = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.22, 0.28, 48), stone)
      corbel.position.y = -0.14
      corbel.castShadow = corbel.receiveShadow = true
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.018, 12, 64), trim)
      ring.rotation.x = Math.PI / 2
      // coluna da mísula até o piso do nicho, com base
      const floorY = -p.position[1] // piso do nicho, no referencial da peça
      const corbelBottom = -0.28
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, corbelBottom - floorY, 24), stone)
      shaft.position.y = (floorY + corbelBottom) / 2
      const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.12, 24), stone)
      plinth.position.y = floorY + 0.06
      for (const m of [corbel, shaft, plinth]) m.castShadow = m.receiveShadow = true
      group.add(corbel, ring, shaft, plinth)
      disposables.push(corbel.geometry, ring.geometry, shaft.geometry, plinth.geometry)
    } else {
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(p.height * 2, p.height * 2), glowMat)
      glow.renderOrder = -1
      glow.position.set(0, p.height / 2, -0.35)
      const light = new THREE.PointLight('#ffd98a', 2.5, 4, 1.5)
      light.position.set(0, p.height / 2, 0.6)
      group.add(glow, light)
      disposables.push(glow.geometry)
    }

    const mat = new THREE.MeshStandardMaterial({ color: IVORY, roughness: 0.55, metalness: 0, emissive: GOLD, emissiveIntensity: 0 })
    materials.set(p.id, mat)
    disposables.push(mat)

    loader.load(
      p.model,
      (gltf) => {
        gltf.scene.scale.setScalar(p.height) // GLB vem normalizado: altura 1, base em y=0
        gltf.scene.traverse((n) => {
          if ((n as THREE.Mesh).isMesh) {
            const m = n as THREE.Mesh
            const label = (Array.isArray(m.material) ? m.material[0] : m.material)?.name
            m.material = label === 'gold' ? gilded : mat
            m.castShadow = m.receiveShadow = true
            disposables.push(m.geometry)
          }
        })
        group.add(gltf.scene)
        progress()
      },
      undefined,
      progress, // falha em uma peça não derruba a cena
    )
  }

  // ---- interação: hover/clique por raycast; foco com transição suave ----
  const ray = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const pieceAt = (e: PointerEvent): string | null => {
    const r = o.canvas.getBoundingClientRect()
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
    ray.setFromCamera(pointer, camera)
    for (const hit of ray.intersectObjects([...roots.values()], true)) {
      let n: THREE.Object3D | null = hit.object
      while (n && !n.userData.pieceId) n = n.parent
      if (n) return n.userData.pieceId as string
    }
    return null
  }

  let hovered: string | null = null
  const setHover = (id: string | null) => {
    if (id === hovered) return
    if (hovered) materials.get(hovered)!.emissiveIntensity = 0
    hovered = id
    if (id) materials.get(id)!.emissiveIntensity = 0.12
    o.canvas.style.cursor = id ? 'pointer' : 'grab'
    o.onHover(id)
  }

  let downAt: { x: number; y: number } | null = null
  let current: string | null = null // imagem em foco, se houver
  let focusDistance = 0 // distância câmera → alvo ao terminar o foco

  // com uma imagem em foco, girar só orbita em volta dela; afastar (zoom-out)
  // além da distância do foco volta à visão geral: peças no lugar, câmera no
  // enquadramento inicial, seleção limpa. Medir a distância (e não o evento
  // de roda) cobre roda, touchpad e pinça do mesmo jeito.
  const ZOOM_OUT_EXIT = 1.12
  const leaveFocus = () => {
    if (!current) return
    focus(null)
    o.onSelect(null)
  }

  const onDown = (e: PointerEvent) => (downAt = { x: e.clientX, y: e.clientY })
  const onMove = (e: PointerEvent) => setHover(pieceAt(e))
  const onCancel = () => (downAt = null)
  // sem isso, o hover da última imagem fica preso ao sair do canvas
  const onLeave = () => setHover(null)
  const onUp = (e: PointerEvent) => {
    const start = downAt
    downAt = null
    // arrastar pra girar não conta como clique
    if (!start || Math.hypot(e.clientX - start.x, e.clientY - start.y) > 5) return
    const id = pieceAt(e)
    focus(id)
    o.onSelect(id)
  }
  o.canvas.addEventListener('pointerdown', onDown)
  o.canvas.addEventListener('pointermove', onMove)
  o.canvas.addEventListener('pointerup', onUp)
  o.canvas.addEventListener('pointerleave', onLeave)
  o.canvas.addEventListener('pointercancel', onCancel)

  // uma única transição move câmera e peças juntas, com a mesma curva
  let tween: {
    from: [THREE.Vector3, THREE.Vector3]
    to: [THREE.Vector3, THREE.Vector3]
    pieces: Map<string, THREE.Vector3>
    t0: number
  } | null = null
  function focus(id: string | null) {
    const p = o.pieces.find((x) => x.id === id)
    current = p?.id ?? null
    let to: [THREE.Vector3, THREE.Vector3]
    if (!p) {
      to = [OVERVIEW.target.clone(), OVERVIEW.position.clone()]
    } else {
      const target = new THREE.Vector3(p.position[0], p.position[1] + p.height * 0.5, p.position[2])
      const dir = new THREE.Vector3(Math.sin(p.rotationY), -0.18, Math.cos(p.rotationY)).normalize()
      // perto o bastante pra imagem ocupar ~3/4 da altura da vista
      const fit = (p.height / 0.75) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
      to = [target, target.clone().addScaledVector(dir, fit + 0.2)]
      focusDistance = fit + 0.2
    }

    // as outras peças abrem espaço: para os lados/para cima e para trás,
    // sem sair do vão do nicho (colunas e fundo da Capela) e sem o altar descer
    for (const q of o.pieces) {
      const base = home.get(q.id)!
      if (!p || q.id === p.id) {
        goal.get(q.id)!.copy(base)
        continue
      }
      const away = new THREE.Vector2(base.x - p.position[0], base.y - p.position[1])
      if (away.lengthSq() < 1e-6) away.set(0, 1)
      away.normalize()
      // folga até a borda de cada peça: altar 0.62, mísula 0.45, glória 0.25
      const margin = q.base === 'altar' ? 0.62 : q.base === 'corbel' ? 0.45 : 0.25
      const maxX = NICHE.halfWidth - margin
      goal.get(q.id)!.set(
        THREE.MathUtils.clamp(base.x + away.x * 1.3, -maxX, maxX),
        // altar não desce; mísulas (com coluna até o piso) não se movem na vertical
        base.y + (q.base === 'altar' ? Math.max(away.y, 0) : q.base === 'corbel' ? 0 : away.y) * 0.9,
        Math.max(base.z - 0.8, NICHE.back + margin),
      )
    }
    if (o.reducedMotion) for (const [id, g] of roots) g.position.copy(goal.get(id)!)
    if (o.reducedMotion) {
      controls.target.copy(to[0])
      camera.position.copy(to[1])
      tween = null
    } else {
      const pieces = new Map([...roots].map(([id, g]) => [id, g.position.clone()]))
      tween = { from: [controls.target.clone(), camera.position.clone()], to, pieces, t0: performance.now() }
    }
  }

  // ---- tamanho e laço de render ----
  const resize = () => {
    const { clientWidth: w, clientHeight: h } = o.canvas
    if (!w || !h) return
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    // o FOV vertical cresce o bastante pra caber a largura da composição
    // (±2.4 do centro) mesmo em telas estreitas (celular em retrato)
    const halfWidth = Math.atan(HALF_WIDTH / OVERVIEW.position.distanceTo(OVERVIEW.target))
    const needed = (2 * Math.atan(Math.tan(halfWidth) / camera.aspect) * 180) / Math.PI
    camera.fov = Math.min(80, Math.max(52, needed))
    camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(resize)
  ro.observe(o.canvas)
  resize()

  let raf = 0
  let lastFrame = performance.now()
  const aim = new THREE.Object3D() // auxiliar: calcula a orientação "de frente pra câmera"
  const facing = new THREE.Quaternion()
  const loop = (now: number) => {

    if (tween) {
      const t = Math.min(1, (now - tween.t0) / 900)
      const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2 // ease-in-out cúbico
      controls.target.lerpVectors(tween.from[0], tween.to[0], e)
      camera.position.lerpVectors(tween.from[1], tween.to[1], e)
      for (const [id, g] of roots) g.position.lerpVectors(tween.pieces.get(id)!, goal.get(id)!, e)
      if (t === 1) tween = null
    }
    controls.update()
    // zoom-out além da distância do foco → visão geral (girar não muda a distância)
    if (!tween && current && camera.position.distanceTo(controls.target) > focusDistance * ZOOM_OUT_EXIT) leaveFocus()
    // o Espírito Santo encara a câmera só na visão geral; com uma imagem em
    // foco, volta à orientação original e fica parado. A troca é suave (~0,3 s).
    const k = o.reducedMotion ? 1 : 1 - Math.exp(-(now - lastFrame) / 110)
    for (const b of billboards) {
      if (current) {
        facing.setFromEuler(new THREE.Euler(0, b.userData.rotationY as number, 0))
      } else {
        aim.position.copy(b.position)
        aim.lookAt(camera.position) // +Z do modelo = frente
        facing.copy(aim.quaternion)
      }
      b.quaternion.slerp(facing, k)
    }
    lastFrame = now
    renderer.render(scene, camera)
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  return {
    focus,
    dispose() {
      cancelAnimationFrame(raf)
      ro.disconnect()
      o.canvas.removeEventListener('pointerdown', onDown)
      o.canvas.removeEventListener('pointermove', onMove)
      o.canvas.removeEventListener('pointerup', onUp)
      o.canvas.removeEventListener('pointerleave', onLeave)
      o.canvas.removeEventListener('pointercancel', onCancel)
      controls.dispose()
      for (const d of disposables) d.dispose()
      envRT.dispose()
      pmrem.dispose()
      renderer.dispose()
    },
  }
}
