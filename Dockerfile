# syntax=docker/dockerfile:1
# Portfólio: build do front (Vue) + build da API (Rust) → imagem final
# distroless com um binário só, sem shell, rodando como usuário não-root.

# ---- 1. front: gera o site estático em /src/web/dist ----
FROM node:26-slim AS web
WORKDIR /src/web
COPY web/package.json web/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
# o front importa ../content em build (conteúdo embutido + artes ASCII)
COPY content /src/content
COPY web ./
RUN npm run build

# ---- 2. api: compila o binário em modo release ----
FROM rust:1.94-slim-trixie AS api
# cmake: exigido pelo aws-lc-sys (TLS do reqwest)
RUN apt-get update \
 && apt-get install -y --no-install-recommends cmake \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /src/api
COPY api/Cargo.toml api/Cargo.lock ./
COPY api/src ./src
RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/src/api/target \
    cargo build --release --locked \
 && cp target/release/portfolio-api /portfolio-api

# ---- 3. runtime: só o necessário pra rodar ----
FROM gcr.io/distroless/cc-debian13:nonroot
WORKDIR /app
COPY --from=api /portfolio-api ./portfolio-api
COPY --from=web /src/web/dist ./web
COPY content ./content
ENV HOST=0.0.0.0 \
    PORT=8080 \
    CONTENT_DIR=/app/content \
    WEB_DIST=/app/web
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD ["/app/portfolio-api", "healthcheck"]
ENTRYPOINT ["/app/portfolio-api"]
