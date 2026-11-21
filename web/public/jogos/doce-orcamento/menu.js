// Menus: o menu inicial (arte do título + os 6 botões recortados da folha, nas
// posições do mockup) e o menu do jogo (Opções, Sobre, Salvar, Carregar,
// Histórico), como game/screens_menu.rpy e as telas do Ren'Py.
import { botao, el, img } from "./dom.js";
import { SLOTS } from "./saves.js";

const ROTULOS_MENU = { novo_jogo: "Novo jogo", continuar: "Continuar jogo", carregar: "Carregar", opcoes: "Opções", sobre: "Sobre o jogo", sair: "Sair" };

/** Menu inicial. 'acoes' = {novo_jogo, continuar, carregar, opcoes, sobre, sair}; continuar null = desabilitado. */
export function menuInicial({ assets, acoes, som }) {
  const botoes = assets.menu_botoes.map((b) => {
    const elemento = el("button", {
      type: "button", class: "botao-menu", id: "menu_" + b.id, "aria-label": ROTULOS_MENU[b.id] ?? b.id, disabled: !acoes[b.id],
      style: { left: b.pos[0] + "px", top: b.pos[1] + "px", width: b.tamanho[0] + "px", height: b.tamanho[1] + "px" },
      onclick: () => {
        acoes[b.id]();
      },
    });
    // Imagens dos 3 estados (normal, hover/foco, desabilitado) como variáveis CSS.
    ["idle", "hover", "insensitive"].forEach((estado) => elemento.style.setProperty("--" + estado, `url(${img(b.imagem + "_" + estado)})`));
    return elemento;
  });
  return el("div", { class: "menu-inicial", style: { backgroundImage: `url(${assets.fundos.titulo.web})` } },
    el("h1", { class: "so-leitor" }, "Doce Orçamento: A Feira dos Brigadeiros"), ...botoes);
}

// --- páginas do menu do jogo -------------------------------------------------------

function deslizante(rotulo, valor, aoMudar, formatar) {
  const saida = el("output", {}, formatar(valor));
  const entrada = el("input", { type: "range", min: 0, max: 100, step: 1, value: valor, "aria-label": rotulo,
    oninput: (e) => {
      saida.textContent = formatar(Number(e.target.value));
      aoMudar(Number(e.target.value));
    } });
  return el("div", { class: "opcao" }, el("label", {}, rotulo, " ", saida), entrada);
}

// Velocidade do texto: 0..99 = 10..148 letras por segundo; 100 = instantâneo (cps 0).
const velocidadeParaCps = (v) => (v >= 100 ? 0 : Math.round(10 + v * 1.4));
const cpsParaVelocidade = (cps) => (cps === 0 ? 100 : Math.round((cps - 10) / 1.4));

function telaCheia(ativar) {
  const pedido = ativar ? document.documentElement.requestFullscreen?.() : document.exitFullscreen?.();
  return Promise.resolve(pedido).catch(() => {});
}

function opcoes({ prefs, som }) {
  const salvar = () => {
    prefs.salvar();
    som.aplicarVolumes();
  };
  const modo = (cheia) => botao(cheia ? "Tela cheia" : "Janela", () => telaCheia(cheia).then(() => desenharModo()), { class: "botao radio" });
  const modos = [modo(false), modo(true)];
  const desenharModo = () => modos.forEach((b, i) => b.setAttribute("aria-pressed", String(Boolean(document.fullscreenElement) === (i === 1))));
  desenharModo();
  const mudo = el("input", { type: "checkbox", id: "mudo", checked: prefs.mudo, onchange: (e) => {
    prefs.mudo = e.target.checked;
    salvar();
  } });
  return [
    el("div", { class: "opcao" }, el("span", { class: "rotulo" }, "Tela"), el("div", { class: "radios" }, modos)),
    deslizante("Velocidade do texto", cpsParaVelocidade(prefs.cps), (v) => {
      prefs.cps = velocidadeParaCps(v);
      salvar();
    }, (v) => (v >= 100 ? "instantâneo" : velocidadeParaCps(v) + " letras/s")),
    deslizante("Volume da música", Math.round(prefs.musica * 100), (v) => {
      prefs.musica = v / 100;
      salvar();
    }, (v) => v + "%"),
    el("div", { class: "linha" }, deslizante("Volume dos efeitos", Math.round(prefs.efeitos * 100), (v) => {
      prefs.efeitos = v / 100;
      salvar();
    }, (v) => v + "%"), botao("Testar", () => som.efeito("acerto"), { class: "botao texto-botao" })),
    el("label", { class: "opcao marcar" }, mudo, " Silenciar tudo"),
  ];
}

function sobre({ c }) {
  const s = c.sobre;
  const licencas = [["licencas/LEIA-ME.txt", "Licenças e créditos de terceiros"], ["licencas/puppetbomb/readme.txt", "Puppetbomb: readme (CC BY-NC 3.0)"],
    ["licencas/Fulli.txt", "Fülli: sprites dos alunos"], ["fonts/OFL-Fredoka.txt", "Fredoka (OFL)"], ["fonts/OFL-Nunito.txt", "Nunito (OFL)"]];
  return [
    el("h2", {}, s.titulo), el("p", {}, "Versão " + s.versao),
    ...s.secoes.map((secao) => el("section", {}, el("h3", {}, secao.titulo), ...secao.texto.trim().split("\n").map((linha) => el("p", {}, linha)))),
    el("section", {}, el("h3", {}, "Licenças"), el("ul", {}, licencas.map(([href, texto]) => el("li", {}, el("a", { href, target: "_blank", rel: "noopener" }, texto))))),
    el("p", { class: "rodape" }, s.rodape),
  ];
}

const dataHora = (ms) => new Date(ms).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

function slot({ assets }, rotulo, ponto, aoEscolher) {
  const miniatura = ponto?.fundo ? el("img", { src: assets.fundos[ponto.fundo].web, alt: "" }) : el("div", { class: "vazio" });
  const texto = ponto ? [el("strong", {}, ponto.fase), el("small", {}, dataHora(ponto.quando))] : [el("strong", {}, "Vazio")];
  return el("button", { type: "button", class: "slot", disabled: !aoEscolher, onclick: aoEscolher,
    "aria-label": rotulo + ": " + (ponto ? ponto.fase + ", " + dataHora(ponto.quando) : "vazio") }, miniatura, el("span", {}, rotulo), ...texto);
}

function carregar(ctx) {
  return [el("div", { class: "slots" }, ctx.saves.todos().map(({ slot: s, ponto }) =>
    slot(ctx, s === "auto" ? "Automático" : "Espaço " + s, ponto, ponto ? () => ctx.carregar(ponto) : null)))];
}

function salvar(ctx, redesenhar) {
  const espacos = Array.from({ length: SLOTS }, (_, i) => String(i + 1));
  return [el("p", {}, "Salva o começo da cena atual."), el("div", { class: "slots" }, espacos.map((s) => slot(ctx, "Espaço " + s, ctx.saves.ler(s), () => {
    ctx.saves.salvar(s, ctx.ponto());
    ctx.som.efeito("pagina");
    redesenhar();
  })))];
}

function historico({ historico }) {
  if (!historico.length) return [el("p", {}, "Nada por aqui ainda.")];
  const linhas = historico.map((h) => el("li", { "data-tipo": h.tipo },
    el("strong", { style: { color: h.cor ?? "" } }, h.nome ?? (h.tipo === "escolha" ? "Você escolheu" : "")), el("span", {}, h.texto)));
  const lista = el("ol", { class: "historico rolagem" }, linhas);
  requestAnimationFrame(() => lista.lastChild?.scrollIntoView({ block: "end" }));
  return [lista];
}

const PAGINAS = {
  historico: ["Histórico", historico], salvar: ["Salvar", salvar], carregar: ["Carregar", carregar],
  opcoes: ["Opções", opcoes], sobre: ["Sobre", sobre],
};

/**
 * Menu do jogo numa camada. ctx: {camadas, emJogo, prefs, som, saves, c, assets,
 * historico, ponto(), carregar(ponto), menuPrincipal()}.
 */
export function abrirMenuJogo(pagina, ctx) {
  const titulo = el("h1", {});
  const conteudo = el("div", { class: "menu-conteudo rolagem" });
  const nomes = ctx.emJogo ? ["historico", "salvar", "carregar", "opcoes", "sobre"] : ["carregar", "opcoes", "sobre"];
  const navegacao = el("nav", { "aria-label": "Menu do jogo" });
  let fechar = () => {};
  const ir = (nome) => {
    const [rotulo, montar] = PAGINAS[nome];
    titulo.textContent = rotulo;
    conteudo.replaceChildren(...montar(ctx, () => ir(nome)));
    navegacao.querySelectorAll("button").forEach((b) => b.setAttribute("aria-current", String(b.dataset.pagina === nome)));
  };
  const itens = nomes.map((nome) => botao(PAGINAS[nome][0], () => {
    ir(nome);
  }, { class: "nav", "data-pagina": nome }));
  const extras = ctx.emJogo ? [botao("Menu principal", () => {
    fechar();
    ctx.menuPrincipal();
  }, { class: "nav" })] : [];
  navegacao.append(...itens, ...extras, botao("Voltar", () => fechar(), { class: "nav voltar" }));
  const janela = el("div", { class: "menu-jogo listrado" }, titulo, navegacao, conteudo);
  fechar = ctx.camadas.abrir(janela, { rotulo: "Menu do jogo" });
  ir(pagina);
  navegacao.querySelector(`[data-pagina="${pagina}"]`)?.focus({ preventScroll: true });
  return fechar;
}
