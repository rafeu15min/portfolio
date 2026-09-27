# Portfólio — Rafael de Paulo (Rafeu)

Zine punk × cyberpunk vibrante × ASCII neon × vitral católico.
Front em **Vue 3 + Vite + TypeScript**, back em **Rust + Axum**. Em produção,
tudo vira um binário só.

```
content/   fonte única do conteúdo (projetos, trajetória) — lida pelo front e pela API
docs/      blueprint: manifesto, arquitetura, wireframes, design system, copy, assets
web/       front (Vue) — estética 100% CSS/SVG próprio, sem biblioteca de UI
api/       back (Rust) — API, headers de segurança, serve o web/dist
```

Comece por [`docs/00-manifesto.md`](docs/00-manifesto.md): toda decisão
precisa ser rastreável até ele.

## Rodar em desenvolvimento

Dois terminais:

```fish
cd api; cargo run              # API em http://localhost:8080
```

```fish
cd web; npm install; npm run dev   # site em http://localhost:5173 (proxy /api → :8080)
```

O site funciona sem a API: o conteúdo é embutido no build. A API só adiciona
stats do GitHub e recebe o formulário de contato.

## Build de produção (binário único)

```fish
cd web; npm run build
cd ../api; cargo build --release
./target/release/portfolio-api   # serve site + API em http://localhost:8080
```

Configuração por variável de ambiente: ver [`.env.example`](.env.example).

## Docker (produção)

```fish
docker compose up -d --build    # http://localhost:8080
docker compose ps               # deve mostrar (healthy)
docker compose down
```

Build multi-stage (Node → Rust → distroless): imagem final de ~57 MB, sem
shell, usuário não-root, filesystem só-leitura e sem capabilities. A porta
fica presa em `127.0.0.1` — em produção, um proxy reverso com TLS fica na
frente. Segredos (SMTP do contato, `GITHUB_TOKEN`) vêm de um `.env` local —
modelo em `.env.example`. Sem SMTP configurado, o formulário de contato
responde 503 em vez de fingir que recebeu.

## Publicação

Google Cloud Run + domínio `rafeu.dev` (Hostinger): ver
[`docs/06-deploy.md`](docs/06-deploy.md). Depois da preparação única,
cada publicação é `./deploy/cloudrun.sh`.

## Testes

```fish
cd api; cargo test        # headers, allowlist do proxy, contato, limites, conteúdo
cd web; npm run build     # inclui o type-check (vue-tsc)
```

## Editar conteúdo

- Projetos: `content/projects.json` (`visibility: "public"` libera o link e as
  stats do GitHub; o campo `todo` é nota interna e nunca sai pela API).
- Trajetória: `content/timeline.json`.
- Stack: `content/stack.json` — cada tecnologia aponta os projetos (slugs) onde aparece.
- Devoção: `content/devocao.json` (textos, posição e altura de cada imagem).
- Modelos 3D: `npm run models` (precisa do Blender) — ver `docs/05-assets.md`.
- Artes ASCII são regeneradas sozinhas no `dev`/`build` (`npm run ascii`).
