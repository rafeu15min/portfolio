//! Stats de repositório do GitHub, com cache. Não é um proxy aberto: só
//! atende slugs de projetos públicos declarados em `content/projects.json`.

use crate::AppState;
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use serde::{Deserialize, Serialize};
use std::{
    sync::Arc,
    time::{Duration, Instant},
};

pub const CACHE_TTL: Duration = Duration::from_secs(60 * 60);

#[derive(Debug, Clone, Serialize)]
pub struct RepoStats {
    pub stars: u64,
    pub pushed_at: String,
    pub language: Option<String>,
}

#[derive(Deserialize)]
struct GhRepo {
    stargazers_count: u64,
    pushed_at: String,
    language: Option<String>,
}

pub async fn repo_stats(
    State(s): State<Arc<AppState>>,
    Path(slug): Path<String>,
) -> Result<Json<RepoStats>, StatusCode> {
    let repo = s.content.public_repo(&slug).ok_or(StatusCode::NOT_FOUND)?.to_owned();

    if let Some((at, stats)) = s.gh_cache.lock().unwrap_or_else(|e| e.into_inner()).get(&slug)
        && at.elapsed() < CACHE_TTL
    {
        return Ok(Json(stats.clone()));
    }

    let mut req = s
        .http
        .get(format!("https://api.github.com/repos/{repo}"))
        .header("Accept", "application/vnd.github+json")
        .header("User-Agent", "rafeu-portfolio-api");
    if let Some(token) = &s.github_token {
        req = req.bearer_auth(token);
    }

    let gh: GhRepo = req
        .send()
        .await
        .and_then(|r| r.error_for_status())
        .map_err(|e| {
            tracing::warn!("github {repo}: {e}");
            StatusCode::BAD_GATEWAY
        })?
        .json()
        .await
        .map_err(|_| StatusCode::BAD_GATEWAY)?;

    let stats = RepoStats { stars: gh.stargazers_count, pushed_at: gh.pushed_at, language: gh.language };
    s.gh_cache.lock().unwrap_or_else(|e| e.into_inner()).insert(slug, (Instant::now(), stats.clone()));
    Ok(Json(stats))
}
