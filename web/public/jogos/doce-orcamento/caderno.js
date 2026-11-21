// Caderno da Tesoureira (tecla I): abas Finanças, Amigos, Inventário e
// Glossário, como a screen caderno de game/screens_doce.rpy.
import { botao, el, img } from "./dom.js";
import { brl } from "./motor.js";
import { itemDaArte } from "./roteiro.js";

const ROTULOS = { financas: "Finanças", amigos: "Amigos", inventario: "Inventário", glossario: "Glossário" };

function cartao(titulo, valor, cor) {
  return el("div", { class: "cartao-valor" }, el("span", {}, titulo), el("strong", { style: { color: cor } }, brl(valor)));
}

function linhaExtrato(mov) {
  const pendente = mov.tipo === "a_receber";
  const sinal = pendente ? "" : mov.valor >= 0 ? "+" : "-";
  const cor = pendente ? "var(--ambar)" : mov.valor >= 0 ? "var(--verde)" : "var(--vermelho)";
  return el("li", {}, el("span", {}, mov.desc), el("strong", { style: { color: cor } }, sinal + brl(Math.abs(mov.valor)) + (pendente ? " (a receber)" : "")));
}

function financas(estado) {
  const pendencias = estado.a_receber || estado.dividas
    ? el("p", { class: "pendencias" }, `A receber: ${brl(estado.a_receber)}    Dívidas: ${brl(estado.dividas)}`) : null;
  const extrato = estado.extrato.length ? estado.extrato.map(linhaExtrato) : [el("li", {}, "Nenhuma movimentação ainda.")];
  return [
    el("div", { class: "cartoes" }, cartao("Receitas (entradas)", estado.receitas, "var(--verde)"),
      cartao("Despesas (saídas)", estado.despesas, "var(--vermelho)"), cartao("Lucro (rec. - desp.)", estado.lucroLiquido(), "var(--ambar)"),
      cartao("Caixa atual", estado.caixa, "var(--texto)")),
    pendencias, el("h3", {}, "Extrato"), el("ul", { class: "extrato rolagem" }, extrato)];
}

function amigos(estado, c) {
  const maximo = c.jogo.afinidade.maximo;
  const linhas = c.jogo.afinidade.personagens.map((pid) => {
    const pessoa = c.personagens[pid];
    const pontos = Math.min(estado.afinidade[pid], maximo);
    const barra = el("div", { class: "barra", role: "meter", "aria-label": "Amizade com " + pessoa.nome,
      "aria-valuemin": 0, "aria-valuemax": maximo, "aria-valuenow": pontos },
    el("div", { class: "barra-cheia", style: { width: (100 * pontos) / maximo + "%" } }));
    return el("div", { class: "amigo" }, el("strong", { style: { color: pessoa.cor } }, pessoa.nome), barra, el("span", {}, `${pontos} / ${maximo}`));
  });
  return [el("p", {}, "As suas escolhas aproximam você dos seus colegas!"), ...linhas];
}

/** Cartão de um item do inventário, com a arte do que foi comprado (itemDaArte; ex.: os brigadeiros). */
function cartaoItem(id, qtd, estado, c, assets) {
  const arte = itemDaArte(c.itens, estado, id);
  return el("div", { class: "item-cartao", "data-item": id, "data-arte": arte }, el("img", { src: img(assets.itens[arte]), alt: "" }),
    el("span", {}, c.itens[arte].nome), el("small", {}, "Quantidade: " + qtd));
}

function inventario(estado, c, assets) {
  const itens = Object.entries(estado.itens).filter(([id, q]) => q > 0 && Object.hasOwn(c.itens, id));
  if (!itens.length) return [el("p", {}, "Nada comprado ainda.")];
  return [el("div", { class: "inventario rolagem" }, itens.map(([id, qtd]) => cartaoItem(id, qtd, estado, c, assets)))];
}

function glossario(c) {
  return [el("dl", { class: "glossario rolagem" }, c.glossario.flatMap((t) => [el("dt", {}, t.termo), el("dd", {}, t.definicao)]))];
}

/** Abre o Caderno numa camada; devolve a função que o fecha. */
export function abrirCaderno({ camadas, estado, c, assets, som }) {
  const abas = c.jogo.caderno.abas;
  const corpo = el("div", { class: "caderno-corpo", role: "tabpanel" });
  const conteudo = { financas: () => financas(estado), amigos: () => amigos(estado, c),
    inventario: () => inventario(estado, c, assets), glossario: () => glossario(c) };
  const botoes = abas.map((aba) => botao(ROTULOS[aba], () => {
    som.efeito("pagina");
    selecionar(aba);
  }, { role: "tab", id: "aba_" + aba }));
  function selecionar(aba) {
    botoes.forEach((b, i) => b.setAttribute("aria-selected", String(abas[i] === aba)));
    corpo.replaceChildren(...conteudo[aba]().filter(Boolean));
  }
  let fechar = () => {};
  const janela = el("div", { class: "painel caderno" }, el("div", { class: "folha" },
    el("div", { class: "caderno-topo" }, el("h2", {}, c.jogo.caderno.nome), botao("Fechar (I)", () => fechar())),
    el("div", { class: "abas", role: "tablist" }, botoes), corpo));
  selecionar(abas[0]);
  som.efeito("pagina");
  fechar = camadas.abrir(janela, { rotulo: c.jogo.caderno.nome, classe: "escurecer" });
  return fechar;
}
