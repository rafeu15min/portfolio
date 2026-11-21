// Janelas sobrepostas (Caderno, menus, histórico): uma pilha simples. Esc
// fecha a de cima; o foco vai para a janela e volta para onde estava.
import { el } from "./dom.js";

export class Camadas {
  #pilha = [];

  /** @param {() => void} semJanela  o que Esc faz sem janela aberta (abrir o menu do jogo) */
  constructor(tela, semJanela) {
    this.tela = tela;
    this.semJanela = semJanela;
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      if (this.#pilha.length) this.fecharTopo();
      else this.semJanela?.();
    });
  }

  get vazia() {
    return this.#pilha.length === 0;
  }

  /** Abre 'conteudo' numa janela modal; devolve a função que a fecha. */
  abrir(conteudo, { rotulo, aoFechar, classe = "" } = {}) {
    const anterior = document.activeElement;
    const camada = el("div", { class: "camada " + classe, role: "dialog", "aria-modal": "true", "aria-label": rotulo }, conteudo);
    this.tela.append(camada);
    const item = { camada, fechar: null };
    item.fechar = () => {
      if (!this.#pilha.includes(item)) return;
      this.#pilha.splice(this.#pilha.indexOf(item), 1);
      camada.remove();
      aoFechar?.();
      anterior?.focus?.({ preventScroll: true });
    };
    this.#pilha.push(item);
    camada.querySelector("button, [href], input, [tabindex]")?.focus({ preventScroll: true });
    return item.fechar;
  }

  fecharTopo() {
    this.#pilha.at(-1)?.fechar();
  }

  fecharTodas() {
    [...this.#pilha].reverse().forEach((item) => item.fechar());
  }
}
