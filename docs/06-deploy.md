# 06 — Deploy (Google Cloud Run + domínio na Hostinger)

Endereço principal: **https://portfolio.rafeu.dev** ·
`portifolio.rafeu.dev` redireciona para ele (308, preservando o caminho).

## Por que Cloud Run

Custo zero no volume de um portfólio (cota gratuita mensal), escala a zero e
volta em ~1 s (binário Rust), SMTP liberado nas portas 587/465, HTTPS
gerenciado. Região `us-east1` (o mapeamento de domínio não existe em
regiões da América do Sul).

## Uma vez só

1. **gcloud**: `paru -S google-cloud-cli`
2. **Conta e projeto** (console.cloud.google.com): criar projeto (ex.:
   `rafeu-portfolio`) e vincular uma conta de faturamento. Recomendado: alerta
   de orçamento (Faturamento → Orçamentos e alertas), ex.: R$ 5.
3. **Login**: `gcloud auth login` e `gcloud config set project rafeu-portfolio`
4. **Preparar o projeto**: `./deploy/setup-gcp.sh` — APIs, repositório de
   imagens, Docker autenticado, senha do SMTP no Secret Manager.

## Cada publicação

```fish
./deploy/cloudrun.sh
```

Constrói a imagem (mesmo `Dockerfile`), envia ao Artifact Registry e atualiza o
serviço `portfolio`. No fim imprime a URL `*.run.app`.

Configuração no Cloud Run (definida pelo script):

| Variável | Valor | Por quê |
|---|---|---|
| `TRUSTED_PROXY_HOPS` | 1 | o proxy do Google acrescenta o IP real ao fim do `X-Forwarded-For` |
| `CANONICAL_HOST` / `REDIRECT_HOSTS` | `portfolio.rafeu.dev` / `portifolio.rafeu.dev` | redirecionamento do domínio alternativo |
| `SMTP_USER`, `CONTACT_TO` | do `.env` | públicos |
| `SMTP_PASSWORD` | Secret Manager `smtp-password` | nunca em texto na configuração |

## Domínio (Hostinger)

1. **Verificar a posse** do domínio no Google:
   `gcloud domains verify rafeu.dev` → abre o Search Console, que pede um
   registro **TXT** na raiz. Na Hostinger: hPanel → Domínios → rafeu.dev →
   **Zona DNS** → adicionar TXT, nome `@`, valor `google-site-verification=…`.
2. **Mapear** os dois subdomínios ao serviço:
   ```fish
   gcloud beta run domain-mappings create --service portfolio --domain portfolio.rafeu.dev --region us-east1
   gcloud beta run domain-mappings create --service portfolio --domain portifolio.rafeu.dev --region us-east1
   ```
3. Na Zona DNS da Hostinger, **CNAME** para cada um:
   | Tipo | Nome | Aponta para |
   |---|---|---|
   | CNAME | `portfolio` | `ghs.googlehosted.com.` |
   | CNAME | `portifolio` | `ghs.googlehosted.com.` |
4. O certificado HTTPS sai sozinho em 15 min a 24 h. Como `.dev` exige HTTPS
   (HSTS preload), o endereço só abre depois disso.

## Segurança no ar

- Limite de contato: 3 mensagens/10 min por visitante **e** 20/hora no total.
- O IP do visitante vem da posição confiável do `X-Forwarded-For`, nunca do
  primeiro item (forjável) — ver `security::client_ip`.
- Headers de segurança, CSP, cache e compressão são os mesmos do local.
