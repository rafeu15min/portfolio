//! Envio do formulário de contato por e-mail. Nada é persistido: a mensagem
//! vai direto para a caixa de entrada configurada e sai da memória do
//! processo. Sem configuração, o contato responde 503 — nunca finge sucesso.
//!
//! Dois transportes, escolhidos pelo ambiente:
//! - **Resend** (API HTTPS), com `RESEND_API_KEY` — para hospedagens que
//!   bloqueiam SMTP (ex.: Render gratuito);
//! - **SMTP** (ex.: Gmail com senha de app), com `SMTP_USER`/`SMTP_PASSWORD`.

use crate::routes::contact::ContactForm;
use lettre::{
    Address, AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
    message::{Mailbox, header::ContentType},
    transport::smtp::authentication::Credentials,
};
use serde_json::json;
use std::time::Duration;

enum Transport {
    Smtp(AsyncSmtpTransport<Tokio1Executor>),
    Resend { http: reqwest::Client, key: String },
    #[cfg(test)]
    Stub(lettre::transport::stub::AsyncStubTransport),
}

pub struct Mailer {
    from: Mailbox,
    to: Mailbox,
    transport: Transport,
}

/// O e-mail montado, antes de escolher por onde ele sai.
pub struct Email {
    subject: String,
    body: String,
    reply_to: Mailbox,
}

impl Mailer {
    /// Lê a configuração do ambiente. `Ok(None)` quando falta configuração:
    /// o contato fica desativado.
    ///
    /// Resend (tem prioridade): `RESEND_API_KEY`, `CONTACT_TO` e, opcional,
    /// `RESEND_FROM` (padrão `onboarding@resend.dev` — sem domínio verificado,
    /// o Resend só entrega para o e-mail do dono da conta, que é o destino).
    ///
    /// SMTP: `SMTP_USER`, `SMTP_PASSWORD`, `CONTACT_TO`; `SMTP_HOST` (padrão
    /// `smtp.gmail.com`), `SMTP_PORT` (opcional), `SMTP_SECURITY`: `starttls`
    /// (padrão, 587), `tls` (465) ou `none` (só teste local, ex.: Mailpit).
    pub fn from_env() -> Result<Option<Self>, String> {
        let get = |k: &str| std::env::var(k).ok().map(|v| v.trim().to_owned()).filter(|v| !v.is_empty());
        let Some(to) = get("CONTACT_TO") else { return Ok(None) };
        let to = Mailbox::new(None, to.parse().map_err(|_| format!("CONTACT_TO não é um e-mail: {to}"))?);

        if let Some(key) = get("RESEND_API_KEY") {
            let from = get("RESEND_FROM").unwrap_or_else(|| "onboarding@resend.dev".into());
            let from: Address = from.parse().map_err(|_| format!("RESEND_FROM não é um e-mail: {from}"))?;
            let http = reqwest::Client::builder()
                .timeout(Duration::from_secs(15))
                .build()
                .map_err(|e| e.to_string())?;
            return Ok(Some(Self {
                from: Mailbox::new(Some("Portfólio".into()), from),
                to,
                transport: Transport::Resend { http, key },
            }));
        }

        let (Some(user), Some(password)) = (get("SMTP_USER"), get("SMTP_PASSWORD")) else {
            return Ok(None);
        };
        let host = get("SMTP_HOST").unwrap_or_else(|| "smtp.gmail.com".into());
        let security = get("SMTP_SECURITY").unwrap_or_else(|| "starttls".into());

        let mut builder = match security.as_str() {
            "starttls" => AsyncSmtpTransport::<Tokio1Executor>::starttls_relay(&host).map_err(|e| e.to_string())?,
            "tls" => AsyncSmtpTransport::<Tokio1Executor>::relay(&host).map_err(|e| e.to_string())?,
            "none" => AsyncSmtpTransport::<Tokio1Executor>::builder_dangerous(&host),
            other => return Err(format!("SMTP_SECURITY inválido: {other} (use starttls, tls ou none)")),
        };
        if let Some(port) = get("SMTP_PORT") {
            builder = builder.port(port.parse().map_err(|_| format!("SMTP_PORT inválido: {port}"))?);
        }
        let transport = builder
            .credentials(Credentials::new(user.clone(), password))
            .timeout(Some(Duration::from_secs(15)))
            .build();

        let from_addr: Address = user.parse().map_err(|_| format!("SMTP_USER não é um e-mail: {user}"))?;
        Ok(Some(Self {
            from: Mailbox::new(Some("Portfólio".into()), from_addr),
            to,
            transport: Transport::Smtp(transport),
        }))
    }

    /// Nome do transporte ativo, para o log de inicialização.
    pub fn kind(&self) -> &'static str {
        match self.transport {
            Transport::Smtp(_) => "SMTP",
            Transport::Resend { .. } => "Resend",
            #[cfg(test)]
            Transport::Stub(_) => "stub",
        }
    }

    #[cfg(test)]
    pub fn stub(stub: lettre::transport::stub::AsyncStubTransport) -> Self {
        Self {
            from: Mailbox::new(Some("Portfólio".into()), "site@exemplo.com".parse().unwrap()),
            to: Mailbox::new(None, "dono@exemplo.com".parse().unwrap()),
            transport: Transport::Stub(stub),
        }
    }

    /// Monta o e-mail: o visitante vai no Reply-To, para responder direto.
    pub fn build(&self, form: &ContactForm) -> Result<Email, String> {
        let name = form.name.trim();
        let sender: Address = form.email.trim().parse().map_err(|_| "e-mail do visitante inválido".to_owned())?;
        Ok(Email {
            subject: format!("[Portfólio] Nova mensagem de {name}"),
            body: format!(
                "Nome: {name}\nE-mail: {}\n\n{}\n\n--\nEnviado pelo formulário de contato do portfólio.\n\
                 Responda este e-mail para falar com a pessoa.\n",
                form.email.trim(),
                form.message.trim(),
            ),
            reply_to: Mailbox::new(Some(name.to_owned()), sender),
        })
    }

    fn smtp_message(&self, email: &Email) -> Result<Message, String> {
        Message::builder()
            .from(self.from.clone())
            .to(self.to.clone())
            .reply_to(email.reply_to.clone())
            .subject(email.subject.clone())
            .header(ContentType::TEXT_PLAIN)
            .body(email.body.clone())
            .map_err(|e| e.to_string())
    }

    /// Corpo JSON da API do Resend (POST /emails).
    fn resend_payload(&self, email: &Email) -> serde_json::Value {
        let mailbox = |m: &Mailbox| match &m.name {
            Some(n) => format!("{n} <{}>", m.email),
            None => m.email.to_string(),
        };
        json!({
            "from": mailbox(&self.from),
            "to": [self.to.email.to_string()],
            "reply_to": mailbox(&email.reply_to),
            "subject": email.subject,
            "text": email.body,
        })
    }

    pub async fn send(&self, email: Email) -> Result<(), String> {
        match &self.transport {
            Transport::Smtp(t) => t.send(self.smtp_message(&email)?).await.map(|_| ()).map_err(|e| e.to_string()),
            Transport::Resend { http, key } => {
                let res = http
                    .post("https://api.resend.com/emails")
                    .bearer_auth(key)
                    .json(&self.resend_payload(&email))
                    .send()
                    .await
                    .map_err(|e| e.to_string())?;
                if res.status().is_success() {
                    Ok(())
                } else {
                    let status = res.status();
                    Err(format!("Resend respondeu {status}: {}", res.text().await.unwrap_or_default()))
                }
            }
            #[cfg(test)]
            Transport::Stub(t) => t.send(self.smtp_message(&email)?).await.map_err(|e| e.to_string()),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resend_payload_has_reply_to_and_single_recipient() {
        let m = Mailer {
            from: Mailbox::new(Some("Portfólio".into()), "onboarding@resend.dev".parse().unwrap()),
            to: Mailbox::new(None, "dono@exemplo.com".parse().unwrap()),
            transport: Transport::Resend { http: reqwest::Client::new(), key: "k".into() },
        };
        let form = ContactForm {
            name: "Ana".into(),
            email: "ana@x.com".into(),
            message: "oi".into(),
            consent: true,
            website: String::new(),
        };
        let p = m.resend_payload(&m.build(&form).unwrap());
        assert_eq!(p["from"], "Portfólio <onboarding@resend.dev>");
        assert_eq!(p["to"], json!(["dono@exemplo.com"]));
        assert_eq!(p["reply_to"], "Ana <ana@x.com>");
        assert!(p["text"].as_str().unwrap().contains("oi"));
    }
}
