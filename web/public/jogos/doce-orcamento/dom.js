// Utilitários de DOM e de espera, sem dependências. Texto sempre por
// textContent (nunca innerHTML): o conteúdo vem de dados.

export const LARGURA = 1920;
export const ALTURA = 1080;

/** Cria um elemento: el("button", {class: "x", onclick}, "texto", filho). */
export function el(tag, props = {}, ...filhos) {
  const elemento = document.createElement(tag);
  Object.entries(props).forEach(([chave, valor]) => definir(elemento, chave, valor));
  elemento.append(...filhos.flat().filter((f) => f !== null && f !== undefined && f !== false));
  return elemento;
}

function definir(elemento, chave, valor) {
  if (valor === undefined || valor === null || valor === false) return;
  if (chave.startsWith("on")) elemento.addEventListener(chave.slice(2), valor);
  else if (chave === "style" && typeof valor === "object") Object.assign(elemento.style, valor);
  else if (chave === "dataset") Object.assign(elemento.dataset, valor);
  else elemento.setAttribute(chave, valor === true ? "" : valor);
}

export const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Anima com a Web Animations API e mantém o estado final (resolve ao terminar).
 * Com a aba escondida o navegador pausa animações: um relógio de reserva
 * garante que o jogo nunca fica preso esperando uma animação. */
export function animar(elemento, quadros, opcoes) {
  const animacao = elemento.animate(quadros, { fill: "forwards", ...opcoes });
  const reserva = esperar((opcoes.duration ?? 0) + 150);
  return Promise.race([animacao.finished, reserva]).then(() => {
    animacao.finish();
    animacao.commitStyles?.();
    animacao.cancel();
  }).catch(() => {});
}

/** Coordenadas do evento no espaço do jogo (1920x1080), seja qual for a escala. */
export function noJogo(evento, tela) {
  const caixa = tela.getBoundingClientRect();
  return { x: ((evento.clientX - caixa.left) * LARGURA) / caixa.width, y: ((evento.clientY - caixa.top) * ALTURA) / caixa.height };
}

export const img = (caminho) => "img/" + caminho + ".webp";

/** Carrega e decodifica a imagem antes de mostrar (sem piscar); erro não trava o jogo. */
export function carregarImagem(src) {
  const imagem = new Image();
  imagem.src = src;
  return imagem.decode().then(() => imagem, () => imagem);
}

export class Interrompido extends Error {}

/**
 * Esperas do jogo (fala, quiz, tela...): cada uma resolve com o que o jogador
 * fez. interromper() cancela todas (voltar ao menu, carregar um save): a
 * promessa rejeita com Interrompido e a limpeza da tela roda.
 */
export class Esperas {
  #pendentes = new Set();

  /** 'iniciar(resolver)' monta a interação e devolve a função de limpeza. */
  esperar(iniciar) {
    return new Promise((resolve, reject) => {
      const item = { reject, limpar: null };
      this.#pendentes.add(item);
      item.limpar = iniciar((valor) => {
        this.#pendentes.delete(item);
        item.limpar?.();
        resolve(valor);
      });
    });
  }

  interromper() {
    const pendentes = [...this.#pendentes];
    this.#pendentes.clear();
    pendentes.forEach((item) => {
      item.limpar?.();
      item.reject(new Interrompido());
    });
  }
}

/** Botão padrão do jogo (marrom, texto creme). */
export function botao(texto, aoClicar, props = {}) {
  return el("button", { type: "button", class: "botao", onclick: aoClicar, ...props }, texto);
}

/** Moldura do jogo: painel marrom com a folha creme dentro. */
export function painel(props, ...filhos) {
  return el("div", { ...props, class: "painel " + (props.class ?? "") }, el("div", { class: "folha" }, ...filhos));
}
