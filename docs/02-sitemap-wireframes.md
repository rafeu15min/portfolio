# 02 — Sitemap & Wireframes

Legenda: `▓` painel escuro colado (cartaz preto) · `░` papel/jornal ·
`═══` fita crepe · `⊓` grampo · `✚` vitral.

```
/                       single-page
├── #inicio             Hero
├── #manifesto          Manifesto
├── #stack              Stack
├── #projetos           Projetos  ──▶ /projetos/:slug
├── #trajetoria         Trajetória
├── #devocao           Devoção  ──▶ /devocao (exposição 3D)
└── #contato            Contato
```

## Hero — desktop

```
┌────────────────────────────────────────────────────────────────────────┐
│ [RAFEU]      manifesto stack projetos trajetória devoção contato       │
│                                                                        │  fundo #141019
│     ___      ___                                   ╭────╮              │
│    | _ \__ _| __|__ _  _     (neon ciano,        ╱ ◇◇◇◇ ╲             │  ← vitral gótico:
│    |   / _` | _/ -_) || |     só o traço)       │ ◇◇ ✚ ◇◇ │            │    arco ogival,
│    |_|_\__,_|_|\___|\_,_|                        │ ◇ ✚✚✚ ◇ │            │    losangos,
│  ═══┌──────────────────────────────┐═══          │ ◇◇ ✚ ◇◇ │            │    cruz dourada
│     │ ENGENHEIRO DE SOFTWARE ·     │              │ ◇◇ ✚ ◇◇ │            │
│     │ INTEGRADOR DE IA             │              │ ◇◇◇◇◇◇◇ │            │
│     │ Desenvolvo em Rust, Python e │              └─────────┘            │
│     │ Java, com foco em segurança… │                                     │
│     └──────────────────────────────┘                                     │
│     [ ver projetos ↓ ]  [ contato ]                                      │
└────────────────────────────────────────────────────────────────────────┘
```

Duas colunas: texto à esquerda, vitral à direita. Nada por cima do vitral.
No celular, o vitral sobe (menor) e o texto centraliza embaixo.

## Manifesto

```
         ⊓                           ⊓
   ┌─────────────────────────────────────────┐  ← folha de caderno grampeada, gira -1°
   │ MANIFESTO                    (estêncil) │
   │─────────────────────────────────────────│
   │ 01  SEGURANÇA    memória segura, menor  │
   │                  privilégio, sem atalho │
   │ 02  PERFORMANCE  medir antes, otimizar  │
   │                  o que o perfil mostra  │
   │ 03  GOVERNANÇA   dado pessoal é         │
   │                  responsabilidade       │
   └─────────────────────────────────────────┘
```

## Stack

```
   Stack (neon roxo) · "cada item aponta onde foi usado"
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓   ┌ LINGUAGENS ───────┐  ┌ FRAMEWORKS ───────┐
   ▓[linguagem  ]▓   │ Java              │  │ Quarkus           │
   ▓[principal  ]▓   │  PBS · Tab+ · …   │  │  PBS · AutoPark   │
   ▓ ⚙ Rust      ▓   │ Python …          │  │ …                 │
   ▓ texto       ▓   └───────────────────┘  └───────────────────┘
   ▓ vault-sync  ▓   ┌ INFRA & DADOS ────┐  ┌ IA & FERRAMENTAS ─┐
   ▓ Heimdall …  ▓   │ Docker · Kafka …  │  │ Claude API …      │
   ▓▓▓▓▓▓▓▓▓▓▓▓▓▓   └───────────────────┘  └───────────────────┘
   (cartaz fixo ao rolar)   links = projetos onde a tecnologia aparece
```

## Projetos

Duas camadas: os projetos com `featured: true` em destaque e o resto numa
grade compacta.

```
 ┌─═══──────────────────────────┐  ┌──────────────────────────═══─┐
 │▓▓ NOME EM ASCII NEON ▓▓ ativo│  │▓▓ NOME EM ASCII NEON ▓▓ ativo│  ← tira de cartaz,
 │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│    rasgada embaixo
 │ tagline em negrito  ╔ATUALIZ.╗│  │ tagline em negrito ╔ATUALIZ.╗│  ← carimbo rubi
 │                     ╚10/2026═╝│  │                    ╚10/2026═╝│
 │ ◆ destaque 1                  │  │ ◆ destaque 1                 │  ← até 3, losango
 │ ◆ destaque 2                  │  │ ◆ destaque 2                 │    na cor do projeto
 │ [Rust][rsync][SSH]            │  │ [Python][MCP]...             │
 │ repositório privado detalhes →│  │ código ↗          detalhes → │
 └───────────────────────────────┘  └──────────────────────────────┘
   2 colunas (1 no celular)

 OUTROS PROJETOS E ESTUDOS
 ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
 │ nome  st.│ │ nome  st.│ │ nome  st.│ │ nome  st.│   cartões compactos,
 │ tagline  │ │ tagline  │ │ tagline  │ │ tagline  │   até 4 colunas
 └──────────┘ └──────────┘ └──────────┘ └──────────┘
```

**A grade é rígida e só o card gira.** O cartão inteiro leva a
`/projetos/:slug` (o "detalhes →" se estende por ele; o título continua sendo
o link para teclado e leitor de tela).

### `/projetos/:slug`

```
 ← voltar
 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
 ▓  NOME DO PROJETO EM ASCII (figlet)   ▓
 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
 ┌──────────────────────┐  ┌──────────────┐
 │ resumo (typewriter)  │  │ STACK        │
 │                      │  │ STATUS       │
 │                      │  │ ATUALIZADO   │  mês do campo `updated`
 │ • destaque 1         │  │ ★ stars*     │  * só repos públicos, via /api/github
 │ • destaque 2         │  │ último commit│
 └──────────────────────┘  └──────────────┘
```

## Trajetória

```
  ─────●──────────────●──────────────●──────────────●────▶
   ┌────────┐     ┌────────┐     ┌────────┐     ┌────────┐
   │recorte │     │recorte │     │recorte │     │recorte │   ← recortes de jornal com borda rasgada
   │jornal  │     │jornal  │     │jornal  │     │jornal  │
   └────────┘     └────────┘     └────────┘     └────────┘
   trabalho = etiqueta ciano · formação = etiqueta rosa
```

Mobile: a timeline fica vertical.

## Devoção (home)

```
   Devoção (neon roxo)
   intro: "Uma composição em três níveis, como num retábulo…"
   ┌──────────── borda dourada ────────────┐
   │           ESPÍRITO SANTO              │    [ entrar na exposição 3D → ]
   │  SÃO GABRIEL · SÃO MIGUEL · SÃO RAFAEL│
   │           SAGRADA FAMÍLIA             │
   └───────────────────────────────────────┘
```

### `/devocao`

```
 ← voltar   Devoção (neon)               ← cabeçalho compacto: a cena cabe na tela
 ┌──────────── cena 3D ─────────────┐  ┌─ lista ─────────────┐
 │  (nicho da Capela, marrom)       │  │ Espírito Santo      │
 │            ✧ pomba + glória ✧    │  │ São Miguel Arcanjo  │
 │                 Miguel           │  │ São Gabriel Arcanjo │
 │        Gabriel        Rafael     │  │ São Rafael Arcanjo  │
 │          ▄ Sagrada Família ▄     │  │ Sagrada Família     │
 │         (vista de baixo ↑)       │  ├─ placa ─────────────┤
 │  legenda: sob o mouse/selecionada│  │ padrão: apresentação│
 └──────────────────────────────────┘  │ selecionada: nome,  │
                                       │ festa, texto, oração│
                                       └─────────────────────┘
```

Cena e painel têm a altura da tela (sem rolar a página); texto longo rola
dentro do painel. Clique numa imagem (ou na lista) → câmera se aproxima e a
placa troca da apresentação para a imagem. Zoom-out ou [visão geral] volta.
Celular: placa desce para baixo da cena.

## Contato

```
 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
 ▓ > CONTATO_                         ▓   ← terminal neon
 ▓ nome   [__________________]        ▓
 ▓ e-mail [__________________]        ▓
 ▓ msg    [__________________]        ▓
 ▓        [__________________]        ▓
 ▓ [x] Autorizo o uso destes dados    ▓
 ▓     só para responder esta msg.    ▓
 ▓ [ enviar ]                         ▓
 ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
   github.com/rafeu15min · e-mail
 ░ rodapé: "Feito em Rust + Vue. Sem cookies. Sem rastreadores." ░
```
