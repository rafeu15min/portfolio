#!/usr/bin/env bash
# Preparação ÚNICA do Google Cloud para o portfólio (rode uma vez).
# Pré-requisitos: `gcloud auth login` feito e um projeto com faturamento ativo:
#   gcloud config set project SEU_PROJETO
#
# O que faz:
#   1. ativa as APIs: Cloud Run, Artifact Registry, Secret Manager
#   2. cria o repositório de imagens Docker (Artifact Registry)
#   3. autoriza o Docker local a enviar imagens para lá
#   4. guarda SMTP_PASSWORD (lida do .env, nunca impressa) no Secret Manager
#   5. dá ao Cloud Run permissão de ler esse segredo
set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="$(gcloud config get-value project 2>/dev/null)"
REGION="${REGION:-us-east1}"
REPO="${REPO:-portfolio}"
[ -n "$PROJECT" ] || { echo "defina o projeto: gcloud config set project SEU_PROJETO" >&2; exit 1; }
echo "projeto: $PROJECT · região: $REGION"

echo "1/5 ativando APIs…"
gcloud services enable run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com

echo "2/5 repositório de imagens…"
gcloud artifacts repositories describe "$REPO" --location "$REGION" >/dev/null 2>&1 ||
  gcloud artifacts repositories create "$REPO" --repository-format docker --location "$REGION" \
    --description "Imagens do portfólio"

echo "3/5 autenticando o Docker no Artifact Registry…"
gcloud auth configure-docker "$REGION-docker.pkg.dev" --quiet

echo "4/5 segredo do SMTP…"
password="$(grep -E '^SMTP_PASSWORD=' .env | cut -d= -f2- | tr -d '[:space:]')"
[ -n "$password" ] || { echo "SMTP_PASSWORD vazio no .env" >&2; exit 1; }
if gcloud secrets describe smtp-password >/dev/null 2>&1; then
  printf '%s' "$password" | gcloud secrets versions add smtp-password --data-file=- >/dev/null
else
  printf '%s' "$password" | gcloud secrets create smtp-password --replication-policy automatic --data-file=- >/dev/null
fi
unset password

echo "5/5 permissão de leitura do segredo para o Cloud Run…"
number="$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')"
gcloud secrets add-iam-policy-binding smtp-password \
  --member "serviceAccount:${number}-compute@developer.gserviceaccount.com" \
  --role roles/secretmanager.secretAccessor >/dev/null

echo "pronto. Próximo passo: ./deploy/cloudrun.sh"
