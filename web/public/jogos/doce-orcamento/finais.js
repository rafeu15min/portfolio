// Telas finais (como game/screens_doce.rpy): balanço, vocabulário e créditos.
import { botao, el, painel } from "./dom.js";
import { brl } from "./motor.js";

function cartao(titulo, valor, cor) {
  return el("div", { class: "cartao-valor" }, el("span", {}, titulo), el("strong", { style: { color: cor } }, brl(valor)));
}

function balanco({ estado, c }, continuar) {
  const final = c.nos.find((no) => no.tipo === "final").finais.find((f) => f.personagem === estado.final);
  const pessoa = c.personagens[estado.final];
  const total = c.web.total_quizzes;
  const acertos = total - Object.keys(estado.erros).length;
  return el("div", { class: "tela-final listrado" }, painel({ class: "balanco" },
    el("h1", {}, "Missão cumprida!"), el("p", {}, "Quem chamou você para sentar no ônibus:"),
    el("h2", { style: { color: pessoa.cor } }, pessoa.nome + " - " + final.perfil), el("p", { class: "mensagem" }, final.mensagem),
    el("div", { class: "cartoes" }, cartao("Receitas", estado.receitas, "var(--verde)"), cartao("Despesas", estado.despesas, "var(--vermelho)"),
      cartao("Lucro Líquido", estado.lucroLiquido(), "var(--ambar)")),
    el("p", {}, `Desafios acertados de primeira: ${acertos} de ${total}`), continuar("Continuar")));
}

function vocabulario({ c }, continuar) {
  const termos = new Map(c.glossario.map((t) => [t.id, t]));
  const cartoes = c.jogo.creditos.vocabulario.map((v) => painel({ class: "palavra" }, el("h3", {}, v.rotulo), el("p", {}, termos.get(v.termo).definicao)));
  return el("div", { class: "tela-final listrado" }, el("h1", {}, "Vocabulário da Tesoureira"), el("div", { class: "vocabulario" }, cartoes), continuar("Continuar"));
}

function creditos({ assets }, continuar) {
  return el("div", { class: "tela-final creditos", style: { backgroundImage: `url(${assets.fundos.creditos.web})` } },
    el("p", { class: "so-leitor" }, "Créditos do jogo"), continuar("Voltar ao menu"));
}

/** Derrota (lucro abaixo da meta): carregar um save ou recomeçar do zero. Não resolve sozinha:
 * quem sai daqui é o jogador, por um dos dois botões (tentar = {carregar, zero}, do main.js). */
function tentarNovamente({ tentar }) {
  return el("div", { class: "tela-final listrado" }, painel({ class: "balanco" },
    el("h1", {}, "Tentar novamente"), el("p", {}, "Volte a um save ou recomece a feira do zero."),
    el("div", { class: "cartoes" },
      botao("Carregar um save", () => tentar.carregar(), { id: "tentar_carregar" }),
      botao("Começar do zero", () => tentar.zero(), { id: "tentar_do_zero" }))));
}

const TELAS = { balanco, vocabulario, creditos, tentar_novamente: tentarNovamente };

/** Mostra a tela final 'tipo' e resolve quando o jogador continua (botão ou Enter). */
export function mostrarTelaFinal(tipo, deps) {
  return deps.esperas.esperar((resolver) => {
    const continuar = (texto) => botao(texto, () => {
      resolver();
    }, { id: "tela_continuar" });
    const tela = TELAS[tipo](deps, continuar);
    deps.tela.append(tela);
    // Nos créditos Enter volta ao menu (como o Ren'Py); nas outras, Espaço às pressas não pula a tela.
    const alvo = tipo === "creditos" ? tela.querySelector("#tela_continuar") : tela;
    tela.tabIndex = -1;
    alvo.focus({ preventScroll: true });
    return () => tela.remove();
  });
}
