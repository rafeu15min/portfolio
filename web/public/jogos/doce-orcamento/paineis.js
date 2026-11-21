// Painéis do jogo sobre o cenário: vitrine de preços, quiz de matemática e a
// tela 'Montar o carrinho' (screens vitrine, quiz e carrinho do Ren'Py).
import { botao, el, img, painel } from "./dom.js";
import { avaliarCarrinho, brl, carrinhoPadrao } from "./motor.js";
import { itemDaArte } from "./roteiro.js";

/** Vitrine de preços: grade de 3 colunas à esquerda (quem fala vai para a direita). */
export class Vitrine {
  #raiz;

  constructor(tela, c, assets) {
    this.c = c;
    this.assets = assets;
    this.#raiz = el("div", { class: "vitrine", hidden: true, "aria-label": "Vitrine de preços" });
    tela.append(this.#raiz);
  }

  get aberta() {
    return !this.#raiz.hidden;
  }

  /** Mostra os itens 'ids' com a arte do que foi comprado (itemDaArte) e o preço, se houver. */
  mostrar(ids, estado) {
    const precos = this.c.regras.precos;
    this.#raiz.replaceChildren(...ids.map((id) => {
      const arte = itemDaArte(this.c.itens, estado, id);
      return painel({ class: "vitrine-item", "data-item": id, "data-arte": arte },
        el("img", { src: img(this.assets.itens[arte]), alt: "" }), el("span", {}, this.c.itens[arte].nome),
        Object.hasOwn(precos, id) ? el("strong", {}, brl(precos[id])) : null);
    }));
    this.#raiz.hidden = false;
  }

  ocultar() {
    this.#raiz.hidden = true;
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

function cartaoGrupo(grupo, item, c, assets, trocar) {
  const preco = c.regras.precos[item];
  const acao = grupo.length > 1
    ? botao("Trocar versão", trocar, { "aria-label": "Trocar versão de " + c.itens[item].nome })
    : el("small", {}, "(da receita)");
  return el("div", { class: "folha grupo-carrinho" }, el("img", { src: img(assets.itens[item]), alt: "" }),
    el("span", {}, c.itens[item].nome), el("strong", {}, brl(preco)), acao);
}

function resumo(estado, no, av) {
  const situacao = av.emprestimo ? "Empréstimo do Lucas: " + brl(estado.avaliar(no.emprestimo.valor))
    : av.ok ? "Sobra: " + brl(av.reserva) : "Passou do que o caixa e o empréstimo cobrem";
  return [el("span", {}, "Caixa: " + brl(estado.caixa)), el("span", {}, "Carrinho: " + brl(av.total)), el("span", {}, situacao)];
}

/** 'Montar o carrinho': troca a versão de cada grupo; resolve com os ids ao finalizar. */
export function montarCarrinho({ esperas, tela, no, estado, c, assets, som }) {
  return esperas.esperar((resolver) => {
    const escolha = carrinhoPadrao(no);
    const grade = el("div", { class: "grupos-carrinho" });
    const linha = el("div", { class: "resumo-carrinho", role: "status" });
    const finalizar = botao("Finalizar compra", () => {
      resolver([...escolha]);
    }, { id: "finalizar_compra" });
    const desenhar = () => {
      const av = avaliarCarrinho(estado, no, escolha);
      grade.replaceChildren(...no.grupos.map((grupo, g) => cartaoGrupo(grupo, escolha[g], c, assets, () => {
        escolha[g] = grupo[(grupo.indexOf(escolha[g]) + 1) % grupo.length];
        desenhar();
        grade.children[g].querySelector("button")?.focus({ preventScroll: true });
      })));
      linha.replaceChildren(...resumo(estado, no, av));
      finalizar.disabled = !av.ok;
    };
    desenhar();
    const caixa = el("div", { class: "painel carrinho", role: "group", "aria-label": no.titulo },
      el("div", { class: "folha titulo-carrinho" }, el("h2", {}, no.titulo)), grade, linha, finalizar);
    tela.append(caixa);
    caixa.dataset.escolha = "";
    tela.dataset.carrinho = no.id;
    return () => {
      caixa.remove();
      delete tela.dataset.carrinho;
    };
  });
}
