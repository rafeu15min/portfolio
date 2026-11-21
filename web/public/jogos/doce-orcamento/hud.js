// HUD do jogo: fase (alto à esquerda), caixa e botão do Caderno (alto à
// direita) e o aviso rápido quando o caixa muda (a afinidade NÃO aparece).
import { botao, el, painel } from "./dom.js";
import { brl } from "./motor.js";

const AVISO_MS = 3250;

export class Hud {
  #raiz;
  #fase;
  #caixa;
  #botaoCaderno;
  #aviso;
  #timer = 0;

  /** @param {{som, abrirCaderno: () => void}} deps */
  constructor(tela, deps) {
    Object.assign(this, deps);
    this.#fase = el("span");
    this.#caixa = el("span", { class: "valor-caixa" });
    this.#botaoCaderno = botao("Caderno (I)", () => this.abrirCaderno(), { "aria-keyshortcuts": "I" });
    this.#aviso = el("div", { class: "aviso", role: "status", hidden: true });
    this.#raiz = el("div", { class: "hud", hidden: true },
      painel({ class: "hud-fase" }, this.#fase),
      el("div", { class: "hud-direita" }, painel({ class: "hud-caixa" }, "Caixa: ", this.#caixa), this.#botaoCaderno));
    tela.append(this.#raiz, this.#aviso);
  }

  mostrar(visivel) {
    this.#raiz.hidden = !visivel;
    if (!visivel) this.#aviso.hidden = true;
  }

  fase(titulo) {
    this.#fase.textContent = titulo;
  }

  /** Caixa atual e se o Caderno pode abrir agora. */
  atualizar(estado, cadernoLiberado) {
    this.#caixa.textContent = brl(estado.caixa);
    this.#botaoCaderno.disabled = !cadernoLiberado;
  }

  /** Aviso do caixa ("Caixa +R$ 60,00") com o som de moeda. */
  avisar(avisos) {
    const partes = avisos.filter((a) => a.tipo === "caixa").map((a) => "Caixa " + (a.valor >= 0 ? "+" : "-") + brl(Math.abs(a.valor)));
    if (!partes.length) return;
    this.som.efeito("moeda");
    this.mensagem(partes.join("    "));
  }

  /** Aviso rápido no alto da tela (some sozinho). */
  mensagem(texto) {
    this.#aviso.textContent = texto;
    this.#aviso.hidden = false;
    clearTimeout(this.#timer);
    this.#timer = setTimeout(() => {
      this.#aviso.hidden = true;
    }, AVISO_MS);
  }
}
