# 01 — Arquitetura

```
                    ┌───────────────────────────────────────────┐
  navegador ───────▶│  portfolio-api  (Rust · Axum · 1 binário) │
                    │                                           │
                    │  /api/health      liveness                │
                    │  /api/projects    content/projects.json   │
                    │  /api/timeline    content/timeline.json   │
                    │  /api/github/:slug  cache 1h ──▶ GitHub   │
                    │  /api/contact     rate-limit, só loga     │
                    │  /*               ServeDir(web/dist)      │
                    │                                           │
                    │  camada de headers: CSP, HSTS, nosniff,   │
                    │  Referrer-Policy, Permissions-Policy      │
                    └───────────────────────────────────────────┘
```

## Front — `web/` (Vue 3 + Vite + TypeScript)

- Sem biblioteca de UI. Tudo em CSS/SVG próprio — a estética é o produto.
- `content/*.json` é importado **em build** pelo Vite: o site renderiza
  completo mesmo sem API. A API só *enriquece* (stats do GitHub) e recebe o
  contato.
- ASCII: `scripts/gen-ascii.ts` roda o `figlet` (npm) no `predev`/`prebuild`
  e grava `src/generated/ascii.ts`. Zero custo em runtime, zero fonte
  figlet no bundle.
- Rotas: `/` (single-page com âncoras), `/projetos/:slug` e `/devocao`
  (exposição 3D — o three.js, ~170 KB comprimido, só carrega nessa rota).
- Modelos 3D: GLB com `KHR_mesh_quantization` (lido nativamente pelo
  three.js). Nada de Draco/meshopt: eles exigem decoder WASM, o que obrigaria
  `'wasm-unsafe-eval'` na CSP.
- Pós-build (`scripts/precompress.ts`): `.br` e `.gz` de cada arquivo
  comprimível; a API entrega via `ServeDir::precompressed_*` (17 → 7 MB).
- Dev: Vite em `:5173` com proxy `/api → :8080`.

## Back — `api/` (Rust + Axum)

| Rota | Detalhe |
|---|---|
| `GET /api/health` | `{"status":"ok","version":...}` |
| `GET /api/projects` | desserializa e **valida** o JSON na subida (falha rápido se o conteúdo estiver quebrado) |
| `GET /api/timeline` | idem |
| `GET /api/github/:slug` | **allowlist**: só slugs de `projects.json` com `visibility: "public"`. Não é um proxy aberto pro GitHub. Cache em memória TTL 1h. `GITHUB_TOKEN` opcional via env (sobe o rate limit; nunca vai pro cliente) |
| `POST /api/contact` | valida tamanho/formato, honeypot (`website` precisa vir vazio), consentimento LGPD obrigatório, rate limit por IP (3 a cada 10 min — conta antes da validação, pra não virar oráculo). Envia por **e-mail** (SMTP, crate `lettre`) para `CONTACT_TO`, com o visitante no Reply-To. Sem SMTP configurado → **503** (nunca um sucesso falso). O log registra só o tamanho da mensagem. Nada é persistido |
| `/*` | `web/dist` com fallback SPA para `index.html` |

**Cache-Control** (middleware `cache_control`): HTML `no-cache` (senão um
deploy novo fica preso ao JS antigo), `/assets/*` imutável por 1 ano (nome
com hash), `/models/*` `no-cache` (revalida; 304 se não mudou), `/api/*` `no-store`.

### Segurança (é vitrine, então é requisito)

- CSP estrita: `default-src 'self'`; fontes só do Google Fonts; sem
  `unsafe-inline`/`unsafe-eval`. O CSS do Vue sai em arquivo no build e os
  estilos dinâmicos (`:style`) passam por CSSOM, que a CSP não bloqueia.
- Limite de corpo de requisição (16 KiB) no `/api/contact`.
- Rate limit e cache são implementações próprias (`security.rs`,
  `routes/github.rs`, ~30 linhas cada) em vez de `tower_governor`/`moka`:
  menos dependência, menos superfície.
- Atrás de proxy reverso, o IP do cliente vem de `X-Forwarded-For` —
  ajustar o extrator do rate limit no deploy (hoje usa o IP do socket).
- Testes (`cargo test`) cobrem: headers, allowlist do proxy GitHub,
  validação + rate limit do contato, limite de corpo, validade do
  `content/` e que o campo interno `todo` nunca sai pela API.
- Nenhum segredo no repositório: `.env` no `.gitignore`, `.env.example`
  versionado.

### LGPD no formulário

- Coleta mínima: nome, e-mail, mensagem. Sem analytics, sem cookie.
- Checkbox de consentimento explícito com finalidade escrita ao lado.
- Retenção zero no servidor: o dado vai pro e-mail do Rafeu (fase SMTP) e
  some da memória do processo.
- Aviso de privacidade curto no rodapé do formulário.

## Deploy

Imagem Docker multi-stage (`Dockerfile` + `compose.yaml` na raiz):
front → API → `distroless/cc` não-root, ~57 MB. `HOST=0.0.0.0` só dentro do
container; o compose publica em `127.0.0.1:8080`. Atenção: atrás do proxy
reverso, todo cliente chega com o IP do proxy — o rate limit precisa ler
`X-Forwarded-For` (fase de deploy). Candidatos: VPS pequena, Fly.io, Shuttle. **Não** hospedar no
FeuVault (dorme por design / Wake-on-LAN).

## Fases

1. **Scaffold** (este commit) — estrutura, estética base, API com contato em modo log.
2. **Conteúdo & assets** — texturas e ilustrações do Clip Studio (ver `05-assets.md`), copy final revisada.
3. ~~**Contato real**~~ — feito: `lettre` + SMTP (Gmail com senha de app), ver `.env.example`.
4. **Deploy** — domínio, TLS, HSTS preload.
