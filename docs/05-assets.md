# 05 — Assets

O scaffold roda 100% com assets **procedurais** (CSS/SVG). A lista abaixo é
o que vale substituir por arte feita à mão (Clip Studio) pra ganhar a
textura real de zine.

## Procedural (já no código)

| Asset | Onde | Técnica |
|---|---|---|
| Ruído de papel | `textures.css` | SVG `feTurbulence` em data-URI |
| Fita crepe | `Tape.vue` | div translúcida + `clip-path` serrilhado |
| Grampo | `Staple.vue` | SVG |
| Borda rasgada | `TornEdge` / `.torn-*` | `clip-path: polygon` |
| Vitral | `GothicWindow.vue` | SVG (arco ogival + losangos + cruz) |
| Engrenagem Rust | `RustCore.vue` | SVG (forma simplificada) |

## A produzir (Clip Studio → exportar WebP/AVIF, ≤ 150 KB cada)

| # | Asset | Formato | Substitui |
|---|---|---|---|
| 1 | Textura de papel pardo escaneada (tileável 1024²) | AVIF | ruído procedural |
| 2 | 3–4 tiras de jornal rasgado (PNG com alpha) | WebP | `TornEdge` nos recortes da timeline |
| 3 | 3 pedaços de fita crepe fotografados/desenhados | WebP alpha | `Tape.vue` |
| 4 | Vitral gótico, arte final vetorial | SVG | `GothicWindow.vue` (manter as regras do doc 03) |
| 7 | Open Graph image 1200×630 (hero em miniatura) | PNG | — |
| 8 | Favicon: engrenagem Rust laranja sobre cruz dourada | SVG | favicon padrão |

## Observação sobre o logo do Rust

O logo oficial do Rust é marca registrada da Rust Foundation. O uso para
indicar "este projeto/pessoa usa Rust" está dentro da política de uso da
marca, mas **não** se deve alterar o logo a ponto de parecer outro produto.
O `RustCore.vue` usa uma engrenagem estilizada genérica com um "R"; se você
trocar pelo logo oficial, mantenha as proporções originais e só mude a cor
e o glow.

## Modelos 3D (Devoção)

Fontes: `3D/` (STLs, ~579 MB, **fora do git e do Docker**). Pipeline:

```fish
cd web; npm run models            # todos
cd web; npm run models sao-miguel # só um
```

`tools/models/models.json` diz, por peça: arquivo de origem, qual lado é
a frente (`-y|+y|-x|+x`) e o alvo de triângulos. O Blender
(`tools/models/stl2glb.py`) orienta, funde vértices, reduz a malha e
normaliza a altura; o gltf-transform quantiza. Saída em
`web/public/models/*.glb` (~16 MB, ~7 MB com brotli) — essa sim versionada,
porque o build do Docker não tem Blender.

| Peça | Origem | Frente | Triângulos | Dourado (regra) |
|---|---|---|---|---|
| Sagrada Família | `3D/SagradaFamilia-CC/` (Renato Saioron Bernardo, **CC BY-NC-SA**) | +x | 3,07M → 240k | — |
| Espírito Santo | `3D/Espirito-Santo-CC/` (SerVic, **CC0**; 3MF → STL das 2 peças) | +z (relevo deitado) | 54k | `i >= 16114` (a peça do resplendor inteira: no STL combinado, os primeiros 16.114 triângulos são a pomba) |
| São Miguel | `3D/Três Arcanjos/obj_1…_1` | -y | 271k → 150k | — |
| São Gabriel | `3D/Três Arcanjos/obj_3…_3` | +y | 218k → 130k | — |
| São Rafael | `3D/Três Arcanjos/obj_2…_2` | +y | 221k → 130k | — |
| Capela (fundo) | **gerada** por `tools/models/capela.py` | -y | 7,3k faces | vitral: `glass-window`, cruz e remates: `gold` |

**Capela:** nicho gótico **original**, gerado por código (`tools/models/capela.py`,
entrada `"generator"` no `models.json`) — sem geometria de terceiros. Inspirado
em arquitetura gótica: nicho em arco ogival, arcos em camadas, colunetas,
contrafortes com pináculos, frontão com florões, quadrifólio e cruz dourada, e
no fundo do nicho um vitral (duas lancetas + rosácea quadrifoliada) e lambris;
nas paredes laterais, arcada cega com colunetas, cornija e quadrifólios;
abóbada nervurada com florões dourados e piso em xadrez (`tile-a`/`tile-b`).
Os arcanjos laterais ficam sobre mísulas com colunas até o piso.
Medidas (fração da altura): vão 0.304, piso interno 0.088, recuo 0.26,
profundidade 0.292. Na cena: altura 11, piso do nicho em y=0, fundo em z=−3.05 (nicho fundo o
bastante para São Miguel ficar atrás da Sagrada Família).
O vidro da janela é uma peça só por abertura (rótulo `glass-window`, com UV
projetado de frente sobre a janela). O mosaico — losangos em azul profundo,
borda de pérolas, medalhões com raios coloridos, rosácea com cruz e chumbo
escuro — é desenhado por código num canvas (`web/src/components/devotion/
stainedGlass.ts`, referência: Sainte-Chapelle). A mesma textura é projetada por
uma luz atrás da janela (`SpotLight.map`), colorindo nicho, piso e imagens.
O quadrifólio do frontão (`front-*`) e o ouro da capela não brilham: ficam do
lado de fora, só refletindo a luz da cena.

A Capela anterior (STL "Gothic Wall Shrine", de Osmoze) tinha **MakerWorld
Exclusive License**, que proíbe hospedar o modelo ou derivados fora do
MakerWorld — por isso foi substituída.

**Licenças dos modelos** (todas permitem exibir no site; crédito na placa de
cada peça, `credit`/`creditUrl` em `content/devocao.json`):
- "Três arcanjos" — user_2945973328 (MakerWorld) — **CC BY 4.0**
- "Sagrada Familia" — Renato Saioron Bernardo (MakerWorld) — **CC BY-NC-SA 4.0**:
  uso não comercial; a versão convertida é compartilhada sob a mesma licença
- "Espíritu Santo con resplandor" — SerVic (MakerWorld), remix de "Holy
  Spirit" de Uma mesa (Printables) — **CC0**
- Capela — gerada por código, sem terceiros

Modelos anteriores **descartados** por licença: Sagrada Família e Espírito Santo
da Jornada Católica (proíbe publicar em sites), "Gothic Wall Shrine"/"Spired
Gothic Niche" de Osmoze (MakerWorld Exclusive), "Gothic Window Arch" de Airs77,
"Sagrada Família" de Printcria3D e "Holy Family LED" de Mysstra3Dart (Standard
Digital File License). O repositório público foi criado com histórico novo,
sem nenhum desses arquivos. Créditos dos modelos em uso:
`web/public/models/CREDITOS.md`.

**Dourado:** o STL é uma malha contínua, sem cor. A regra (em
`models.json`, coordenadas originais do STL) marca as faces **atrás** do
plano das figuras — os raios são uma placa fina ali. Elas viram o material
"gold" no GLB. Limitação: a auréola do Menino fica na frente, junto das
figuras, e continua marfim.

Os 17 arquivos de "Três Arcanjos" são 3 figuras repetidas numa mesa de
impressão (7× Miguel, 5× Rafael, 5× Gabriel); só uma de cada é usada.

**Licença:** o site entrega o GLB ao navegador — na prática, o modelo fica
baixável. Antes de publicar, confirmar que a licença de cada STL permite
exibição pública na web e preencher `credit` em `content/devocao.json`.
