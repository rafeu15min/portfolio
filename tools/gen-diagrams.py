# Gera os diagramas de arquitetura do portfólio em SVG (só atributos de apresentação:
# a CSP do site bloqueia style inline). Uso: python3 gen_diagrams.py <pasta-de-saída>
import sys
from html import escape

INK = "#1A1A1A"
SOFT = "#3B362E"
PAPER = "#EDE6D6"      # mesmo papel do PaperCard (newsprint): é a cor das máscaras
NODE = "#FBF8F1"
KRAFT = "#C8A676"
RUBY = "#C8102E"
RUST = "#FF5F1F"
STENCIL = "'Big Shoulders Stencil Display', Impact, sans-serif"
TYPE = "'Courier Prime', 'Courier New', monospace"
MONO = "'JetBrains Mono', ui-monospace, monospace"


class D:
    def __init__(self, slug, w, h, title, desc):
        self.slug, self.w, self.h = slug, w, h
        self.title, self.desc = title, desc
        self.zones, self.arrows, self.labels, self.nodes = [], [], [], []

    def zone(self, x, y, w, h, label):
        self.zones.append(
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="none" stroke="{SOFT}" '
            f'stroke-width="1.2" stroke-dasharray="6,4"/>'
            f'<rect x="{x + 12}" y="{y - 8}" width="{len(label) * 6.6 + 12:.0f}" height="16" fill="{PAPER}"/>'
            f'<text x="{x + 18}" y="{y + 4}" font-family="{MONO}" font-size="10" font-weight="700" '
            f'letter-spacing="0.06em" fill="{SOFT}">{escape(label.upper())}</text>'
        )

    def arrow(self, d, dashed=False):
        dash = ' stroke-dasharray="5,4"' if dashed else ""
        self.arrows.append(
            f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="1.5"{dash} marker-end="url(#{self.slug}-arrow)"/>'
        )

    def label(self, x, y, text, anchor="middle"):
        """Rótulo de seta: maiúsculo, mono, sobre máscara de papel. (x, y) = centro do texto."""
        text = text.upper()
        w = len(text) * 6.2 + 10
        rx = {"middle": x - w / 2, "start": x - 5, "end": x - w + 5}[anchor]
        self.labels.append(
            f'<rect x="{rx:.1f}" y="{y - 8}" width="{w:.1f}" height="16" fill="{PAPER}"/>'
            f'<text x="{x}" y="{y + 3.5}" text-anchor="{anchor}" font-family="{MONO}" font-size="10" '
            f'font-weight="700" letter-spacing="0.04em" fill="{SOFT}">{escape(text)}</text>'
        )

    def node(self, x, y, w, h, name, sub, kind="plain"):
        fill, stroke, text, dash, sw = {
            "plain": (NODE, INK, INK, "", 1.6),
            "store": (KRAFT, INK, INK, "", 1.6),
            "external": (NODE, INK, INK, ' stroke-dasharray="6,4"', 1.4),
            "focal-ruby": (RUBY, INK, "#FFF8EC", "", 2),
            "focal-rust": (RUST, INK, INK, "", 2),
        }[kind]
        cy = y + h / 2
        name_y, sub_y = (cy - 2, cy + 15) if sub else (cy + 6, None)
        out = (
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{dash}/>'
            f'<text x="{x + w / 2}" y="{name_y}" text-anchor="middle" font-family="{STENCIL}" font-size="19" '
            f'font-weight="800" letter-spacing="0.03em" fill="{text}">{escape(name)}</text>'
        )
        if sub:
            out += (
                f'<text x="{x + w / 2}" y="{sub_y}" text-anchor="middle" font-family="{TYPE}" font-size="12" '
                f'fill="{text}">{escape(sub)}</text>'
            )
        self.nodes.append(out)

    def svg(self):
        s = self.slug
        return (
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {self.w} {self.h}" role="img" '
            f'aria-labelledby="{s}-title {s}-desc">'
            f'<title id="{s}-title">{escape(self.title)}</title>'
            f'<desc id="{s}-desc">{escape(self.desc)}</desc>'
            f'<defs><marker id="{s}-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" '
            f'orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="{INK}"/></marker></defs>'
            + "".join(self.zones + self.arrows + self.labels + self.nodes)
            + "</svg>\n"
        )


def personal_bank():
    d = D(
        "pbs", 880, 384,
        "Arquitetura do Personal Bank Suite",
        "O ms-consent conduz o consentimento OAuth com o banco, guarda os tokens no PostgreSQL e publica "
        "um evento no Kafka; os três serviços de dados consomem o evento, pedem o token ao ms-consent, "
        "buscam os dados no banco e gravam cada um no seu schema.",
    )
    d.zone(480, 172, 376, 192, "serviços de dados")
    # setas primeiro (ficam atrás das caixas)
    d.arrow("M160,84 H230")                                                  # navegador → consent
    d.arrow("M400,84 H598")                                                  # consent → banco
    d.arrow("M316,120 V194")                                                 # consent → kafka
    d.arrow("M400,224 H478")                                                 # kafka → serviços
    d.arrow("M728,172 V114")                                                 # serviços → banco
    d.arrow("M648,172 V156 Q648,148 640,148 H376 Q368,148 368,140 V122", dashed=True)  # pede token
    d.arrow("M256,120 V140 Q256,148 248,148 H124 Q116,148 116,156 V194")     # tokens → postgres
    d.arrow("M480,332 H124 Q116,332 116,324 V254")                           # grava → postgres
    d.label(196, 70, "inicia")
    d.label(500, 70, "OAuth 2.0")
    d.label(328, 160, "evento", "start")
    d.label(440, 210, "consome")
    d.label(740, 144, "busca dados", "start")
    d.label(512, 134, "pede token")
    d.label(186, 134, "tokens AES")
    d.label(300, 318, "grava")
    d.node(24, 56, 136, 56, "Navegador", "front-end")
    d.node(232, 48, 168, 72, "ms-consent", "OAuth · tokens", "focal-ruby")
    d.node(600, 56, 256, 56, "Banco", "Open Finance (mock-bank)", "external")
    d.node(232, 196, 168, 56, "Kafka", "consentimentos", "store")
    d.node(24, 196, 184, 56, "PostgreSQL", "um schema por serviço", "store")
    for i, name in enumerate(["ms-transactions", "ms-credit-cards", "ms-investments"]):
        d.node(504, 204 + i * 52, 328, 40, name, None)
    return d


def anubis():
    d = D(
        "anubis", 880, 384,
        "Arquitetura do Anubis",
        "O Anubis, em Rust, atende o app em Vue e o Kindle e coordena Sonarr e Radarr, qBittorrent, "
        "Jellyfin, as listas do TMDB e do AniList e a limpeza do disco RAID0.",
    )
    # portas no lado direito do Anubis (x=448, y 136..224), da de cima para a de baixo
    d.arrow("M448,148 H468 Q476,148 476,140 V56 Q476,48 484,48 H578")       # → Sonarr·Radarr
    d.arrow("M448,168 H492 Q500,168 500,160 V128 Q500,120 508,120 H578")    # → qBittorrent
    d.arrow("M448,192 H578")                                                # → Jellyfin
    d.arrow("M448,208 H492 Q500,208 500,216 V256 Q500,264 508,264 H578")    # → TMDB·AniList
    d.arrow("M448,220 H468 Q476,220 476,228 V328 Q476,336 484,336 H578")    # → disco
    d.arrow("M176,180 H254")                                                # app → Anubis
    d.arrow("M176,292 H272 Q280,292 280,284 V226")                          # Kindle → Anubis
    d.label(531, 34, "pedidos")
    d.label(543, 106, "downloads")
    d.label(513, 178, "biblioteca")
    d.label(543, 250, "vitrine")
    d.label(531, 322, "limpeza")
    d.label(214, 166, "HTTP")
    d.label(226, 278, "kosync")
    d.node(24, 152, 152, 56, "App", "Vue 3 · player")
    d.node(24, 264, 152, 56, "Kindle", "plugin KOReader")
    d.node(256, 136, 192, 88, "Anubis", "Rust · Tokio · Axum", "focal-rust")
    d.node(580, 24, 276, 48, "Sonarr · Radarr", None)
    d.node(580, 96, 276, 48, "qBittorrent", None)
    d.node(580, 168, 276, 48, "Jellyfin", None)
    d.node(580, 240, 276, 48, "TMDB · AniList", None, "external")
    d.node(580, 312, 276, 48, "Disco", "RAID0 · hardlinks", "store")
    return d


out = sys.argv[1]
for d, name in [(personal_bank(), "personal-bank-suite"), (anubis(), "anubis")]:
    open(f"{out}/{name}.svg", "w").write(d.svg())
    print(name, "ok")
