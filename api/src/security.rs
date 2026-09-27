//! Headers de segurança e rate limit por IP (janela fixa).

use axum::{
    Router,
    http::{HeaderMap, HeaderName, HeaderValue, header},
};
use std::{
    collections::HashMap,
    net::IpAddr,
    sync::Mutex,
    time::{Duration, Instant},
};
use tower_http::set_header::SetResponseHeaderLayer;

/// CSP estrita: só a origem própria + Google Fonts. Sem `unsafe-inline`/`unsafe-eval`.
/// Estilos dinâmicos do Vue passam via CSSOM, que a CSP não bloqueia.
pub const CSP: &str = "default-src 'self'; script-src 'self'; \
    style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; \
    img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; \
    form-action 'self'; object-src 'none'";

pub fn with_headers(router: Router) -> Router {
    let headers: [(HeaderName, &'static str); 6] = [
        (header::CONTENT_SECURITY_POLICY, CSP),
        (header::STRICT_TRANSPORT_SECURITY, "max-age=31536000; includeSubDomains"),
        (header::X_CONTENT_TYPE_OPTIONS, "nosniff"),
        (header::REFERRER_POLICY, "strict-origin-when-cross-origin"),
        (header::X_FRAME_OPTIONS, "DENY"),
        (
            HeaderName::from_static("permissions-policy"),
            "camera=(), microphone=(), geolocation=()",
        ),
    ];
    headers.into_iter().fold(router, |r, (name, value)| {
        r.layer(SetResponseHeaderLayer::if_not_present(name, HeaderValue::from_static(value)))
    })
}

/// IP do visitante. Sem proxy confiável (`trusted_hops = 0`), é o IP do
/// socket. Atrás de proxies (Cloud Run, Render…), cada proxy ACRESCENTA um IP
/// ao fim do X-Forwarded-For — o que vem antes disso o cliente pode forjar.
/// Por isso o IP confiável é o que está `trusted_hops` posições a partir do
/// fim, nunca o primeiro da lista.
pub fn client_ip(headers: &HeaderMap, peer: IpAddr, trusted_hops: usize) -> IpAddr {
    if trusted_hops == 0 {
        return peer;
    }
    let chain: Vec<&str> = headers
        .get_all("x-forwarded-for")
        .iter()
        .filter_map(|v| v.to_str().ok())
        .flat_map(|v| v.split(','))
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .collect();
    chain
        .len()
        .checked_sub(trusted_hops)
        .and_then(|i| chain[i].parse().ok())
        .unwrap_or(peer)
}

/// Rate limiter de janela fixa por IP. Pequeno o bastante pra não precisar de crate.
pub struct RateLimiter {
    max: u32,
    window: Duration,
    hits: Mutex<HashMap<IpAddr, (Instant, u32)>>,
}

impl RateLimiter {
    pub fn new(max: u32, window: Duration) -> Self {
        Self { max, window, hits: Mutex::new(HashMap::new()) }
    }

    /// `true` se a requisição pode passar.
    pub fn check(&self, ip: IpAddr) -> bool {
        self.check_at(ip, Instant::now())
    }

    fn check_at(&self, ip: IpAddr, now: Instant) -> bool {
        let mut hits = self.hits.lock().unwrap_or_else(|e| e.into_inner());
        // limpeza preguiçosa: não deixa o mapa crescer sem limite
        if hits.len() > 10_000 {
            hits.retain(|_, (start, _)| now.duration_since(*start) < self.window);
        }
        let entry = hits.entry(ip).or_insert((now, 0));
        if now.duration_since(entry.0) >= self.window {
            *entry = (now, 0);
        }
        entry.1 += 1;
        entry.1 <= self.max
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn blocks_after_max_and_resets_after_window() {
        let rl = RateLimiter::new(3, Duration::from_secs(60));
        let ip: IpAddr = "10.0.0.1".parse().unwrap();
        let t0 = Instant::now();
        assert!((0..3).all(|_| rl.check_at(ip, t0)));
        assert!(!rl.check_at(ip, t0));
        assert!(rl.check_at(ip, t0 + Duration::from_secs(61)));
    }

    #[test]
    fn client_ip_ignores_spoofed_prefix() {
        let peer: IpAddr = "10.0.0.1".parse().unwrap();
        let mut h = HeaderMap::new();
        // o cliente mandou "1.2.3.4"; o proxy acrescentou o IP real no fim
        h.insert("x-forwarded-for", HeaderValue::from_static("1.2.3.4, 200.1.2.3"));
        assert_eq!(client_ip(&h, peer, 1), "200.1.2.3".parse::<IpAddr>().unwrap());
        assert_eq!(client_ip(&h, peer, 2), "1.2.3.4".parse::<IpAddr>().unwrap());
        assert_eq!(client_ip(&h, peer, 0), peer); // sem proxy confiável: o socket
        assert_eq!(client_ip(&h, peer, 3), peer); // cadeia curta demais: o socket
        assert_eq!(client_ip(&HeaderMap::new(), peer, 1), peer);
    }

    #[test]
    fn ips_are_independent() {
        let rl = RateLimiter::new(1, Duration::from_secs(60));
        let t0 = Instant::now();
        assert!(rl.check_at("10.0.0.1".parse().unwrap(), t0));
        assert!(rl.check_at("10.0.0.2".parse().unwrap(), t0));
    }
}
