#!/usr/bin/env bash
# Publica o portfólio no Google Cloud Run (rode a cada deploy).
#   ./deploy/cloudrun.sh
# Constrói a imagem localmente (mesmo Dockerfile do compose), envia ao
# Artifact Registry e atualiza o serviço. Segredo do SMTP vem do Secret
# Manager (ver setup-gcp.sh); o resto da configuração é pública.
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="$(gcloud config get-value project 2>/dev/null)"
REGION="${REGION:-us-east1}"
REPO="${REPO:-portfolio}"
SERVICE="${SERVICE:-portfolio}"
# Cloud Run: o proxy do Google acrescenta o IP real ao fim do X-Forwarded-For
TRUSTED_PROXY_HOPS="${TRUSTED_PROXY_HOPS:-1}"
env_value() { grep -E "^$1=" .env | cut -d= -f2- | tr -d '[:space:]'; }

tag="$(git rev-parse --short HEAD)"
[ -z "$(git status --porcelain)" ] || tag="$tag-local"
IMAGE="$REGION-docker.pkg.dev/$PROJECT/$REPO/$SERVICE:$tag"

echo "construindo $IMAGE…"
docker build -t "$IMAGE" .
echo "enviando…"
docker push "$IMAGE"

echo "publicando no Cloud Run…"
# "^|^" troca o separador das variáveis de ',' para '|' (RUST_LOG tem vírgula)
gcloud run deploy "$SERVICE" \
  --image "$IMAGE" \
  --region "$REGION" \
  --allow-unauthenticated \
  --port 8080 \
  --cpu 1 --memory 512Mi \
  --min-instances 0 --max-instances 3 --concurrency 80 \
  --set-env-vars "^|^RUST_LOG=portfolio_api=info,tower_http=warn|TRUSTED_PROXY_HOPS=$TRUSTED_PROXY_HOPS|CANONICAL_HOST=portfolio.rafeu.dev|REDIRECT_HOSTS=portifolio.rafeu.dev|SMTP_USER=$(env_value SMTP_USER)|CONTACT_TO=$(env_value CONTACT_TO)" \
  --set-secrets "SMTP_PASSWORD=smtp-password:latest"

gcloud run services describe "$SERVICE" --region "$REGION" --format 'value(status.url)'
