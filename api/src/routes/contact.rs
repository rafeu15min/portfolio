//! Formulário de contato. Privacidade por padrão (LGPD): nada é persistido —
//! a mensagem é enviada por e-mail (crate::mail) e descartada — e o log
//! registra só metadados, nunca o conteúdo nem os dados pessoais.

use crate::AppState;
use axum::{
    Json,
    extract::{ConnectInfo, State},
    http::StatusCode,
};
use serde::Deserialize;
use crate::security::client_ip;
use axum::http::HeaderMap;
use std::{
    net::{IpAddr, SocketAddr},
    sync::Arc,
};

#[derive(Debug, Deserialize)]
pub struct ContactForm {
    pub name: String,
    pub email: String,
    pub message: String,
    pub consent: bool,
    /// honeypot: humanos não veem esse campo
    #[serde(default)]
    pub website: String,
}

impl ContactForm {
    pub fn is_valid(&self) -> bool {
        let len = |s: &str| s.trim().chars().count();
        let email_ok = self.email.split_once('@').is_some_and(|(user, domain)| {
            !user.is_empty() && domain.contains('.') && !domain.starts_with('.') && !domain.ends_with('.')
        }) && !self.email.chars().any(char::is_whitespace);

        // quebra de linha/caractere de controle no nome iria para cabeçalhos do e-mail
        let name_ok = !self.name.chars().any(char::is_control);

        self.consent
            && name_ok
            && (1..=120).contains(&len(&self.name))
            && (3..=200).contains(&len(&self.email))
            && email_ok
            && (1..=4000).contains(&len(&self.message))
    }
}

pub async fn contact(
    State(s): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    Json(form): Json<ContactForm>,
) -> StatusCode {
    let ip = client_ip(&headers, addr.ip(), s.trusted_proxy_hops);
    // por visitante e, além disso, um teto global: mesmo que alguém forje o
    // IP, a caixa de entrada não recebe mais que isso por hora
    if !s.contact_limiter.check(ip) || !s.contact_global.check(IpAddr::from([0, 0, 0, 0])) {
        return StatusCode::TOO_MANY_REQUESTS;
    }
    // bot preencheu o honeypot: finge sucesso e descarta
    if !form.website.is_empty() {
        return StatusCode::NO_CONTENT;
    }
    if !form.is_valid() {
        return StatusCode::UNPROCESSABLE_ENTITY;
    }
    // sem SMTP configurado: 503, nunca um "recebido" falso
    let Some(mailer) = &s.mailer else {
        tracing::warn!("contato recebido mas SMTP não configurado — mensagem descartada");
        return StatusCode::SERVICE_UNAVAILABLE;
    };
    let Ok(message) = mailer.build(&form) else {
        return StatusCode::UNPROCESSABLE_ENTITY;
    };
    match mailer.send(message).await {
        Ok(()) => {
            tracing::info!(chars = form.message.chars().count(), "contato enviado por e-mail");
            StatusCode::NO_CONTENT
        }
        Err(e) => {
            tracing::error!("falha ao enviar contato por e-mail: {e}");
            StatusCode::BAD_GATEWAY
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn form() -> ContactForm {
        ContactForm {
            name: "Ana".into(),
            email: "ana@exemplo.com".into(),
            message: "Olá!".into(),
            consent: true,
            website: String::new(),
        }
    }

    #[test]
    fn valid_form_passes() {
        assert!(form().is_valid());
    }

    #[test]
    fn consent_is_mandatory() {
        assert!(!ContactForm { consent: false, ..form() }.is_valid());
    }

    #[test]
    fn rejects_header_injection_in_name() {
        assert!(!ContactForm { name: "Ana\r\nBcc: x@y.com".into(), ..form() }.is_valid());
    }

    #[test]
    fn rejects_bad_email_and_sizes() {
        assert!(!ContactForm { email: "ana@exemplo".into(), ..form() }.is_valid());
        assert!(!ContactForm { email: "a na@x.com".into(), ..form() }.is_valid());
        assert!(!ContactForm { name: "   ".into(), ..form() }.is_valid());
        assert!(!ContactForm { message: "x".repeat(4001), ..form() }.is_valid());
    }
}
