# 03 — Design System

Implementação: `web/src/styles/tokens.css` (fonte da verdade dos valores).

## Camadas (z-order)

| Camada | z | O quê | Como |
|---|---|---|---|
| L0 | 0 | Papelão / jornal | `body` com `--bg-paper` + ruído SVG `feTurbulence` inline (data-URI) |
| L1 | 1 | Luz do vitral | `GothicWindow.vue` (SVG) + `radial-gradient` âmbar/azul atrás |
| L2 | 2 | Colagens | `PaperCard`, `Tape`, `Staple`, `TornEdge` (`clip-path`) |
| L3 | 3 | Neon | `NeonAscii`, `RustCore` — `text-shadow` em camadas |

## Regra de ouro: caos nas bordas, ordem no centro

- Grade de 12 colunas, `max-width: 1200px`, gutter de 24px (16px no mobile).
- **Só contêineres e decoração giram.** Use `--tilt` (−1.5° a +1.5°) no
  `PaperCard`. Conteúdo de texto **nunca** recebe `rotate`.
- Os elementos decorativos (fita, grampo) podem sair da grade e
  vazar as bordas — mas usam `pointer-events: none` e `aria-hidden="true"`.
- Marcas de corte (crop marks) nos cantos dos cards principais =
  precisão de papercraft.

## Cores

| Token | Valor | Uso |
|---|---|---|
| `--bg-paper` | `#141019` | fundo da página (preto-violeta dos cartazes) |
| `--poster-raised` | `#221B2C` | cartaz colado sobre o fundo (um tom acima, senão some) |
| `--on-bg` / `--on-bg-soft` | `#F3EEE6` / `#E2D6C3` | texto e marcas **direto sobre o fundo** (lede, rodapé, links, marcas de corte) |
| `--kraft` | `#C8A676` | papel pardo dentro de cards (placeholders) |
| `--newsprint` | `#EDE6D6` | cards, recortes |
| `--ink` | `#1A1A1A` | texto, chumbo do vitral |
| `--poster` | `#141019` | painéis escuros colados (base do neon) |
| `--neon-cyan` | `#00F0FF` | neon primário, tag "trabalho" |
| `--neon-pink` | `#FF2E97` | neon secundário, tag "formação" |
| `--neon-purple` | `#B026FF` | fios, links, foco |
| `--rust` | `#FF5F1F` | **exclusivo do Rust**: logo, acento de projetos Rust |
| `--tape` | `#E8D9A8CC` | fita crepe (translúcida) |
| `--glass-gold` | `#F2C14E` | vitral |
| `--glass-blue` | `#1F4FFF` | vitral |
| `--glass-ruby` | `#C8102E` | vitral |
| `--glass-green` | `#1E8C4E` | vitral |

**Regra do laranja:** `--rust` não é usado em nenhum outro lugar. Se aparecer
laranja, significa Rust. Rust tem destaque (card principal do Stack), mas
não é o centro da composição.

**Contraste:** o neon é sempre usado sobre `--poster`, nunca sobre papel
(neon sobre papel claro não passa AA). Dentro dos cards, o texto é `--ink`;
direto sobre o fundo escuro, é `--on-bg` (6.5:1).


## Tipografia

| Papel | Fonte | Fallback |
|---|---|---|
| ASCII / neon | JetBrains Mono 700 | `ui-monospace` |
| Texto corrido | Courier Prime 400/700 | `Courier New` |
| Rótulos / seções | Big Shoulders Stencil Display 800 | `Impact` |

Escala (`clamp`): corpo 1rem–1.125rem · h2 2rem–3.5rem (estêncil) · ASCII
de 0.35rem a 0.9rem, calculado pra caber sem scroll horizontal.

### ASCII
- Geração em build com `figlet` (`web/scripts/gen-ascii.ts`): nome em
  **ANSI Shadow**, títulos de seção e nomes de projeto em **Small**.
  figlet não tem acento → a arte usa a forma sem acento e o `aria-label`
  carrega o texto correto.
- **Uma arte só, qualquer tela:** `NeonAscii` usa container query —
  `font-size: min(var(--max), 100cqw / colunas / 0.605)` (avanço da
  JetBrains Mono = 0.6em). A arte sempre cabe, sem scroll horizontal.
- `role="img"` + `aria-label` no contêiner; o `<pre>` fica `aria-hidden`.
- Neon: `text-shadow` em 5 camadas (branco + 4 halos da cor). Flicker
  sutil **só** no nome, desligado em `prefers-reduced-motion`.
- Títulos de seção (`SectionTitle.vue`): tira de cartaz rasgado com o
  título em ASCII neon — o neon nunca toca o papel.

## Componentes

| Componente | Props | Notas |
|---|---|---|
| `PaperCard` | `tilt`, `variant: newsprint\|kraft\|notebook`, `crop` | sombra dura de 2 camadas (papel sobre papel) |
| `Tape` | `pos: tl\|tr\|top\|bl\|br`, `angle` | retângulo translúcido com bordas serrilhadas (`clip-path`) |
| `Staple` | `pos` | SVG de 2 pernas metálicas |
| `TornEdge` | `side` | `clip-path: polygon` com dentes irregulares, gerados uma vez por seed |
| `NeonAscii` | `art`, `label`, `color`, `flicker`, `max` | ver acima |
| `SectionTitle` | `title`, `color`, `tilt`, `seed` | cartaz + ASCII do título |
| `RustCore` | `size`, `pulse` | engrenagem do Rust em SVG, `--rust`, glow pulsando 4s |
| `StainedGlassCross` | — | ver abaixo |
| `Poster` | — | painel escuro com bordas rasgadas; base de todo neon |

## O vitral (hero)

- **Forma:** janela gótica em arco ogival (dois arcos de raio 160 que se
  encontram no eixo), moldura de vidro azul-profundo, peitoril escuro.
- **Vidros:** losangos (quarry glass) em azuis e verdes claros, unidos por
  chumbo `#1A1A1A`, com um brilho radial vindo de trás.
- **Cruz:** latina, dourada, com filete rubi, centrada. É o foco do vitral.
- **Posição:** coluna ao lado do nome (acima dele no celular). **Nada** é
  posicionado sobre a janela.
- **Link:** o vitral leva à exposição (`/devocao`). No hover/foco só acende
  um pouco mais — nenhuma animação de movimento.
- **Proibido:** glitch, flicker, aberração cromática, distorção, rotação,
  texto por cima, neon por cima ou qualquer uso cômico. Estático.

## A exposição (Devoção)

- Cena three.js (`components/devotion/chapel.ts`), carregada só em
  `/devocao`. Fundo: a **Capela** (nicho gótico original, gerado por código) em
  marrom madeira escuro `#4A2F1D`, com vitral colorido no fundo do nicho,
  **iluminado por trás**: mosaico em estilo Sainte-Chapelle gerado por código,
  sem tone mapping (cor inteira), halo suave, uma luz atrás da janela que
  **projeta o vitral** na cena e duas luzes (azul/rubi) na composição. Só o
  vitral brilha — cruz, remates e o vidro do frontão, não; a composição fica dentro do vão. Luz quente de cima, fria de
  lado, contraluz.
- Imagens em marfim fosco; raios e glórias em **ouro metálico** (faces
  marcadas no pipeline). Altar (centro), mísulas com filete dourado
  (Arcanjos) e glória de luz (Espírito Santo). A glória é desenhada logo
  após a parede e o piso, sem teste de profundidade e em modo aditivo:
  como ela gira com a pomba, vista de baixo atravessaria a parede e
  viraria uma "luz quadrada" recortada. Peças próximas umas das outras.
- **Visão inicial de baixo pra cima**, perto, FOV ≥ 52°: a composição sobe
  em perspectiva. O **Espírito Santo** fica sempre no alto e, **só na visão
  geral**, acompanha a câmera de frente; com uma imagem em foco ele volta,
  suave, à orientação original e fica parado.
- Sem rótulos de hierarquia ("no alto", "arcanjos"…): a composição diz isso.
- Hover: leve brilho dourado. Clique (na cena ou na lista): a câmera
  chega perto o bastante pra imagem ocupar ~¾ da altura da vista, e as
  outras peças se afastam um pouco (lados/cima/trás, sem sair do vão do
  nicho; o altar nunca desce),
  **ao mesmo tempo** que a câmera: uma única transição de 900 ms, mesma curva.
  "Visão geral" devolve tudo ao lugar. Com uma imagem em foco, girar só
  orbita em volta dela; afastar a câmera (zoom-out) além de 12% da
  distância do foco volta à visão geral — vale para roda, touchpad e pinça. A placa de
  museu (papel reto, **sem tilt**) mostra nome, significado, festa,
  Escritura, texto e oração.
- Movimento da câmera só por ação do visitante (o giro do Espírito Santo
  é consequência dela). `prefers-reduced-motion`
  troca a transição por corte seco. Nada gira sozinho.

## Movimento

| Elemento | Animação | Reduced motion |
|---|---|---|
| Barra de progresso | linha neon no topo, cresce com a rolagem | mantida (é informação) |
| Cards e cartazes | ao entrar na tela: caem girados e assentam; em cascata (90 ms) | já no lugar |
| Fita e grampo | "grudam" ~450 ms depois do papel assentar | já no lugar |
| Títulos ASCII | acendem piscando como tubo de neon ao entrar na tela | já acesos |
| Profundidade | luzes de fundo (0,22–0,45×) e vitral (0,18×) andam mais devagar que o conteúdo | paradas |
| Nome ASCII | acende; depois flicker a cada ~7s, 120ms | desligado |
| Rust | pulso de glow de 4s | glow estático |
| Cards | `hover`: endireita o tilt → 0° e sobe 2px | só a sombra |
| Vitral | **nenhuma** | — |
| Exposição 3D | câmera 900 ms ao focar | corte seco |

**Implementação do movimento:** `v-reveal` (`lib/reveal.ts`) marca
`data-reveal="out"` até o elemento entrar na tela (IntersectionObserver) e
distribui o atraso da cascata em `--reveal-delay`. Ao sair **totalmente** da
tela, volta a "out" (fora da vista) — rolar de volta monta de novo, nos dois
sentidos; entre 0% e 12% visível nada muda, pra não piscar na borda; cada componente define no
próprio CSS como chega. A rolagem publica `--scroll`/`--progress` (um cálculo
por quadro, ouvinte passivo) e só `translate`/`transform` mudam — nada repinta.
