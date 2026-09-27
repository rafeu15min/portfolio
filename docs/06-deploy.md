# 06 — Deploy

Endereço principal: **https://portfolio.rafeu.dev** ·
`portifolio.rafeu.dev` redireciona para ele (308, preservando o caminho).

## Hospedagem atual: Render (gratuito)

Container inteiro (mesmo `Dockerfile`), sem cartão, domínio próprio com HTTPS.
Configuração no `render.yaml` (Blueprint). Limites do plano gratuito:
- **SMTP bloqueado** → o contato sai pela **API do Resend** (`RESEND_API_KEY`);
  sem domínio verificado no Resend, o remetente é `onboarding@resend.dev` e só
  entrega ao e-mail do dono da conta — que é exatamente o destino.
- **Dorme após 15 min** sem visitas (~1 min para acordar). Opcional: monitor
  gratuito (UptimeRobot) em `https://portfolio.rafeu.dev/api/health` a cada
  5 min — cabe nas 750 h/mês gratuitas.

### Passo a passo

1. **Resend** (https://resend.com): criar conta **com o mesmo e-mail** que vai
   receber as mensagens → API Keys → Create (permissão *Sending access*) →
   copiar a chave.
2. **Render** (https://render.com): entrar com o GitHub → **New → Blueprint**
   → repositório `rafeu15min/portfolio` → o Render lê o `render.yaml` e pede:
   `RESEND_API_KEY` (a chave do Resend) e `CONTACT_TO` (o seu e-mail).
   Confirmar → primeiro build (alguns minutos).
3. Testar pelo endereço `*.onrender.com` do serviço.
4. **Domínios**: já declarados no `render.yaml`; no serviço → Settings →
   Custom Domains, o Render mostra o destino de cada um.
5. **DNS na Hostinger** (hPanel → Domínios → rafeu.dev → Zona DNS): um
   **CNAME** `portfolio` e um **CNAME** `portifolio`, ambos para
   `<serviço>.onrender.com` (o valor que o Render mostrar). O HTTPS é emitido
   sozinho quando o DNS propagar.

Cada `git push` na `main` publica sozinho (`autoDeploy: true`).

---

## Alternativa: Koyeb

### Por que Koyeb

Gratuito sem cartão, roda o **container inteiro** (o mesmo `Dockerfile`),
domínio próprio com HTTPS, porta 587 (SMTP do Gmail) liberada. Dorme após
1 h sem visitas e acorda em 1–5 s. Região: Washington (EUA).

(O Cloud Run foi a primeira escolha, mas o cadastro de faturamento do Google
trava para pessoa física no Brasil — bug sem solução em 2026. Os scripts
`deploy/*.sh` e a seção no fim deste doc continuam válidos para ele.)

### Passo a passo (Koyeb)

1. **Conta**: https://app.koyeb.com → entrar com o GitHub.
2. **Criar serviço**: Create Service → **Web Service** → **GitHub** →
   repositório `rafeu15min/portfolio`, branch `main`.
   - Builder: **Dockerfile** (na raiz).
   - Instância: **Free** · Região: **Washington, D.C.**
   - Porta: **8080**, protocolo HTTP, rota `/`.
   - Health check: **HTTP**, caminho `/api/health`, porta 8080.
3. **Variáveis de ambiente** (Environment variables):
   | Nome | Valor | Tipo |
   |---|---|---|
   | `SMTP_USER` | o seu Gmail | texto |
   | `CONTACT_TO` | o e-mail que recebe as mensagens | texto |
   | `SMTP_PASSWORD` | a senha de app do Gmail (a mesma do `.env`) | **Secret** |
   | `CANONICAL_HOST` | `portfolio.rafeu.dev` | texto |
   | `REDIRECT_HOSTS` | `portifolio.rafeu.dev` | texto |
   | `TRUSTED_PROXY_HOPS` | `1` | texto |
4. **Deploy** e aguardar o build (alguns minutos). O serviço ganha um endereço
   `*.koyeb.app` — testar por ele antes do domínio.
5. **Domínios**: no serviço → Settings → **Domains** → adicionar
   `portfolio.rafeu.dev` e `portifolio.rafeu.dev`. O Koyeb mostra o **destino
   do CNAME** de cada um.
6. **DNS na Hostinger**: hPanel → Domínios → rafeu.dev → **Zona DNS** →
   para cada subdomínio, um registro **CNAME** (nome `portfolio` /
   `portifolio`, apontando para o destino mostrado pelo Koyeb). Se já existir
   outro registro com o mesmo nome, remova-o antes.
7. O HTTPS é emitido sozinho quando o DNS propagar (minutos a algumas horas).
   `.dev` exige HTTPS, então o endereço só abre depois disso.

Depois do primeiro deploy, cada `git push` na `main` publica sozinho.

---

## Alternativa: Google Cloud Run

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
