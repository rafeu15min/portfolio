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


class Grid:
    """Linhas de altura fixa para os diagramas verticais: posição das caixas por (x, w, linha)."""
    NH, ROW = 52, 86

    def __init__(self, d, y0):
        self.d, self.y0 = d, y0

    def y(self, r):
        return self.y0 + r * self.ROW

    def bot(self, r):
        return self.y(r) + self.NH

    def mid(self, r):
        return self.y(r) + self.NH / 2

    def n(self, x, w, r, name, sub, kind="plain", h=None, **kw):
        size = kw or (dict(size=19, sub_size=11) if w > 200 else dict(size=16, sub_size=11))
        self.d.node(x, self.y(r), w, h or self.NH, name, sub, kind, **size)

    def down(self, cx, r1, r2, label=None, dashed=False):
        self.d.arrow(f"M{cx},{self.bot(r1)} V{self.y(r2) - 2}", dashed)
        if label:
            self.d.label(cx + 8, (self.bot(r1) + self.y(r1 + 1)) / 2, label, "start")


def legend(d, y, items):
    """Legenda numa linha: [(tipo, texto)] com tipo em 'internet', 'kraft', 'dashed-arrow'."""
    x = 24
    out = []
    for kind, text in items:
        if kind == "internet":
            out.append(f'<rect x="{x}" y="{y - 9}" width="26" height="14" rx="3" fill="{NODE}" stroke="{INK}" stroke-width="1.2" stroke-dasharray="4,3"/>')
        elif kind == "kraft":
            out.append(f'<rect x="{x}" y="{y - 9}" width="26" height="14" rx="3" fill="{KRAFT}" stroke="{INK}" stroke-width="1.2"/>')
        else:
            out.append(f'<path d="M{x},{y - 2} H{x + 22}" stroke="{INK}" stroke-width="1.5" stroke-dasharray="5,4" marker-end="url(#{d.slug}-arrow)"/>')
        out.append(f'<text x="{x + 34}" y="{y + 2}" font-family="{TYPE}" font-size="12" fill="{SOFT}">{escape(text)}</text>')
        x += 34 + len(text) * 7.2 + 28
    d.labels.append("".join(out))


def claudesktop():
    g_rows = 5
    d = D(
        "claudesktop", 880, 40 + g_rows * 86 + 10, "Claudesktop: como o Claude age na tela",
        "O Claude Code chama o servidor MCP, que escolhe o caminho pelo alvo: AT-SPI para apps GTK ou Qt, "
        "CDP para páginas no Chromium, e OCR seguido de mouse e teclado reais (ydotool) para terminais e "
        "jogos. A ação acontece ao vivo na tela do Hyprland, e cada ação devolve um print ao Claude.",
    )
    g = Grid(d, 40)
    d.arrow(f"M440,{g.bot(0)} V{g.y(1) - 2}")
    for a, c in ((400, 160), (440, 440), (480, 720)):
        d.elbow(a, g.bot(1), c, g.y(2))
    g.down(160, 2, 4, "clica pelo nome")
    g.down(440, 2, 4, "clica pelo DOM")
    g.down(720, 2, 3, "acha a posição")
    g.down(720, 3, 4)
    yt, y0 = g.mid(4), g.mid(0)
    d.arrow(f"M840,{yt} H856 Q864,{yt} 864,{yt - 8} V{y0 + 8} Q864,{y0} 856,{y0} H592", dashed=True)
    d.label(856, g.bot(0) + 17, "print de cada ação", "end")
    g.n(290, 300, 0, "Claude Code", "pede uma ação")
    g.n(290, 300, 1, "Servidor MCP", "escolhe o caminho pelo alvo", "focal-rust")
    g.n(40, 240, 2, "AT-SPI", "app GTK ou Qt")
    g.n(320, 240, 2, "CDP", "página no Chromium")
    g.n(600, 240, 2, "OCR", "terminal ou jogo")
    g.n(600, 240, 3, "ydotool", "mouse e teclado reais")
    g.n(40, 800, 4, "Tela do Hyprland", "a ação acontece ao vivo", "store")
    return d


def vault_sync():
    d = D(
        "vault-sync", 880, 40 + 6 * 86 + 50, "vault-sync: o caminho de um jogo",
        "O botão Jogar da Steam ou do Heroic, ou o catálogo no SUPER+G, chama o vault-sync. Se o servidor "
        "estiver desligado, ele manda o ESP32 acordá-lo por MQTT com TLS e Wake-on-LAN. Então baixa o jogo "
        "e os saves por rsync, espera você fechar o jogo, sobe de volta só o que mudou e libera o SSD. No "
        "desligamento do PC, o systemd sobe o que tiver ficado pendente.",
    )
    g = Grid(d, 40)
    d.elbow(130, g.bot(0), 200, g.y(1)); d.elbow(330, g.bot(0), 260, g.y(1))
    d.arrow(f"M420,{g.mid(1)} H498"); d.label(459, g.mid(1) - 14, "desligado?")
    d.arrow(f"M670,{g.bot(1)} V{g.y(2) - 2}"); d.label(678, (g.bot(1) + g.y(2)) / 2, "acorda", "start")
    d.arrow(f"M500,{g.mid(2)} H422"); d.label(461, g.mid(2) - 14, "rsync")
    d.arrow(f"M420,{g.mid(4)} H498"); d.label(459, g.mid(4) - 14, "rsync")
    d.arrow(f"M670,{g.y(5)} V{g.bot(4) + 2}", dashed=True); d.label(678, (g.bot(4) + g.y(5)) / 2, "sobe o que ficou", "start")
    for r in range(1, 5):
        g.down(230, r, r + 1)
    g.n(40, 180, 0, "Steam · Heroic", "botão Jogar")
    g.n(240, 180, 0, "Catálogo", "SUPER+G")
    g.n(40, 380, 1, "vault-sync run", "um binário em Rust", "focal-rust")
    g.n(500, 340, 1, "ESP32", "MQTT com TLS → Wake-on-LAN")
    g.n(500, 340, 2, "Servidor", "onde os jogos ficam", "store", h=g.bot(4) - g.y(2))
    g.n(40, 380, 2, "Baixa", "jogo e saves")
    g.n(40, 380, 3, "Você joga", "o vault-sync espera fechar")
    g.n(40, 380, 4, "Sobe de volta", "só o que mudou")
    g.n(40, 380, 5, "Libera o SSD", "o espaço local volta")
    g.n(500, 340, 5, "systemd", "no desligamento do PC")
    legend(d, g.bot(5) + 34, [("kraft", "onde o resultado fica"), ("dashed-arrow", "só se algo ficou pendente")])
    return d


def token_econ():
    d = D(
        "token-econ-plugins", 880, 40 + 5 * 86 + 50, "Token Econ. Plugins: por onde passa cada chamada",
        "O Claude Code escreve o código, com a skill yagni-enforcer conferindo antes se o código é preciso. "
        "A memória do claude-mem passa pelo Headroom, que enxuga o contexto, e chega ao OmniRoute. Os "
        "comandos vão pelo script executor ao OpenCode, que usa um modelo mais barato pelo OmniRoute e, se "
        "ele falhar, os modelos grátis do próprio OpenCode. O OmniRoute distribui os pedidos entre contas "
        "com cota grátis. Headroom e OmniRoute são projetos abertos de terceiros.",
    )
    g = Grid(d, 40)
    d.arrow(f"M590,{g.mid(0)} H648", dashed=True)
    d.elbow(410, g.bot(0), 260, g.y(1)); d.elbow(470, g.bot(0), 620, g.y(1))
    g.down(260, 1, 2); g.down(620, 1, 2)
    d.elbow(260, g.bot(2), 410, g.y(3)); d.elbow(620, g.bot(2), 470, g.y(3))
    d.arrow(f"M720,{g.bot(2)} V{g.y(3) - 2}", dashed=True); d.label(728, (g.bot(2) + g.y(3)) / 2, "se falhar", "start")
    g.down(440, 3, 4)
    g.n(290, 300, 0, "Claude Code", "o Opus escreve o código")
    g.n(650, 210, 0, "yagni-enforcer", "skill: barra código a mais")
    g.n(130, 260, 1, "claude-mem", "memória entre sessões")
    g.n(490, 260, 1, "executor", "script que delega comandos")
    g.n(130, 260, 2, "Headroom", "projeto aberto · enxuga contexto")
    g.n(490, 260, 2, "OpenCode", "modelo mais barato")
    g.n(290, 300, 3, "OmniRoute", "projeto aberto · cascatas minhas", "focal-rust")
    g.n(640, 200, 3, "Grátis", "do próprio OpenCode", "external")
    g.n(290, 300, 4, "Provedores", "contas com cota grátis", "external")
    legend(d, g.bot(4) + 34, [("internet", "serviço na internet"), ("dashed-arrow", "reserva ou verificação")])
    return d


def portfolio():
    d = D(
        "portfolio", 880, 40 + 4 * 86 + 60, "Portfólio: publicar e visitar",
        "Um push na main dispara a GitHub Action, que monta o site em Vue e a API em Rust numa imagem Docker "
        "pública no GHCR. Na VM da Oracle em São Paulo, um timer puxa a imagem nova a cada 5 minutos. O "
        "visitante chega pelo Caddy, com HTTPS do Let's Encrypt, até a API, que serve o site, manda o "
        "e-mail do contato pelo Resend e busca estrelas e pushes na API do GitHub.",
    )
    g = Grid(d, 64)
    d.zone(464, g.y(1) - 22, 392, g.bot(2) - g.y(1) + 40, "VM Oracle · São Paulo")
    d.caption(220, 50, "publicar"); d.caption(660, 50, "visitar")
    g.down(220, 0, 1); g.down(220, 1, 2)
    g.down(660, 0, 1); g.down(660, 1, 2)
    d.arrow(f"M400,{g.mid(2)} H478"); d.label(439, g.mid(2) - 14, "5 min")
    d.elbow(620, g.bot(2), 565, g.y(3)); d.elbow(700, g.bot(2), 755, g.y(3))
    g.n(40, 360, 0, "Push na main", "GitHub")
    g.n(40, 360, 1, "GitHub Action", "monta Vue e Rust numa imagem")
    g.n(40, 360, 2, "GHCR", "imagem Docker pública", "store")
    g.n(480, 360, 0, "Visitante", "navegador")
    g.n(480, 360, 1, "Caddy", "HTTPS do Let's Encrypt")
    g.n(480, 360, 2, "API em Rust", "serve o site e o /api", "focal-rust")
    g.n(480, 170, 3, "Resend", "e-mail do contato", "external")
    g.n(670, 170, 3, "GitHub API", "estrelas e pushes", "external")
    legend(d, g.bot(3) + 34, [("internet", "serviço na internet"), ("kraft", "onde a imagem fica")])
    return d


def ship_n_click():
    d = D(
        "ship-n-click", 880, 64 + 5 * 86 + 20, "Ship'n'click: Rust e C# dentro da Godot",
        "A nave, os meteoros e os tiros são classes em Rust carregadas pela Godot via GDExtension. Elas "
        "avisam o GameManager em C# por sinais: morte, quase-colisão, moedas coletadas e dano causado. O "
        "GameManager cuida da run, das moedas e do respawn pago, e responde chamando métodos do Rust, como "
        "respawn e níveis da nave. Os power-ups vêm de um JSON e aparecem na janela de power-ups; o HUD "
        "mostra XP, setas e o cadáver.",
    )
    g = Grid(d, 64)
    d.zone(24, 40, 400, g.bot(2) - 40 + 22, "Rust · GDExtension")
    d.zone(456, 40, 400, g.bot(4) - 40 + 22, "C#")
    y = g.mid(0)
    d.arrow(f"M400,{y - 10} H478"); d.label(439, y - 24, "morreu")
    d.arrow(f"M480,{y + 12} H402"); d.label(441, y + 26, "renasce")
    d.arrow(f"M400,{g.mid(1)} H478"); d.label(439, g.mid(1) - 14, "moedas")
    d.arrow(f"M400,{g.mid(2)} H478"); d.label(439, g.mid(2) - 14, "dano")
    d.elbow(620, g.bot(2), 565, g.y(3)); d.elbow(700, g.bot(2), 755, g.y(3))
    d.arrow(f"M565,{g.y(4)} V{g.bot(3) + 2}"); d.label(573, (g.bot(3) + g.y(4)) / 2, "lê", "start")
    g.n(48, 352, 0, "Nave", "física, tiro, mina")
    g.n(48, 352, 1, "Meteoros", "nascem, racham, dão moedas")
    g.n(48, 352, 2, "Tiros", "pool reaproveitado")
    g.n(480, 352, 0, "GameManager", "run, moedas, respawn pago", "focal-rust", h=g.bot(2) - g.y(0))
    g.n(480, 170, 3, "Power-ups", "janela e efeitos")
    g.n(670, 162, 3, "HUD", "XP, setas, cadáver")
    g.n(480, 170, 4, "powerups.json", "regras em dados", "store")
    return d


def kernel():
    d = D(
        "kernel-heimdall", 880, 64 + 6 * 86 + 20, "Kernel Heimdall: o boot e uma tecla",
        "No boot, o bootloader entrega o controle ao kernel, que carrega a GDT com uma pilha extra para o "
        "double fault, a IDT com quem atende cada interrupção, inicia o PIC 8259, liga as interrupções com "
        "sti e dorme com hlt. Uma tecla vai do teclado PS/2 ao PIC, que avisa a CPU pela IRQ 1; a IDT aponta "
        "o tratador, que lê a porta 0x60, decodifica e imprime com a macro print! no buffer VGA em 0xb8000, "
        "e então avisa o PIC que terminou.",
    )
    g = Grid(d, 64)
    d.zone(24, 40, 400, g.bot(5) - 40 + 22, "boot")
    d.zone(456, 40, 400, g.bot(4) - 40 + 22, "uma tecla")
    for r in range(5):
        g.down(224, r, r + 1)
    for r in range(4):
        g.down(656, r, r + 1)
    d.arrow(f"M400,{g.mid(2)} H478", dashed=True); d.label(439, g.mid(2) - 14, "aponta")
    yh, yp = g.mid(2) + 8, g.mid(1) + 8
    d.arrow(f"M832,{yh} H840 Q848,{yh} 848,{yh - 8} V{yp + 8} Q848,{yp} 840,{yp} H834", dashed=True)
    d.label(842, (g.bot(1) + g.y(2)) / 2, "terminei", "end")
    g.n(48, 352, 0, "Bootloader", "QEMU · imagem do bootimage")
    g.n(48, 352, 1, "GDT", "pilha extra para o double fault")
    g.n(48, 352, 2, "IDT", "quem atende cada interrupção")
    g.n(48, 352, 3, "PIC 8259", "liga as linhas de hardware")
    g.n(48, 352, 4, "sti", "interrupções ligadas")
    g.n(48, 352, 5, "hlt", "dorme até a próxima")
    g.n(480, 352, 0, "Teclado PS/2", "você aperta uma tecla")
    g.n(480, 352, 1, "PIC 8259", "IRQ 1 avisa a CPU")
    g.n(480, 352, 2, "Tratador", "lê a porta 0x60 e decodifica", "focal-rust")
    g.n(480, 352, 3, "print!", "macro própria")
    g.n(480, 352, 4, "VGA 0xb8000", "o caractere aparece", "store")
    return d



out = sys.argv[1]
for d, name in [(personal_bank(), "personal-bank-suite"), (anubis(), "anubis"), (claudesktop(), "claudesktop"),
                (vault_sync(), "vault-sync"), (token_econ(), "token-econ-plugins"), (portfolio(), "portfolio"),
                (ship_n_click(), "ship-n-click"), (kernel(), "kernel-heimdall")]:
    open(f"{out}/{name}.svg", "w").write(d.svg())
    print(name, "ok")
