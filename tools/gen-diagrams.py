# Gera os diagramas de arquitetura do portfólio em SVG (só atributos de apresentação:
# a CSP do site bloqueia style inline). Uso: python3 tools/gen-diagrams.py content/diagrams
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


def hub(slug, title, desc, inputs, modules, zone_label="Anubis · Rust"):
    """Clientes à esquerda, módulos do Anubis numa zona no meio, serviços à direita.
    Cada saída de um módulo fica na altura do serviço: setas retas, sem cruzamento."""
    ZX, MX, MW, EX, EW = 208, 232, 256, 600, 256
    y = 56
    placed = []
    for name, sub, outs in modules:
        n = len(outs)
        h = max(88, 44 * n)
        ports = [y + h / 2] if n == 1 else [y + 22 + 44 * k for k in range(n)]
        placed.append((y, h, name, sub, list(zip(ports, outs))))
        y += h + 16
    total_h = y - 16 + 40
    d = D(slug, 880, int(total_h), title, desc)
    d.zone(ZX, 32, 304, total_h - 56, zone_label)
    for my, h, name, sub, outs in placed:
        for py, (ename, esub, kind, label) in outs:
            d.arrow(f"M{MX + MW},{py:.0f} H{EX - 2}")
            d.label((MX + MW + EX) / 2, py - 14, label)
    for name, sub, mi, label in inputs:
        my, h = placed[mi][0], placed[mi][1]
        cy = my + h / 2
        d.arrow(f"M160,{cy:.0f} H{MX - 2}")
        if label:
            d.label(196, cy - 14, label)
        d.node(24, cy - 28, 136, 56, name, sub)
    for my, h, name, sub, outs in placed:
        d.node(MX, my, MW, h, name, sub)
        for py, (ename, esub, kind, label) in outs:
            d.node(EX, py - 18, EW, 36, ename, esub, kind)
    return d


def anubis_video():
    return hub(
        "anubis-video", "Anubis: descobrir e assistir",
        "O app em Vue fala com o Anubis; a vitrine usa TMDB, AniList e o histórico importado, a busca "
        "consulta o Prowlarr e as faixas reais no Anime Tosho e no bitmagnet, o Assistir agora baixa com "
        "o librqbit, importa no Radarr e no Sonarr e passa o torrent ao qBittorrent, e a central de estado "
        "acompanha o Jellyfin.",
        [("App", "Vue 3 · player", 1, "HTTP")],
        [
            ("Vitrine e Para você", "listas e recomendações", [
                ("TMDB · AniList", None, "external", "listas"),
                ("Netflix · Crunchyroll", None, "external", "histórico")]),
            ("Busca", "disponibilidade por título", [
                ("Prowlarr", None, "plain", "indexadores"),
                ("Anime Tosho · bitmagnet", None, "external", "faixas reais")]),
            ("Assistir agora", "librqbit · legendas · FFmpeg", [
                ("Radarr · Sonarr", None, "plain", "importa"),
                ("qBittorrent", None, "plain", "semeia")]),
            ("Central de estado", "pedidos e downloads", [
                ("Jellyfin", None, "plain", "assistidos")]),
        ],
    )


def anubis_biblioteca():
    return hub(
        "anubis-biblioteca", "Anubis: manutenção da biblioteca",
        "Um timer e os webhooks disparam a limpeza de disco, que apaga pelo Radarr e pelo Sonarr, remove o "
        "torrent no qBittorrent, avisa o Jellyfin e confere os inodes no RAID0; a dublagem automática acha "
        "faixas em português pelo Prowlarr e as junta ao arquivo com o FFmpeg.",
        [("Gatilhos", "timer e hooks", 0, None),
         ("Webhook", "arquivo sem PT-BR", 1, None)],
        [
            ("Limpeza de disco", "inventário → plano → execução", [
                ("Radarr · Sonarr", None, "plain", "apaga"),
                ("qBittorrent", None, "plain", "remove torrent"),
                ("Jellyfin", None, "plain", "avisa"),
                ("Disco do servidor", None, "store", "inode")]),
            ("Dublagem automática", "autodub · dubsync · mux", [
                ("Prowlarr", None, "plain", "acha dublagem"),
                ("FFmpeg", None, "plain", "junta faixa")]),
        ],
    )


def anubis_leitura():
    return hub(
        "anubis-leitura", "Anubis: leitura",
        "A página de leitura mostra a estante e as fileiras montadas com Open Library, Amazon Brasil e "
        "AniList; a cadeia de download tenta Library Genesis, Bookshelf e Telegram, valida o EPUB ou PDF e "
        "salva no Google Drive; o kosync guarda o progresso único do Kindle, do KOReader e da página.",
        [("App", "/leitura", 0, "HTTP"),
         ("Kindle", "KOReader · celular", 2, None)],
        [
            ("Estante e fileiras", "gosto comum filmes ↔ livros", [
                ("Open Library", None, "external", "obras"),
                ("Amazon Brasil", None, "external", "mais vendidos"),
                ("AniList", None, "external", "mangás")]),
            ("Cadeia de download", "PT primeiro · valida EPUB/PDF", [
                ("Library Genesis", None, "external", "1ª fonte"),
                ("Bookshelf", None, "plain", "2ª fonte"),
                ("Telegram", None, "external", "canais PT-BR"),
                ("Google Drive", None, "store", "salva")]),
            ("kosync", "progresso de leitura único", []),
        ],
    )


out = sys.argv[1]
for d, name in [(personal_bank(), "personal-bank-suite"), (anubis_video(), "anubis--1-video"),
                (anubis_biblioteca(), "anubis--2-biblioteca"), (anubis_leitura(), "anubis--3-leitura")]:
    open(f"{out}/{name}.svg", "w").write(d.svg())
    print(name, "ok")
