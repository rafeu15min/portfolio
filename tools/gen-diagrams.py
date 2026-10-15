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

    def caption(self, x, y, text):
        """Título de sub-coluna: mono maiúsculo, centrado em x, sem máscara."""
        self.labels.append(
            f'<text x="{x}" y="{y}" text-anchor="middle" font-family="{MONO}" font-size="10" font-weight="700" '
            f'letter-spacing="0.08em" fill="{SOFT}">{escape(text.upper())}</text>'
        )

    def elbow(self, x1, y1, x2, y2, dashed=False, r=8):
        """Seta que desce de (x1,y1), anda na horizontal no meio do caminho e desce até (x2,y2)."""
        if x1 == x2:
            return self.arrow(f"M{x1},{y1} V{y2 - 2}", dashed)
        my = (y1 + y2) / 2
        s = 1 if x2 > x1 else -1
        self.arrow(
            f"M{x1},{y1} V{my - r} Q{x1},{my} {x1 + s * r},{my} H{x2 - s * r} Q{x2},{my} {x2},{my + r} V{y2 - 2}",
            dashed,
        )

    def node(self, x, y, w, h, name, sub, kind="plain", size=19, sub_size=12):
        fill, stroke, text, dash, sw = {
            "plain": (NODE, INK, INK, "", 1.6),
            "store": (KRAFT, INK, INK, "", 1.6),
            "external": (NODE, INK, INK, ' stroke-dasharray="6,4"', 1.4),
            "focal-ruby": (RUBY, INK, "#FFF8EC", "", 2),
            "focal-rust": (RUST, INK, INK, "", 2),
        }[kind]
        cy = y + h / 2
        name_y, sub_y = (cy - 2, cy + sub_size + 3) if sub else (cy + round(size * 0.32), None)
        out = (
            f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{fill}" stroke="{stroke}" stroke-width="{sw}"{dash}/>'
            f'<text x="{x + w / 2}" y="{name_y}" text-anchor="middle" font-family="{STENCIL}" font-size="{size}" '
            f'font-weight="800" letter-spacing="0.03em" fill="{text}">{escape(name)}</text>'
        )
        if sub:
            out += (
                f'<text x="{x + w / 2}" y="{sub_y}" text-anchor="middle" font-family="{TYPE}" font-size="{sub_size}" '
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
    """Três colunas que descem: vídeo, biblioteca e leitura. Cada uma começa no gatilho e
    termina onde o resultado fica (caixa kraft). Tracejado = serviço na internet."""
    W, H = 880, 640
    d = D(
        "anubis", W, H, "Anubis: vídeo, biblioteca e leitura",
        "Vídeo: o app busca o título no Prowlarr e no Anime Tosho; Assistir agora baixa com o librqbit e "
        "abre o player enquanto baixa, Pedir manda ao Radarr ou Sonarr e ao qBittorrent; os dois terminam "
        "no Jellyfin. Biblioteca: a limpeza acha cada arquivo pelo inode, planeja e apaga pelo Radarr, "
        "Sonarr e qBittorrent; a dublagem acha uma faixa em português, sincroniza em três pontos e junta "
        "com o FFmpeg; o Jellyfin é avisado. Leitura: o pedido tenta em ordem LibGen, Telegram e torrent "
        "em português; só com o seu clique tenta LibGen, Bookshelf e torrent em inglês; o Anubis confere "
        "idioma e formato e salva no Google Drive, de onde o KOReader do Kindle abre o livro e sincroniza "
        "o progresso pelo kosync.",
    )
    NH, ROW, Y0 = 52, 86, 84          # altura do nó, passo entre linhas, topo da 1ª linha
    LW, GAP, PAD = 272, 16, 14        # largura da coluna, espaço entre colunas, respiro interno
    SUBW = (LW - 2 * PAD - 10) / 2    # sub-coluna (ramos lado a lado)
    ys = [Y0 + i * ROW for i in range(6)]
    bot = lambda r: ys[r] + NH

    def lane(i, label):
        lx = GAP + i * (LW + GAP)
        d.zone(lx, 40, LW, ys[5] + NH + 22 - 40, label)
        ix = lx + PAD
        full = (ix, LW - 2 * PAD)
        left = (ix, SUBW)
        right = (ix + SUBW + 10, SUBW)
        return full, left, right

    cx = lambda col: col[0] + col[1] / 2
    big = dict(size=19, sub_size=11)
    small = dict(size=16, sub_size=11)

    def n(col, r, name, sub, kind="plain", **kw):
        d.node(col[0], ys[r], col[1], NH, name, sub, kind, **(kw or (big if col[1] > 150 else small)))

    # ---- vídeo ----
    F, L, R = lane(0, "vídeo")
    d.arrow(f"M{cx(F)},{bot(0)} V{ys[1] - 2}"); d.label(cx(F) + 8, (bot(0) + ys[1]) / 2, "fileiras", "start")
    d.arrow(f"M{cx(F)},{bot(1)} V{ys[2] - 2}")
    d.elbow(cx(F) - 24, bot(2), cx(L), ys[3]); d.elbow(cx(F) + 24, bot(2), cx(R), ys[3])
    d.arrow(f"M{cx(L)},{bot(3)} V{ys[4] - 2}"); d.arrow(f"M{cx(R)},{bot(3)} V{ys[4] - 2}")
    d.elbow(cx(L), bot(4), cx(F) - 24, ys[5]); d.elbow(cx(R), bot(4), cx(F) + 24, ys[5])
    n(F, 0, "Vitrine", "TMDB · AniList · histórico", "external")
    n(F, 1, "App", "você escolhe o título")
    n(F, 2, "Busca", "Prowlarr · Anime Tosho")
    n(L, 3, "Assistir agora", "librqbit", "focal-rust", size=14, sub_size=11)
    n(R, 3, "Pedir", "Radarr · Sonarr")
    n(L, 4, "Player", "enquanto baixa")
    n(R, 4, "qBittorrent", "baixa e semeia")
    n(F, 5, "Jellyfin", "fica na biblioteca", "store")

    # ---- biblioteca ----
    F, L, R = lane(1, "biblioteca")
    d.caption(cx(L), 68, "limpeza"); d.caption(cx(R), 68, "dublagem")
    for col in (L, R):
        for r in range(4):
            d.arrow(f"M{cx(col)},{bot(r)} V{ys[r + 1] - 2}")
    d.elbow(cx(L), bot(4), cx(F) - 24, ys[5]); d.elbow(cx(R), bot(4), cx(F) + 24, ys[5])
    for r, name, sub in [(0, "Timer", "e webhooks"), (1, "Inventário", "acha pelo inode"),
                         (2, "Plano", "o que pode sair"), (3, "Apaga", "Radarr · Sonarr"),
                         (4, "Remove", "o torrent")]:
        n(L, r, name, sub)
    for r, name, sub in [(0, "Webhook", "chegou sem PT-BR"), (1, "Acha", "uma dublagem"),
                         (2, "Sincroniza", "20 · 50 · 80%"), (3, "Junta", "FFmpeg"),
                         (4, "Importa", "Radarr · Sonarr")]:
        n(R, r, name, sub)
    n(F, 5, "Jellyfin", "avisado da mudança", "store")

    # ---- leitura ----
    F, L, R = lane(2, "leitura")
    d.elbow(cx(F) - 24, bot(0), cx(L), ys[1])
    d.elbow(cx(F) + 24, bot(0), cx(R), ys[1], dashed=True)
    for col in (L, R):
        for r in (1, 2):
            d.arrow(f"M{cx(col)},{bot(r)} V{ys[r + 1] - 2}")
            d.label(cx(col) + 6, (bot(r) + ys[r + 1]) / 2, "senão", "start")
    d.elbow(cx(L), bot(3), cx(F) - 24, ys[4]); d.elbow(cx(R), bot(3), cx(F) + 24, ys[4])
    d.arrow(f"M{cx(F)},{bot(4)} V{ys[5] - 2}")
    n(F, 0, "Pedido", "estante · /leitura")
    for r, name, sub, kind in [(1, "LibGen", "em português", "external"), (2, "Telegram", "canais PT-BR", "external"),
                               (3, "Torrent", "marcado PT-BR", "plain")]:
        n(L, r, name, sub, kind)
    for r, name, sub, kind in [(1, "LibGen", "em inglês", "external"), (2, "Bookshelf", "*arr de livros", "plain"),
                               (3, "Torrent", "Prowlarr", "plain")]:
        n(R, r, name, sub, kind)
    n(F, 4, "Valida", "idioma · EPUB ou PDF")
    n(F, 5, "Google Drive", "Kindle lê daqui · kosync", "store")

    # ---- legenda ----
    ly = H - 30
    d.labels.append(
        f'<rect x="{GAP}" y="{ly - 9}" width="26" height="14" rx="3" fill="{NODE}" stroke="{INK}" stroke-width="1.2" stroke-dasharray="4,3"/>'
        f'<text x="{GAP + 34}" y="{ly + 2}" font-family="{TYPE}" font-size="12" fill="{SOFT}">serviço na internet</text>'
        f'<rect x="{GAP + 200}" y="{ly - 9}" width="26" height="14" rx="3" fill="{KRAFT}" stroke="{INK}" stroke-width="1.2"/>'
        f'<text x="{GAP + 234}" y="{ly + 2}" font-family="{TYPE}" font-size="12" fill="{SOFT}">onde o resultado fica</text>'
        f'<path d="M{GAP + 430},{ly - 2} H{GAP + 462}" stroke="{INK}" stroke-width="1.5" stroke-dasharray="5,4" marker-end="url(#anubis-arrow)"/>'
        f'<text x="{GAP + 472}" y="{ly + 2}" font-family="{TYPE}" font-size="12" fill="{SOFT}">só com o seu clique, sem versão em português</text>'
    )
    return d


out = sys.argv[1]
for d, name in [(personal_bank(), "personal-bank-suite"), (anubis(), "anubis")]:
    open(f"{out}/{name}.svg", "w").write(d.svg())
    print(name, "ok")
