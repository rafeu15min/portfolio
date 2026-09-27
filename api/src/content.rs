//! Conteúdo do portfólio (`content/*.json`), carregado e validado na subida.
//! Se o JSON estiver quebrado, o servidor nem sobe — falha rápido.

use serde::{Deserialize, Serialize};
use std::{collections::HashSet, path::Path};

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Visibility {
    Public,
    Private,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct Project {
    pub slug: String,
    pub name: String,
    pub tagline: String,
    pub summary: String,
    pub highlights: Vec<String>,
    pub stack: Vec<String>,
    pub status: String,
    pub visibility: Visibility,
    pub repo: Option<String>,
    pub accent: String,
    /// Nota interna — nunca sai pela API.
    #[serde(default, skip_serializing)]
    pub todo: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Serialize)]
pub struct TimelineEntry {
    pub kind: String,
    pub org: Option<String>,
    pub role: String,
    pub period: Option<String>,
    pub text: String,
}

#[derive(Debug, Clone)]
pub struct Content {
    pub projects: Vec<Project>,
    pub timeline: Vec<TimelineEntry>,
}

impl Content {
    pub fn load(dir: &Path) -> Result<Self, String> {
        let read = |file: &str| {
            let path = dir.join(file);
            std::fs::read_to_string(&path).map_err(|e| format!("{}: {e}", path.display()))
        };
        let projects: Vec<Project> =
            serde_json::from_str(&read("projects.json")?).map_err(|e| format!("projects.json: {e}"))?;
        let timeline: Vec<TimelineEntry> =
            serde_json::from_str(&read("timeline.json")?).map_err(|e| format!("timeline.json: {e}"))?;
        let content = Self { projects, timeline };
        content.validate()?;
        Ok(content)
    }

    fn validate(&self) -> Result<(), String> {
        let mut seen = HashSet::new();
        for p in &self.projects {
            let slug_ok = !p.slug.is_empty()
                && p.slug.bytes().all(|b| b.is_ascii_lowercase() || b.is_ascii_digit() || b == b'-');
            if !slug_ok {
                return Err(format!("slug inválido: {:?}", p.slug));
            }
            if !seen.insert(&p.slug) {
                return Err(format!("slug duplicado: {}", p.slug));
            }
            if let Some(repo) = &p.repo {
                let valid = repo.split_once('/').is_some_and(|(owner, name)| {
                    let part = |s: &str| {
                        !s.is_empty() && s.bytes().all(|b| b.is_ascii_alphanumeric() || b"-_.".contains(&b))
                    };
                    part(owner) && part(name)
                });
                if !valid {
                    return Err(format!("{}: repo deve ser \"dono/nome\", veio {repo:?}", p.slug));
                }
            }
            if p.visibility == Visibility::Public && p.repo.is_none() {
                return Err(format!("{}: projeto público sem repo", p.slug));
            }
        }
        Ok(())
    }

    /// Repo do GitHub de um projeto, **somente se for público** (allowlist do proxy).
    pub fn public_repo(&self, slug: &str) -> Option<&str> {
        self.projects
            .iter()
            .find(|p| p.slug == slug && p.visibility == Visibility::Public)
            .and_then(|p| p.repo.as_deref())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn real_content_is_valid() {
        let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../content");
        let c = Content::load(&dir).expect("content/ deve ser válido");
        assert!(!c.projects.is_empty());
    }

    #[test]
    fn private_projects_are_not_proxied() {
        let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../content");
        let c = Content::load(&dir).unwrap();
        assert!(c.public_repo("vault-sync").is_none());
        assert!(c.public_repo("nao-existe").is_none());
    }

    #[test]
    fn todo_never_serialized() {
        let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("../content");
        let c = Content::load(&dir).unwrap();
        let json = serde_json::to_string(&c.projects).unwrap();
        assert!(!json.contains("\"todo\""));
    }
}
