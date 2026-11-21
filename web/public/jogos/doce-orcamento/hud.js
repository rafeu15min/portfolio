// HUD do jogo: fase (alto à esquerda), caixa e botão do Caderno (alto à
// direita), a dica discreta da tecla I logo abaixo do botão e o aviso rápido
// quando o caixa muda (a afinidade NÃO aparece).
import { botao, el, painel } from "./dom.js";
import { brl } from "./motor.js";

const AVISO_MS = 3250;
const DICA_MS = 9000;   // timer 9.0 da screen hud no Ren'Py

export class Hud {
  #raiz;
  #fase;
  #caixa;
  #botaoCaderno;
  #dica;
  #aviso;
  #timer = 0;
  #timerDica = 0;

  /** @param {{som, abrirCaderno: () => void, aoVerDica: () => void}} deps */
  constructor(tela, deps) {
    Object.assign(this, deps);
    this.#fase = el("span");
    this.#caixa = el("span", { class: "valor-caixa" });
    this.#botaoCaderno = botao("Caderno (I)", () => this.abrirCaderno(), { "aria-keyshortcuts": "I" });
    this.#dica = painel({ class: "hud-dica", role: "note", hidden: true }, "Dica: aperte I para abrir o Caderno");
    this.#aviso = el("div", { class: "aviso", role: "status", hidden: true });
    this.#raiz = el("div", { class: "hud", hidden: true },
      painel({ class: "hud-fase" }, this.#fase),
      el("div", { class: "hud-direita" }, painel({ class: "hud-caixa" }, "Caixa: ", this.#caixa), this.#botaoCaderno), this.#dica);
    tela.append(this.#raiz, this.#aviso);
  }

  mostrar(visivel) {
    this.#raiz.hidden = !visivel;
    if (visivel) return;
    this.#aviso.hidden = true;
    this.#dica.hidden = true;
    clearTimeout(this.#timerDica);   // jogo parado: o relógio da dica recomeça no próximo jogo
    this.#timerDica = 0;
  }

  fase(titulo) {
    this.#fase.textContent = titulo;
  }

  /** Caixa atual, se o Caderno pode abrir agora e se a dica da tecla I aparece. */
  atualizar(estado, cadernoLiberado, dica) {
    this.#caixa.textContent = brl(estado.caixa);
    this.#botaoCaderno.disabled = !cadernoLiberado;
    this.#mostrarDica(Boolean(dica));
  }

  /** Dica da tecla I (fora da história): o relógio de 9 s começa quando ela aparece pela
   * 1ª vez e segue mesmo se ela sumir por um tempo (quiz, cozinha); no fim, avisa que
   * foi vista. Assim ela não volta na fase 6 de quem passa o jogo no modo Pular. */
  #mostrarDica(mostrar) {
    this.#dica.hidden = !mostrar;
    if (!mostrar || this.#timerDica) return;
    this.#timerDica = setTimeout(() => {
      this.#timerDica = 0;
      this.aoVerDica();
    }, DICA_MS);
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
