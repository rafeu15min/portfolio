// Painéis do jogo sobre o cenário: vitrine de preços (e o destaque do item
// feito), quiz de matemática e a tela 'Montar o carrinho' (screens vitrine,
// vitrine_destaque, quiz e carrinho do Ren'Py, game/screens_doce.rpy).
import { animar, botao, el, img, painel } from "./dom.js";
import { avaliarCarrinho, brl, carrinhoPadrao } from "./motor.js";
import { itemDaArte } from "./roteiro.js";

// Destaque (transforms destaque_viagem, destaque_plaquinha e destaque_fundo): entra no
// centro (0,5 s), fica parado (2,4 s) e viaja para o canto (1,0 s); a plaquinha some
// antes da viagem; o escuro em volta some durante a viagem. A cena espera tudo isso.
const DESTAQUE = { entra: 500, parado: 2400, viaja: 1000, sai: 500, escuro: 0.6,
  centro: [960, 450], canto: [285, 345], zoom: { de: 0.5, centro: 1.35, canto: 0.85 } };

/** Quadro do item em destaque: centro em (x, y), escala z. */
const quadroDestaque = ([x, y], z, extra = {}) => ({ left: x + "px", top: y + "px", transform: `translate(-50%, -50%) scale(${z})`, ...extra });

/** Vitrine de preços: grade de 3 colunas à esquerda (quem fala vai para a direita);
 * ou, com 'destaque', o item grande no centro que depois vai para o canto. */
export class Vitrine {
  #raiz;
  #destaque;

  constructor(tela, c, assets) {
    this.c = c;
    this.assets = assets;
    this.#raiz = el("div", { class: "vitrine", hidden: true, "aria-label": "Vitrine de preços" });
    this.#destaque = el("div", { class: "destaque", hidden: true });
    tela.append(this.#raiz, this.#destaque);
  }

  get aberta() {
    return !this.#raiz.hidden || !this.#destaque.hidden;
  }

  /** Mostra os itens 'ids' com a arte do que foi comprado (itemDaArte) e o preço, se houver.
   * Com 'destaque', devolve a promessa que resolve quando o item chega ao canto. */
  mostrar(ids, estado, destaque = false) {
    this.ocultar();
    if (destaque) return this.#destacar(itemDaArte(this.c.itens, estado, ids[0]));
    const precos = this.c.regras.precos;
    this.#raiz.replaceChildren(...ids.map((id) => {
      const arte = itemDaArte(this.c.itens, estado, id);
      return painel({ class: "vitrine-item", "data-item": id, "data-arte": arte },
        el("img", { src: img(this.assets.itens[arte]), alt: "" }), el("span", {}, this.c.itens[arte].nome),
        Object.hasOwn(precos, id) ? el("strong", {}, brl(precos[id])) : null);
    }));
    this.#raiz.hidden = false;
    return Promise.resolve();
  }

  /** Item feito (ex.: os brigadeiros prontos): sozinho no centro, com o resto da tela
   * escurecido e a plaquinha do nome; depois viaja para o canto (maior que a vitrine e
   * sem moldura) enquanto a tela clareia. Resolve quando ele chega ao canto. */
  #destacar(arte) {
    const nome = this.c.itens[arte].nome;
    const escuro = el("div", { class: "destaque-escuro" });
    const item = el("img", { class: "destaque-item", src: img(this.assets.itens[arte]), alt: nome, "data-arte": arte });
    const plaquinha = painel({ class: "destaque-plaquinha", "aria-hidden": "true" }, nome + "!");
    this.#destaque.replaceChildren(escuro, item, plaquinha);
    this.#destaque.hidden = false;
    const { entra, parado, viaja, sai, escuro: opacidade, centro, canto, zoom } = DESTAQUE;
    const total = entra + parado + viaja;
    const fimPlaquinha = entra + parado;
    animar(plaquinha, [{ opacity: 0, easing: "ease-out" }, { opacity: 1, offset: entra / fimPlaquinha },
      { opacity: 1, offset: (fimPlaquinha - sai) / fimPlaquinha, easing: "ease-in" }, { opacity: 0 }], { duration: fimPlaquinha });
    animar(escuro, [{ opacity: 0, easing: "ease-out" }, { opacity: opacidade, offset: entra / total },
      { opacity: opacidade, offset: (fimPlaquinha - sai) / total, easing: "ease-in-out" }, { opacity: 0 }], { duration: total });
    return animar(item, [
      quadroDestaque(centro, zoom.de, { opacity: 0, easing: "ease-out" }),
      quadroDestaque(centro, zoom.centro, { opacity: 1, offset: entra / total }),
      quadroDestaque(centro, zoom.centro, { opacity: 1, offset: fimPlaquinha / total, easing: "ease-in-out" }),
      quadroDestaque(canto, zoom.canto, { opacity: 1 }),
    ], { duration: total });
  }

  /** Fim da cena do item feito: ele some devagar (o dissolve do Ren'Py) e a vitrine fecha. */
  async fecharDestaque() {
    const item = this.#destaque.querySelector(".destaque-item");
    if (item) await animar(item, [{ opacity: 1 }, { opacity: 0 }], { duration: 250 });
    this.ocultar();
  }

  ocultar() {
    this.#raiz.hidden = true;
    this.#destaque.hidden = true;
    this.#destaque.replaceChildren();
  }
}

/** Quiz: título, pergunta e 3 opções; resolve com o índice escolhido. */
export function perguntarQuiz({ esperas, tela, titulo, montado, comVitrine, som }) {
  return esperas.esperar((resolver) => {
    const opcoes = montado.opcoes.map((texto, i) => botao(texto, () => {
      resolver(i);
    }, { class: "botao opcao-quiz", id: "quiz_opcao_" + i }));
    const caixa = painel({ class: "quiz" + (comVitrine ? " ao-lado" : ""), role: "group", "aria-label": titulo },
      el("small", { class: "rotulo-quiz" }, "Desafio de Matemática"), el("h2", {}, titulo), el("p", {}, montado.pergunta), ...opcoes);
    tela.append(caixa);
    // Foco no painel, não na 1ª opção: Espaço apertado às pressas não responde o quiz.
    caixa.tabIndex = -1;
    caixa.focus({ preventScroll: true });
    return () => caixa.remove();
  });
}

/** Versão vizinha do grupo (passo +1 = seta >, -1 = seta <), dando a volta no fim/início. */
export const versaoVizinha = (grupo, item, passo) => grupo[(grupo.indexOf(item) + passo + grupo.length) % grupo.length];

/** Carta do grupo na grade da vitrine: setas < > ao lado do ícone (só com versão
 * alternativa), nome, preço e 'n de m' (ou '(da receita)'). */
function cartaCarrinho(grupo, item, { c, assets }, trocar) {
  const nome = c.itens[item].nome;
  const alternativa = grupo.length > 1;
  const seta = (texto, passo, rotulo) => (alternativa
    ? botao(texto, () => trocar(passo), { class: "botao seta", "data-passo": passo, "aria-label": `${rotulo} de ${nome}` })
    : el("span", { class: "seta-vazia" }));
  const posicao = alternativa ? `${grupo.indexOf(item) + 1} de ${grupo.length}` : "(da receita)";
  return painel({ class: "vitrine-item carta-carrinho", "data-item": item },
    el("div", { class: "carta-topo" }, seta("<", -1, "Versão anterior"), el("img", { src: img(assets.itens[item]), alt: "" }), seta(">", 1, "Próxima versão")),
    el("span", {}, nome), el("strong", {}, brl(c.regras.precos[item])), el("small", { class: "posicao" }, posicao));
}

/** Linhas do resumo: caixa, total e o empréstimo (vermelho), a sobra (verde) ou o aviso. */
function linhasResumo(estado, no, av) {
  const situacao = av.emprestimo ? ["negativo", "Empréstimo do Lucas: " + brl(estado.avaliar(no.emprestimo.valor))]
    : av.ok ? ["positivo", "Sobra: " + brl(av.reserva)] : ["negativo", "Passou do que o caixa e o empréstimo cobrem"];
  return [el("span", {}, "Caixa: " + brl(estado.caixa)), el("span", {}, "Carrinho: " + brl(av.total)),
    el("span", { class: situacao[0], id: "carrinho_situacao" }, situacao[1])];
}

/** 'Montar o carrinho' na mesma grade da vitrine (canto superior esquerdo, 3 colunas):
 * as setas trocam a versão de cada grupo; o resumo fica à direita; resolve com os ids. */
export function montarCarrinho({ esperas, tela, no, estado, c, assets }) {
  return esperas.esperar((resolver) => {
    const escolha = carrinhoPadrao(no);
    const grade = el("div", { class: "vitrine grade-carrinho", "aria-label": "Itens do carrinho" });
    const linhas = el("div", { class: "linhas-resumo", role: "status" });
    const finalizar = botao("Finalizar compra", () => resolver([...escolha]), { id: "finalizar_compra" });
    const desenhar = (foco) => {
      const av = avaliarCarrinho(estado, no, escolha);
      grade.replaceChildren(...no.grupos.map((grupo, g) => cartaCarrinho(grupo, escolha[g], { c, assets }, (passo) => {
        escolha[g] = versaoVizinha(grupo, escolha[g], passo);
        desenhar({ g, passo });
      })));
      linhas.replaceChildren(...linhasResumo(estado, no, av));
      finalizar.disabled = !av.ok;
      tela.dataset.carrinho = escolha.join("+");
      // A troca redesenha a carta: o foco volta para a mesma seta (teclado).
      if (foco) grade.children[foco.g].querySelector(`[data-passo="${foco.passo}"]`)?.focus({ preventScroll: true });
    };
    const resumo = painel({ class: "resumo-carrinho" }, el("h2", {}, no.titulo),
      el("p", { class: "instrucao" }, "Escolha a versão de cada item e finalize a compra."), linhas, finalizar);
    const caixa = el("div", { class: "carrinho", role: "group", "aria-label": no.titulo }, grade, resumo);
    desenhar(null);
    tela.append(caixa);
    return () => {
      caixa.remove();
      delete tela.dataset.carrinho;
    };
  });
}
