//! Envio do formulário de contato por e-mail (SMTP). Nada é persistido: a
//! mensagem vai direto para a caixa de entrada configurada e sai da memória
//! do processo. Sem configuração, o contato responde 503 — nunca finge sucesso.

use crate::routes::contact::ContactForm;
use lettre::{
    Address, AsyncSmtpTransport, AsyncTransport, Message, Tokio1Executor,
    message::{Mailbox, header::ContentType},
    transport::smtp::authentication::Credentials,
};
use std::time::Duration;

enum Transport {
    Smtp(AsyncSmtpTransport<Tokio1Executor>),
    #[cfg(test)]
    Stub(lettre::transport::stub::AsyncStubTransport),
}

pub struct Mailer {
    from: Mailbox,
    to: Mailbox,
    transport: Transport,
}

impl Mailer {
    /// Lê a configuração do ambiente. `Ok(None)` quando faltam SMTP_USER,
    /// SMTP_PASSWORD ou CONTACT_TO: o contato fica desativado.
    ///
    /// - `SMTP_HOST` (padrão `smtp.gmail.com`), `SMTP_PORT` (opcional)
    /// - `SMTP_SECURITY`: `starttls` (padrão, porta 587), `tls` (465) ou
    ///   `none` (sem criptografia — só para teste local, ex.: Mailpit)
    pub fn from_env() -> Result<Option<Self>, String> {
        let get = |k: &str| std::env::var(k).ok().map(|v| v.trim().to_owned()).filter(|v| !v.is_empty());
        let (Some(user), Some(password), Some(to)) = (get("SMTP_USER"), get("SMTP_PASSWORD"), get("CONTACT_TO"))
        else {
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
        let to: Address = to.parse().map_err(|_| format!("CONTACT_TO não é um e-mail: {to}"))?;
        Ok(Some(Self {
            from: Mailbox::new(Some("Portfólio".into()), from_addr),
            to: Mailbox::new(None, to),
            transport: Transport::Smtp(transport),
        }))
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
    pub fn build(&self, form: &ContactForm) -> Result<Message, String> {
        let name = form.name.trim();
        let sender: Address = form.email.trim().parse().map_err(|_| "e-mail do visitante inválido".to_owned())?;
        Message::builder()
            .from(self.from.clone())
            .to(self.to.clone())
            .reply_to(Mailbox::new(Some(name.to_owned()), sender))
            .subject(format!("[Portfólio] Nova mensagem de {name}"))
            .header(ContentType::TEXT_PLAIN)
            .body(format!(
                "Nome: {name}\nE-mail: {}\n\n{}\n\n--\nEnviado pelo formulário de contato do portfólio.\n\
                 Responda este e-mail para falar com a pessoa.\n",
                form.email.trim(),
                form.message.trim(),
            ))
            .map_err(|e| e.to_string())
    }

    pub async fn send(&self, message: Message) -> Result<(), String> {
        match &self.transport {
            Transport::Smtp(t) => t.send(message).await.map(|_| ()).map_err(|e| e.to_string()),
            #[cfg(test)]
            Transport::Stub(t) => t.send(message).await.map_err(|e| e.to_string()),
        }
    }
}
