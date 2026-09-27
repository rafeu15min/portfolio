//! portfolio-api — backend do portfólio do Rafeu.
//! Um binário: serve a API em /api e o front (web/dist) no resto.

mod content;
mod mail;
mod routes;
mod security;

use axum::{
    Router,
    extract::{DefaultBodyLimit, Request, State},
    http::{HeaderValue, header},
    middleware::{self, Next},
    response::{IntoResponse, Redirect, Response},
    routing::{get, post},
};
use content::Content;
use mail::Mailer;
use routes::github::RepoStats;
use security::RateLimiter;
use std::{
    collections::HashMap,
    net::{IpAddr, SocketAddr},
    path::PathBuf,
    sync::{Arc, Mutex},
    time::{Duration, Instant},
};
use tower_http::{
    services::{ServeDir, ServeFile},
    trace::TraceLayer,
};

pub struct AppState {
    pub content: Content,
    pub http: reqwest::Client,
    pub github_token: Option<String>,
    pub gh_cache: Mutex<HashMap<String, (Instant, RepoStats)>>,
    pub contact_limiter: RateLimiter,
    /// teto de mensagens somando todos os visitantes
    pub contact_global: RateLimiter,
    /// None = SMTP não configurado (contato responde 503)
    pub mailer: Option<Mailer>,
    /// proxies confiáveis à frente da API (0 = acesso direto) — ver security::client_ip
    pub trusted_proxy_hops: usize,
    /// domínio principal e domínios que redirecionam para ele (301)
    pub canonical_host: Option<String>,
    pub redirect_hosts: Vec<String>,
}

/// portifolio.rafeu.dev (e qualquer host em REDIRECT_HOSTS) → domínio principal,
/// preservando caminho e query.
async fn redirect_host(State(s): State<Arc<AppState>>, req: Request, next: Next) -> Response {
    if let Some(canonical) = &s.canonical_host {
        let host = req.headers().get(header::HOST).and_then(|h| h.to_str().ok()).unwrap_or("");
        let host = host.split(':').next().unwrap_or("").to_ascii_lowercase();
        if s.redirect_hosts.contains(&host) {
            let path = req.uri().path_and_query().map(|p| p.as_str()).unwrap_or("/");
            return Redirect::permanent(&format!("https://{canonical}{path}")).into_response();
        }
    }
    next.run(req).await
}

/// Cache por tipo de recurso: o HTML sempre revalida (senão um deploy novo
/// fica preso ao JS antigo), assets com hash no nome são imutáveis, modelos
/// 3D revalidam sempre (nome fixo: um modelo trocado tem que chegar na hora;
/// sem mudança, a resposta é um 304 sem corpo) e a API nunca é cacheada.
async fn cache_control(req: Request, next: Next) -> Response {
    let path = req.uri().path();
    let policy = if path.starts_with("/api/") {
        "no-store"
    } else if path.starts_with("/assets/") {
        "public, max-age=31536000, immutable"
    } else if path.starts_with("/models/") {
        "public, no-cache"
    } else {
        "no-cache"
    };
    let mut res = next.run(req).await;
    res.headers_mut().entry(header::CACHE_CONTROL).or_insert(HeaderValue::from_static(policy));
    res
}

pub fn app(state: Arc<AppState>, web_dist: PathBuf) -> Router {
    let redirect_state = state.clone();
    let api = Router::new()
        .route("/health", get(routes::health::health))
        .route("/projects", get(routes::content::projects))
        .route("/timeline", get(routes::content::timeline))
        .route("/github/{slug}", get(routes::github::repo_stats))
        .route("/contact", post(routes::contact::contact).layer(DefaultBodyLimit::max(16 * 1024)))
        .with_state(state);

    // SPA: rota desconhecida cai no index.html e o vue-router resolve
    // .br/.gz gerados no build (web/scripts/precompress.ts): entregues conforme o Accept-Encoding
    let spa = ServeDir::new(&web_dist)
        .precompressed_br()
        .precompressed_gzip()
        .fallback(ServeFile::new(web_dist.join("index.html")).precompressed_br().precompressed_gzip());

    security::with_headers(Router::new().nest("/api", api).fallback_service(spa))
        .layer(middleware::from_fn(cache_control))
        .layer(middleware::from_fn_with_state(redirect_state, redirect_host))
        .layer(TraceLayer::new_for_http())
}

fn env_path(key: &str, default: &str) -> PathBuf {
    std::env::var(key).map(PathBuf::from).unwrap_or_else(|_| PathBuf::from(default))
}

/// `portfolio-api healthcheck`: usado pelo HEALTHCHECK do Docker — a imagem
/// final (distroless) não tem curl. Sai com 0 se `/api/health` responder 200.
async fn healthcheck(port: u16) -> i32 {
    let url = format!("http://127.0.0.1:{port}/api/health");
    let client = reqwest::Client::builder().timeout(Duration::from_secs(3)).build();
    match client.map(|c| c.get(&url)) {
        Ok(req) => match req.send().await {
            Ok(res) if res.status().is_success() => 0,
            _ => 1,
        },
        Err(_) => 1,
    }
}

#[tokio::main]
async fn main() {
    let port: u16 = std::env::var("PORT").ok().and_then(|p| p.parse().ok()).unwrap_or(8080);
    if std::env::args().nth(1).as_deref() == Some("healthcheck") {
        std::process::exit(healthcheck(port).await);
    }

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "portfolio_api=info,tower_http=warn".into()),
        )
        .init();

    let content_dir = env_path("CONTENT_DIR", "../content");
    let web_dist = env_path("WEB_DIST", "../web/dist");
    // 127.0.0.1 por padrão; no container, HOST=0.0.0.0 (a exposição real é decidida no compose)
    let host: IpAddr = std::env::var("HOST").ok().and_then(|h| h.parse().ok()).unwrap_or(IpAddr::from([127, 0, 0, 1]));

    let content = Content::load(&content_dir).unwrap_or_else(|e| {
        eprintln!("conteúdo inválido em {}: {e}", content_dir.display());
        std::process::exit(1);
    });

    let mailer = Mailer::from_env().unwrap_or_else(|e| {
        eprintln!("configuração de e-mail inválida: {e}");
        std::process::exit(1);
    });
    match &mailer {
        Some(_) => tracing::info!("contato: envio por e-mail ativo"),
        None => tracing::warn!("contato: SMTP_USER/SMTP_PASSWORD/CONTACT_TO ausentes — formulário vai responder 503"),
    }

    let state = Arc::new(AppState {
        content,
        http: reqwest::Client::builder().timeout(Duration::from_secs(8)).build().expect("cliente http"),
        github_token: std::env::var("GITHUB_TOKEN").ok().filter(|t| !t.is_empty()),
        gh_cache: Mutex::new(HashMap::new()),
        // 3 mensagens a cada 10 minutos por IP; 20 por hora no total
        contact_limiter: RateLimiter::new(3, Duration::from_secs(600)),
        contact_global: RateLimiter::new(20, Duration::from_secs(3600)),
        mailer,
        trusted_proxy_hops: std::env::var("TRUSTED_PROXY_HOPS").ok().and_then(|v| v.parse().ok()).unwrap_or(0),
        canonical_host: std::env::var("CANONICAL_HOST").ok().filter(|v| !v.is_empty()),
        redirect_hosts: std::env::var("REDIRECT_HOSTS")
            .unwrap_or_default()
            .split(',')
            .map(|h| h.trim().to_ascii_lowercase())
            .filter(|h| !h.is_empty())
            .collect(),
    });

    let addr = SocketAddr::new(host, port);
    let listener = tokio::net::TcpListener::bind(addr).await.expect("bind");
    tracing::info!("portfolio-api em http://{addr} (web: {})", web_dist.display());
    axum::serve(listener, app(state, web_dist).into_make_service_with_connect_info::<SocketAddr>())
        .await
        .expect("servidor");
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        body::Body,
        extract::ConnectInfo,
        http::{Request, StatusCode, header},
    };
    use tower::ServiceExt;

    fn test_app_with(mailer: Option<Mailer>) -> Router {
        let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let state = Arc::new(AppState {
            content: Content::load(&root.join("../content")).unwrap(),
            http: reqwest::Client::new(),
            github_token: None,
            gh_cache: Mutex::new(HashMap::new()),
            contact_limiter: RateLimiter::new(2, Duration::from_secs(600)),
            contact_global: RateLimiter::new(20, Duration::from_secs(3600)),
            mailer,
            trusted_proxy_hops: 0,
            canonical_host: Some("portfolio.rafeu.dev".into()),
            redirect_hosts: vec!["portifolio.rafeu.dev".into()],
        });
        app(state, root.join("../web/dist"))
    }

    fn test_app() -> Router {
        test_app_with(None)
    }

    fn contact_req(body: &str) -> Request<Body> {
        let mut req = Request::post("/api/contact")
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(body.to_owned()))
            .unwrap();
        req.extensions_mut().insert(ConnectInfo(SocketAddr::from(([10, 0, 0, 9], 1234))));
        req
    }

    #[tokio::test]
    async fn health_has_security_headers() {
        let res = test_app().oneshot(Request::get("/api/health").body(Body::empty()).unwrap()).await.unwrap();
        assert_eq!(res.status(), StatusCode::OK);
        assert_eq!(res.headers()[header::CONTENT_SECURITY_POLICY], security::CSP);
        assert_eq!(res.headers()[header::X_CONTENT_TYPE_OPTIONS], "nosniff");
    }

    #[tokio::test]
    async fn alias_domain_redirects_to_canonical() {
        let req = Request::get("/devocao?x=1").header(header::HOST, "portifolio.rafeu.dev").body(Body::empty()).unwrap();
        let res = test_app().oneshot(req).await.unwrap();
        assert_eq!(res.status(), StatusCode::PERMANENT_REDIRECT);
        assert_eq!(res.headers()[header::LOCATION], "https://portfolio.rafeu.dev/devocao?x=1");

        let req = Request::get("/api/health").header(header::HOST, "portfolio.rafeu.dev").body(Body::empty()).unwrap();
        assert_eq!(test_app().oneshot(req).await.unwrap().status(), StatusCode::OK);
    }

    #[tokio::test]
    async fn cache_policy_by_path() {
        for (path, expected) in [
            ("/api/health", "no-store"),
            ("/", "no-cache"),
            ("/devocao", "no-cache"),
            ("/models/x.glb", "public, no-cache"),
            ("/assets/x.js", "public, max-age=31536000, immutable"),
        ] {
            let res = test_app().oneshot(Request::get(path).body(Body::empty()).unwrap()).await.unwrap();
            assert_eq!(res.headers()[header::CACHE_CONTROL], expected, "{path}");
        }
    }

    #[tokio::test]
    async fn github_proxy_refuses_private_and_unknown() {
        for slug in ["vault-sync", "torvalds-linux", "..%2F..%2Fetc"] {
            let res = test_app()
                .oneshot(Request::get(format!("/api/github/{slug}")).body(Body::empty()).unwrap())
                .await
                .unwrap();
            assert_eq!(res.status(), StatusCode::NOT_FOUND, "{slug}");
        }
    }

    #[tokio::test]
    async fn contact_validates_and_rate_limits() {
        let stub = lettre::transport::stub::AsyncStubTransport::new_ok();
        let app = test_app_with(Some(Mailer::stub(stub.clone())));
        let ok = r#"{"name":"Ana","email":"ana@x.com","message":"oi","consent":true,"website":""}"#;
        let no_consent = r#"{"name":"Ana","email":"ana@x.com","message":"oi","consent":false,"website":""}"#;

        let res = app.clone().oneshot(contact_req(no_consent)).await.unwrap();
        assert_eq!(res.status(), StatusCode::UNPROCESSABLE_ENTITY);
        let res = app.clone().oneshot(contact_req(ok)).await.unwrap();
        assert_eq!(res.status(), StatusCode::NO_CONTENT);
        let res = app.clone().oneshot(contact_req(ok)).await.unwrap();
        assert_eq!(res.status(), StatusCode::TOO_MANY_REQUESTS);

        // exatamente um e-mail, com o visitante no Reply-To
        let sent = stub.messages().await;
        assert_eq!(sent.len(), 1);
        let raw = &sent[0].1;
        assert!(raw.contains("Reply-To: Ana <ana@x.com>"), "{raw}");
        assert!(raw.contains("To: dono@exemplo.com"), "{raw}");
        assert!(raw.contains("oi"), "{raw}");
    }

    #[tokio::test]
    async fn contact_without_smtp_is_503_not_fake_success() {
        let ok = r#"{"name":"Ana","email":"ana@x.com","message":"oi","consent":true,"website":""}"#;
        let res = test_app().oneshot(contact_req(ok)).await.unwrap();
        assert_eq!(res.status(), StatusCode::SERVICE_UNAVAILABLE);
    }

    #[tokio::test]
    async fn contact_rejects_oversized_body() {
        let big = format!(r#"{{"name":"a","email":"a@b.co","message":"{}","consent":true}}"#, "x".repeat(20_000));
        let res = test_app().oneshot(contact_req(&big)).await.unwrap();
        assert_eq!(res.status(), StatusCode::PAYLOAD_TOO_LARGE);
    }
}
