// Início do jogo web: lê os dados gerados (data/*.json), monta as peças
// (palco, diálogo, HUD, som...) e liga menu, teclado, escala 16:9 e o service
// worker (offline). Tudo relativo à pasta do index.html: roda em subcaminho e
// em <iframe>.
import { Palco } from "./palco.js";
import { Camadas } from "./camadas.js";
import { abrirCaderno } from "./caderno.js";
import { Dialogo } from "./dialogo.js";
import { ALTURA, botao, el, Esperas, LARGURA } from "./dom.js";
import { Hud } from "./hud.js";
import { Jogo } from "./jogo.js";
import { abrirMenuJogo, alternarTelaCheia, menuInicial } from "./menu.js";
import { Vitrine } from "./paineis.js";
import { Preferencias, Saves } from "./saves.js";
import { Som } from "./audio.js";

const json = (caminho) => fetch(caminho).then((r) => (r.ok ? r.json() : Promise.reject(new Error(caminho + ": " + r.status))));

const PASSOS_SETA = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
const EM_CENA = ".quiz, .escolhas:not(:empty), .carrinho, .tela-final, .cozinha, .menu-inicial";

/** Setas: foco no botão seguinte/anterior do grupo em cena (janela de cima, quiz,
 * escolhas, carrinho, menu...). Sliders (input) ficam com as setas deles. */
function moverFoco(evento, tela) {
  const passo = PASSOS_SETA[evento.key];
  if (!passo || evento.target.closest?.("input")) return;
  const janelas = tela.querySelectorAll(".camada");
  const grupo = document.activeElement?.closest?.("[role=group], [role=dialog]") ?? janelas[janelas.length - 1] ?? tela.querySelector(EM_CENA);
  const botoes = [...(grupo?.querySelectorAll("button:not(:disabled)") ?? [])];
  if (!botoes.length) return;
  evento.preventDefault();
  const atual = botoes.indexOf(document.activeElement);
  const base = atual < 0 ? Math.min(0, -passo) : atual;
  botoes[(base + passo + botoes.length) % botoes.length].focus();
}

/** Escala a tela 1920x1080 para caber na janela, com tarjas (letterbox). */
function escalar(tela) {
  const ajustar = () => {
    const escala = Math.min(window.innerWidth / LARGURA, window.innerHeight / ALTURA);
    tela.style.setProperty("--escala", String(escala));
  };
  window.addEventListener("resize", ajustar);
  ajustar();
}

function montar(c, assets) {
  const tela = document.getElementById("tela");
  tela.replaceChildren();
  const cenario = el("div", { class: "cenario", "aria-hidden": "true" });
  const atores = el("div", { class: "atores" });
  tela.append(cenario, atores);

  const prefs = new Preferencias();
  const som = new Som(c.web.fade_musica, prefs);
  const saves = new Saves();
  const esperas = new Esperas();
  const camadas = new Camadas(tela, () => jogo.rodando && menuDoJogo("salvar"));
  const palco = new Palco(cenario, atores, c, assets);
  const vitrine = new Vitrine(tela, c, assets);
  const dialogo = new Dialogo(tela, { esperas, prefs, som, livre: () => camadas.vazia });
  const hud = new Hud(tela, { som, abrirCaderno: () => caderno(), aoVerDica: () => jogo.marcarDicaVista() });
  const jogo = new Jogo({ c, assets, tela, palco, dialogo, hud, vitrine, som, saves, esperas, aoTerminar: () => mostrarMenu() });
  let menu = null;

  /** Abre o Caderno (botão ou tecla I); abrir também tira a dica da tecla I. */
  function caderno() {
    if (!jogo.cadernoLiberado || !camadas.vazia) return;
    jogo.marcarDicaVista();
    abrirCaderno({ camadas, estado: jogo.estado, c, assets, som });
  }

  function contexto(emJogo) {
    return { camadas, emJogo, prefs, som, saves, c, assets, historico: dialogo.historico, ponto: () => jogo.ponto,
      carregar: (ponto) => comecar(() => jogo.carregar(ponto)), menuPrincipal: () => mostrarMenu() };
  }

  function menuDoJogo(pagina) {
    if (camadas.vazia) abrirMenuJogo(pagina, contexto(jogo.rodando));
  }

  function comecar(acao) {
    camadas.fecharTodas();
    menu?.remove();
    menu = null;
    rapido.hidden = false;
    acao();
  }

  /** Sair: dentro de uma página (iframe) avisa a página, que fecha o jogo e volta ao
      botão "jogar"; numa aba própria tenta fechá-la (o navegador só deixa se foi aberta por script). */
  function sair() {
    if (window.parent !== window) {
      window.parent.postMessage({ tipo: "doce-orcamento:sair" }, window.location.origin);
      return;
    }
    window.close();
    setTimeout(() => hud.mensagem("Para sair, é só fechar esta aba ou janela."), 300);
  }

  /** Menu inicial (também ao fim do jogo e em "Menu principal"). */
  function mostrarMenu() {
    jogo.parar();
    camadas.fecharTodas();
    rapido.hidden = true;
    menu?.remove();
    const ultimo = saves.maisRecente();
    menu = menuInicial({ assets, som, acoes: {
      novo_jogo: () => comecar(() => jogo.novo()),
      continuar: ultimo ? () => comecar(() => jogo.carregar(ultimo)) : null,
      carregar: () => abrirMenuJogo("carregar", contexto(false)),
      opcoes: () => abrirMenuJogo("opcoes", contexto(false)),
      sobre: () => abrirMenuJogo("sobre", contexto(false)),
      sair,
    } });
    tela.append(menu);
    som.musica(c.web.musica_menu);
  }

  // Menu rápido (embaixo, como o do Ren'Py).
  const pular = botao("Pular", () => jogo.pular(!dialogo.pulando), { class: "rapido-botao", "aria-pressed": "false" });
  const rapido = el("nav", { class: "menu-rapido", "aria-label": "Menu rápido", hidden: true },
    botao("Histórico", () => menuDoJogo("historico"), { class: "rapido-botao" }), pular,
    botao("Salvar", () => menuDoJogo("salvar"), { class: "rapido-botao" }), botao("Carregar", () => menuDoJogo("carregar"), { class: "rapido-botao" }),
    botao("Opções", () => menuDoJogo("opcoes"), { class: "rapido-botao" }), botao("Menu", () => mostrarMenu(), { class: "rapido-botao" }));
  tela.append(rapido);
  // Tela cheia sempre à mão (também no menu inicial); some se o navegador não a oferece.
  if (document.documentElement.requestFullscreen) {
    const cheia = botao("⛶", alternarTelaCheia, { class: "tela-cheia-botao", "aria-label": "Alternar tela cheia", title: "Tela cheia" });
    tela.append(cheia);
  }
  new MutationObserver(() => pular.setAttribute("aria-pressed", String(tela.dataset.pulando === "sim")))
    .observe(tela, { attributes: true, attributeFilter: ["data-pulando"] });

  // Teclado: I abre/fecha o Caderno; Esc fica com as camadas (camadas.js); setas
  // movem o foco entre os botões do que está em cena (como no Ren'Py).
  document.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() !== "i" || e.ctrlKey || e.metaKey || e.altKey) return;
    if (camadas.vazia) caderno();
    else if (tela.querySelector(".caderno")) camadas.fecharTopo();
  });
  document.addEventListener("keydown", (e) => moverFoco(e, tela));
  // Som: o navegador só libera depois de um gesto; clique em todo botão.
  const desbloquear = () => som.desbloquear();
  document.addEventListener("pointerdown", desbloquear, true);
  document.addEventListener("keydown", desbloquear, true);
  tela.addEventListener("click", (e) => {
    if (e.target.closest("button:not(:disabled)")) som.efeito("clique");
  });

  som.carregarMusicas("jogo.pack");
  mostrarMenu();
}

async function iniciar() {
  escalar(document.getElementById("tela"));
  const [c, assets] = await Promise.all([json("data/conteudo.json"), json("data/assets.json")]);
  montar(c, assets);
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch((erro) => console.warn("sem modo offline:", erro));
}

iniciar().catch((erro) => {
  console.error(erro);
  document.getElementById("tela").replaceChildren(el("p", { class: "carregando" }, "Não foi possível abrir o jogo: " + erro.message));
});
