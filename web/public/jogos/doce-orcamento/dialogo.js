// Caixa de diálogo: nome, texto com efeito de máquina de escrever, avanço por
// clique/toque, Espaço ou Enter, histórico, modo pular e as escolhas A/B
// (a pergunta fica na caixa e as opções no meio da tela, como o menu do Ren'Py).
import { el } from "./dom.js";

const PULAR_MS = 60;

export class Dialogo {
  #raiz;
  #nome;
  #texto;
  #leitor;
  #escolhas;
  #digitando = null;   // {completar} enquanto o texto aparece
  #avancar = null;     // resolve a fala atual
  #pulando = false;
  historico = [];

  /**
   * @param {HTMLElement} tela   área do jogo (o clique nela avança)
   * @param {object} deps        {esperas, prefs, livre(): bool (nenhuma janela aberta), som}
   */
  constructor(tela, deps) {
    Object.assign(this, deps);
    this.#nome = el("div", { class: "dialogo-nome" });
    this.#texto = el("p", { class: "dialogo-texto" });
    this.#leitor = el("div", { class: "so-leitor", "aria-live": "polite" });
    this.#raiz = el("div", { class: "dialogo", hidden: true }, this.#nome, this.#texto, this.#leitor);
    this.#escolhas = el("div", { class: "escolhas", role: "group", "aria-label": "Escolhas" });
    tela.append(this.#raiz, this.#escolhas);
    tela.addEventListener("click", (e) => this.#clique(e));
    document.addEventListener("keydown", (e) => this.#tecla(e));
  }

  get pulando() {
    return this.#pulando;
  }

  /** Modo pular: ligado no meio de uma fala, ela já passa (como no Ren'Py); as
   * seguintes passam sozinhas até a próxima escolha, quiz ou tela. */
  set pulando(ligar) {
    this.#pulando = ligar;
    if (!ligar || !this.#avancar) return;
    this.#digitando?.completar();
    const avancar = this.#avancar;
    setTimeout(() => this.#avancar === avancar && avancar(), PULAR_MS);
  }

  #clique(evento) {
    if (evento.target.closest("button, a, input, .painel, .camada")) return;
    this.#seguir();
  }

  #tecla(evento) {
    if (evento.key !== " " && evento.key !== "Enter") return;
    if (evento.target.closest?.("button, a, input")) return;
    if (this.#seguir()) evento.preventDefault();
  }

  /** Avança: completa o texto que está aparecendo ou passa para a próxima fala. */
  #seguir() {
    if (!this.livre() || !this.#avancar) return false;
    if (this.#digitando) this.#digitando.completar();
    else this.#avancar();
    return true;
  }

  /**
   * Mostra uma fala e espera o jogador avançar.
   * @param {{nome?: string, cor?: string, texto: string, tipo: "fala"|"narracao"|"acao"}} linha
   */
  dizer(linha) {
    this.historico.push(linha);
    return this.esperas.esperar((resolver) => {
      this.#mostrar(linha);
      this.#avancar = resolver;
      const pular = this.pulando ? setTimeout(() => resolver(), PULAR_MS) : null;
      return () => {
        clearTimeout(pular);
        this.#digitando?.parar();
        this.#digitando = null;
        this.#avancar = null;
      };
    });
  }

  #mostrar({ nome, cor, texto, tipo }) {
    this.#raiz.hidden = false;
    this.#raiz.dataset.tipo = tipo;
    this.#nome.textContent = nome ?? "";
    this.#nome.style.color = cor ?? "";
    this.#leitor.textContent = (nome ? nome + ": " : "") + texto;
    this.#digitar(texto);
  }

  /** Máquina de escrever (letras por segundo das Opções; 0 ou pulando = tudo de uma vez). */
  #digitar(texto) {
    const cps = this.pulando ? 0 : this.prefs.cps;
    if (!cps) {
      this.#texto.textContent = texto;
      return;
    }
    const inicio = performance.now();
    let quadro = 0;
    const parar = () => cancelAnimationFrame(quadro);
    const completar = () => {
      parar();
      this.#texto.textContent = texto;
      this.#digitando = null;
    };
    const passo = (agora) => {
      const n = Math.floor(((agora - inicio) / 1000) * cps);
      if (n >= texto.length) return completar();
      this.#texto.textContent = texto.slice(0, n);
      quadro = requestAnimationFrame(passo);
      return undefined;
    };
    this.#digitando = { completar, parar };
    this.#texto.textContent = "";
    quadro = requestAnimationFrame(passo);
  }

  ocultar() {
    this.#raiz.hidden = true;
  }

  /** Escolha A/B: a pergunta na caixa, as opções no centro; resolve com o índice. */
  perguntar(pergunta, opcoes) {
    this.pulando = false;
    this.historico.push({ texto: pergunta, tipo: "narracao" });
    return this.esperas.esperar((resolver) => {
      this.#mostrar({ texto: pergunta, tipo: "narracao" });
      this.#digitando?.completar();
      const botoes = opcoes.map((texto, i) => el("button", {
        type: "button", class: "escolha", onclick: () => {
          this.historico.push({ texto, tipo: "escolha" });
          resolver(i);
        },
      }, texto));
      this.#escolhas.replaceChildren(...botoes);
      // Foco no grupo (Tab chega às opções): Espaço apertado às pressas não escolhe nada.
      this.#escolhas.tabIndex = -1;
      this.#escolhas.focus({ preventScroll: true });
      return () => this.#escolhas.replaceChildren();
    });
  }
}
