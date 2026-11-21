// Minigame da cozinha (nó tipo 'minigame', gancho 'cozinha'), como
// game/screens_cozinha.rpy; as regras vêm do nó (content/historia/02_cozinha.yaml).
// Etapa 1 (arrastar): só os itens da receita entram na panela (o ingrediente
//   tomba e some na massa, que ganha a cor dele: content/itens.yaml > cor); os
//   distratores voltam com a dica; o que sobra na bancada desliza e se
//   recentraliza (Despensa.reorganizar). Mouse, toque (pointer events) ou
//   teclado (Enter/Espaço no ingrediente o põe na panela).
// Etapas 2 e 3: com o BOTÃO DO PONTEIRO PRESSIONADO sobre a panela, o giro em
//   volta dela (anel ANEL) é o ato de mexer; sem apertar, nada conta. O que conta
//   é o ângulo girado (a velocidade manda): cada meia volta (pi) vale uma mexida.
//   Os botões "(sem girar o mouse)" dão uma mexida inteira (touchpad/acessibilidade).
// Etapa 2 (misturar, FORA do fogo): sem calor; qualquer sentido mistura (a massa
//   gira para o lado do gesto); 'meias_voltas' fecham a massa; as cores somem sob
//   'cor_final' (marrom).
// Etapa 3 (mexer, NO fogo): a barra de calor do protótipo. Qualquer sentido sobe
//   o calor ('passo' por meia volta); a panela esfria a cada 0,12 s; na zona verde
//   o doce avança; acima de 'queima' ele queima (perde progresso).
import { animar, botao, el, img, noJogo, painel } from "./dom.js";

const CENTRO = { x: 960, y: 650 };          // centro da panela nas etapas 2 e 3 (e do gesto)
const PANELA_ARRASTAR_Y = 640;
const ZOOM_PANELA = 0.95;
const ALVO = { x: 676, y: 420, largura: 570, altura: 440 };   // área de soltar na panela
const BANCADA = { centro: 900, passo: 270, y: 850 };          // Ren'Py: 900 + (k - (n-1)/2) * 270
const ANEL = { min: 40, max: 300 };                            // Mexida.r_min / r_max
const DESLIZAR_MS = 350;
const ARRASTO_MINIMO = 6;
const CENTRO_BOCA = { x: 288, y: 145 };   // centro da boca da panela na peça 577x430 (tools/assets.py > BOCA)
const ACHATA_MANCHA = 127 / 208;   // semieixos da boca da panela (tools/assets.py > BOCA): o plano do círculo vira elipse
const RAIO_CASSIA = { x: 110, y: 45 };   // elipse que a colher da Cássia percorre em volta do centro da panela
const ANGULO_MANCHA = 70;          // cada mancha entra girada 70° em relação à anterior

const imagemCozinha = (nome) => img("cozinha/" + nome);

/** O item do grupo que o jogador comprou (o 1º do grupo se nenhum). */
const comprado = (grupo, estado) => grupo.find((item) => (estado.itens[item] ?? 0) > 0) ?? grupo[0];

const rgb = (cor) => [1, 3, 5].map((k) => parseInt(cor.slice(k, k + 2), 16));
const corCss = ([r, g, b]) => `rgb(${r}, ${g}, ${b})`;

/** Casas da bancada para 'itens' (na ordem), centradas em x = 900 como no Ren'Py. */
export function casasDaBancada(itens) {
  const meio = (itens.length - 1) / 2;
  return new Map(itens.map((item, k) => [item, { x: BANCADA.centro + Math.trunc((k - meio) * BANCADA.passo), y: BANCADA.y }]));
}

// Máscaras brancas do pipeline (img/cozinha/mistura_*) tingidas UMA vez em <canvas>. Máscara CSS
// girando custa um repaint por quadro quando o navegador não tem aceleração por GPU (comum no
// Linux); um bitmap pronto não.
const mascaras = new Map();
function mascara(nome) {
  if (!mascaras.has(nome)) mascaras.set(nome, Object.assign(new Image(), { src: imagemCozinha(nome) }));
  return mascaras.get(nome);
}

/** Canvas w x h com a máscara 'nome' tingida de 'cor' ([r, g, b]); pinta quando a máscara chegar. */
function tingida(nome, cor, largura = 577, altura = 430) {
  const canvas = el("canvas", { width: largura, height: altura });
  const imagem = mascara(nome);
  const pintar = () => {
    const c = canvas.getContext("2d");
    c.drawImage(imagem, 0, 0, largura, altura);
    c.globalCompositeOperation = "source-in";
    c.fillStyle = corCss(cor);
    c.fillRect(0, 0, largura, altura);
  };
  if (imagem.complete && imagem.naturalWidth) pintar();
  else imagem.addEventListener("load", pintar, { once: true });
  return canvas;
}

/** Faixa de massa do k-ésimo ingrediente (0, 1, 2): img/cozinha/mistura_nivel_k (577x430: boca da
 * panela x elipse mais abaixo, que sobe a cada ingrediente; cada faixa é o nível menos o anterior). */
function poca(cor, k = 0) {
  const faixa = tingida(`mistura_nivel_${Math.min(k, 2) + 1}`, cor);
  faixa.className = "forma-nivel";
  return faixa;
}

/** Panela 577x430 (com espaço para a massa), centrada em (960, y) e um pouco menor. 'sobre'
 * põe camadas de massa por baixo da sombra interna da boca, que fica sempre por cima. */
function panelaComMassa(y) {
  const imagem = el("img", { src: imagemCozinha("panela_0"), alt: "Panela", draggable: "false" });
  const sombra = el("img", { class: "sombra-boca", src: imagemCozinha("mistura_sombra"), alt: "", draggable: "false" });
  const caixa = el("div", { class: "panela-caixa", style: { left: CENTRO.x + "px", top: y + "px",
    transform: `translate(-50%, -50%) scale(${ZOOM_PANELA})` } }, imagem, sombra);
  return { caixa, imagem, sobre: (...camadas) => sombra.before(...camadas) };
}

// --- etapa 1: arrastar ------------------------------------------------------------

class Bancada {
  constructor({ tela, no, estado, c, assets, som }, concluir) {
    Object.assign(this, { tela, no, c, assets, som, concluir });
    this.certos = no.receita.map((grupo) => comprado(grupo, estado));
    this.postos = [];
    this.recado = el("p", { class: "recado", role: "alert" });
    this.panela = panelaComMassa(PANELA_ARRASTAR_Y);
    const ordem = [...this.certos, ...no.distratores.map((grupo) => comprado(grupo, estado))];
    this.casas = casasDaBancada(ordem);
    this.pecas = new Map(ordem.map((item) => [item, this.#peca(item)]));   // o que ainda está na bancada, em ordem
    this.raiz = el("div", { class: "cozinha" }, this.panela.caixa,
      painel({ class: "cozinha-titulo" }, el("h2", {}, no.titulo), el("p", {}, no.descricao), this.recado), ...this.pecas.values());
    tela.append(this.raiz);
  }

  #peca(item) {
    const casa = this.casas.get(item);
    const peca = el("button", { type: "button", class: "ingrediente", id: "ing_" + item,
      "aria-label": this.c.itens[item].nome + ": arraste para a panela (ou Enter)", style: { left: casa.x + "px", top: casa.y + "px" } },
    el("img", { src: img(this.assets.itens[item]), alt: "", draggable: "false" }));
    peca.addEventListener("pointerdown", (e) => this.#pegar(e, item, peca));
    peca.addEventListener("click", () => {
      if (!peca.dataset.arrastou) this.soltar(item, peca, true);
      delete peca.dataset.arrastou;
    });
    return peca;
  }

  /** Arrasta com o ponteiro (mouse ou dedo) em coordenadas do jogo. Um arrasto por
   * peça: os ouvintes saem juntos no fim (AbortController), então um toque extra ou
   * um pointercancel nunca soltam a mesma peça duas vezes. */
  #pegar(evento, item, peca) {
    if (peca.dataset.pegando) return;
    peca.dataset.pegando = "1";
    delete peca.dataset.arrastou;
    peca.setPointerCapture(evento.pointerId);
    const inicio = noJogo(evento, this.tela);
    const casa = { x: parseFloat(peca.style.left), y: parseFloat(peca.style.top) };
    const fim = new AbortController();
    const mover = (e) => {
      const p = noJogo(e, this.tela);
      if (Math.hypot(p.x - inicio.x, p.y - inicio.y) > ARRASTO_MINIMO) peca.dataset.arrastou = "1";
      Object.assign(peca.style, { left: casa.x + p.x - inicio.x + "px", top: casa.y + p.y - inicio.y + "px" });
    };
    const largar = () => {
      fim.abort();
      delete peca.dataset.pegando;
      if (peca.dataset.arrastou) this.soltar(item, peca, this.#naPanela(peca));
    };
    peca.addEventListener("pointermove", mover, { signal: fim.signal });
    peca.addEventListener("pointerup", largar, { signal: fim.signal });
    peca.addEventListener("pointercancel", largar, { signal: fim.signal });
    peca.addEventListener("lostpointercapture", largar, { signal: fim.signal });
  }

  #naPanela(peca) {
    const x = parseFloat(peca.style.left) + peca.offsetWidth / 2;
    const y = parseFloat(peca.style.top) + peca.offsetHeight / 2;
    return x >= ALVO.x && x <= ALVO.x + ALVO.largura && y >= ALVO.y && y <= ALVO.y + ALVO.altura;
  }

  /** Soltou: fora da panela volta; distrator volta com a dica; da receita cai na panela
   * (uma vez só) e a bancada se reorganiza. */
  soltar(item, peca, naPanela) {
    if (!this.pecas.has(item) || this.postos.length === this.certos.length) return undefined;
    if (!naPanela) return this.#voltar(item, peca, 200);
    if (!this.certos.includes(item)) {
      this.recado.textContent = this.no.dica_errado;
      this.som.efeito("erro");
      return this.#voltar(item, peca, 250);
    }
    this.recado.textContent = "";
    const tinhaFoco = document.activeElement === peca;
    peca.remove();
    this.pecas.delete(item);
    this.#cair(item);
    this.#reorganizar();
    if (tinhaFoco) this.pecas.values().next().value?.focus({ preventScroll: true });   // teclado: segue na bancada
    if (this.postos.length === this.certos.length) setTimeout(() => this.concluir(), 1400);
    return undefined;
  }

  /** O ingrediente tomba na boca da panela e some; a poça da cor dele aparece. */
  #cair(item) {
    const k = this.postos.length;
    this.postos.push(item);
    const cor = rgb(this.c.itens[item].cor);
    const nova = poca(cor, k);
    this.panela.sobre(nova);   // cada ingrediente acrescenta a sua faixa (o nível sobe)
    animar(nova, [{ opacity: 0 }, { opacity: 1 }], { duration: 600 });
    const queda = el("img", { class: "queda", src: img(this.assets.itens[item]), alt: "" });
    this.raiz.append(queda);
    animar(queda, [
      { left: "960px", top: "380px", transform: "translate(-50%, -50%) rotate(0deg) scale(1)", opacity: 1, easing: "ease-out" },
      { offset: 0.43, left: "960px", top: "500px", transform: "translate(-50%, -50%) rotate(-35deg) scale(1)", opacity: 1, easing: "ease-in" },
      { left: "960px", top: "610px", transform: "translate(-50%, -50%) rotate(-70deg) scale(0.45)", opacity: 0 },
    ], { duration: 700 }).then(() => queda.remove());
  }

  /** Fecha a lacuna do ingrediente que entrou na panela: o que sobrou desliza para as
   * novas casas, recentralizado (Despensa.reorganizar no Ren'Py). A peça que está
   * sendo arrastada só ganha a casa nova (volta para ela se for solta fora). */
  #reorganizar() {
    this.casas = casasDaBancada([...this.pecas.keys()]);
    this.pecas.forEach((peca, item) => {
      if (!peca.dataset.pegando) this.#deslizar(peca, this.casas.get(item), DESLIZAR_MS, "ease-in-out");
    });
  }

  #voltar(item, peca, ms) {
    this.#deslizar(peca, this.casas.get(item), ms, "ease-out");
  }

  #deslizar(peca, casa, ms, easing) {
    const dx = parseFloat(peca.style.left) - casa.x, dy = parseFloat(peca.style.top) - casa.y;
    Object.assign(peca.style, { left: casa.x + "px", top: casa.y + "px" });
    animar(peca, [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }], { duration: ms, easing });   // transform: sem layout por quadro
  }
}

/** Etapa 1: resolve com as cores da receita quando ela está toda na panela. */
export function arrastarIngredientes(deps) {
  return deps.esperas.esperar((resolver) => {
    const bancada = new Bancada(deps, () => resolver(bancada.certos.map((item) => rgb(deps.c.itens[item].cor))));
    return () => bancada.raiz.remove();
  });
}

// --- regras das etapas 2 e 3 e o gesto (estado puro, sem tela: o teste usa) ---------------

const dentroDoAnel = (x, y) => {
  const raio = Math.hypot(x - CENTRO.x, y - CENTRO.y);
  return raio >= ANEL.min && raio <= ANEL.max;
};

/**
 * Gesto de mexer (Mexida.event no Ren'Py): o botão precisa ser PRESSIONADO sobre a
 * panela (no anel em volta do centro); enquanto ele fica apertado, cada movimento
 * dentro do anel devolve o ângulo girado. Sem apertar, ou fora do anel, nada conta.
 */
export class Gesto {
  #apertado = false;
  #angulo = null;

  /** Botão pressionado em (x, y): só vale sobre a panela. Devolve se passou a valer. */
  pressionar(x, y) {
    this.#apertado = dentroDoAnel(x, y);
    this.#angulo = null;
    return this.#apertado;
  }

  soltar() {
    this.#apertado = false;
    this.#angulo = null;
  }

  /** Radianos girados desde o ponto anterior (+ = sentido do relógio na tela), ou 0. */
  mover(x, y) {
    if (!this.#apertado || !dentroDoAnel(x, y)) {
      this.#angulo = null;
      return 0;
    }
    const angulo = Math.atan2(y - CENTRO.y, x - CENTRO.x);
    const anterior = this.#angulo;
    this.#angulo = angulo;
    if (anterior === null) return 0;
    // Menor caminho, com sinal: o +3pi deixa o resto positivo, como o % do Python.
    return ((angulo - anterior + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  }
}

/** Etapa 3, no fogo: regras da barra de calor (do protótipo HTML), como Mexida no Ren'Py. */
export class Mexida {
  constructor(regras) {
    Object.assign(this, { regras, temp: 50, progresso: 0, mexidas: 0, acumulado: 0, pronto: false, queimando: false, bolhas: [] });
  }

  /** Giro do ponteiro (radianos): cada meia volta vale uma mexida, na proporção do que
   * foi girado; girar mais rápido esquenta mais rápido. Qualquer sentido mexe. */
  avanco(delta) {
    const fracao = Math.abs(delta) / Math.PI;
    this.mexerPor(fracao);
    this.acumulado += fracao;
    if (this.acumulado < 1) return;
    this.acumulado -= 1;
    this.mexidas += 1;
    this.soltarBolhas();
  }

  /** Uma mexida inteira (o botão da tela, para quem não gira o mouse). */
  mexer() {
    this.mexerPor(1);
    this.mexidas += 1;
    this.soltarBolhas();
  }

  /** No fogo: o calor sobe 'passo' x fração de meia volta. */
  mexerPor(fracao) {
    if (this.pronto) return;
    this.temp = Math.min(100, this.temp + this.regras.passo * fracao);
  }

  soltarBolhas() {
    [0, 1, 2].forEach((i) => this.bolhas.push({ x: CENTRO.x + (i - 1) * 70, y: CENTRO.y - 40 + i * 12, vida: 1 }));
  }

  /** A cada 0,12 s: esfria, avança (zona verde) ou queima (acima do limite). */
  tique() {
    if (this.pronto) return;
    const r = this.regras;
    const [baixo, alto] = r.zona;
    this.temp = Math.max(0, this.temp - r.esfria);
    this.queimando = Boolean(r.queima) && this.temp > r.queima;
    if (this.queimando) this.progresso = Math.max(0, this.progresso - 5);
    else if (this.temp >= baixo && this.temp <= alto) this.progresso = Math.min(100, this.progresso + r.ganho);
    this.bolhas = this.bolhas.filter((b) => b.vida > 0.1).map((b) => ({ x: b.x, y: b.y - 9, vida: b.vida - 0.06 }));
    this.pronto = this.progresso >= 100;
  }

  /** Panela pelo progresso: mistura, engrossa, no ponto. */
  imagem() {
    if (this.pronto) return "panela_6";
    return "panela_" + (this.progresso < 34 ? 3 : this.progresso < 67 ? 4 : 5);
  }
}

/** Etapa 2, fora do fogo (Misturada no Ren'Py): sem calor nem queima; mexer em
 * QUALQUER sentido (horário ou anti-horário) mistura; 'meias_voltas' meias-voltas
 * fecham a massa. A massa gira na tela para o lado do gesto. */
export class Misturada extends Mexida {
  constructor(regras) {
    super(regras);
    this.anguloVisual = 0;   // giro da massa na tela (suavizado), em graus
    this.giro = 0;           // alvo do giro: graus girados com sinal (+ = horário)
    this.sentido = 1;        // lado do último gesto (o botão segue o mesmo lado)
  }

  /** Qualquer sentido mistura; guarda o lado para a massa girar junto. */
  avanco(delta) {
    if (delta) this.sentido = Math.sign(delta);
    super.avanco(delta);
  }

  /** Fora do fogo: a massa avança em proporção ao que foi girado, e o giro na tela
   * acompanha o avanço (180 graus por meia volta), no lado do gesto. */
  mexerPor(fracao) {
    if (this.pronto) return;
    const meias = this.regras.meias_voltas;
    const ganho = Math.min(100 - this.progresso, (100 / meias) * fracao);
    this.progresso += ganho;
    this.giro += (this.sentido * ganho * meias * 180) / 100;
  }

  /** A cada 0,05 s: a massa gira até o alvo; pronta quando tudo chegou. */
  tique() {
    this.anguloVisual += (this.giro - this.anguloVisual) * 0.25;
    this.bolhas = this.bolhas.filter((b) => b.vida > 0.1).map((b) => ({ x: b.x, y: b.y - 5, vida: b.vida - 0.05 }));
    this.pronto = this.progresso >= 100 && Math.abs(this.giro - this.anguloVisual) < 2;
  }
}

// --- etapas 2 e 3: tela com colher, bolhas, barra e botão ---------------------------------

function barra(rotulo) {
  return el("div", { class: "barra barra-progresso", role: "meter", "aria-label": rotulo, "aria-valuemin": 0, "aria-valuemax": 100 },
    el("div", { class: "barra-cheia" }));
}

function medir(elemento, valor) {
  elemento.firstChild.style.width = valor + "%";
  elemento.setAttribute("aria-valuenow", Math.round(valor));
}

/**
 * Uma etapa de panela (misturar ou mexer): colher no ponteiro, gesto com o botão
 * pressionado, bolhas, texto de alerta e o botão; 'visual' desenha o que é próprio da etapa.
 */
class Etapa {
  constructor({ tela, som }, { regra, tiqueMs, botaoTexto, botaoId, titulo, descricao, pronto, esperaFim, visual, automatico = false }, concluir) {
    Object.assign(this, { tela, som, regra, visual, pronto, concluir, esperaFim, automatico });
    this.passoCassia = 0;   // ângulo da colher da Cássia (radianos)
    this.gesto = new Gesto();
    this.colher = el("img", { class: "colher", src: imagemCozinha("colher_1"), alt: "", hidden: true });
    this.bolhas = el("div", { class: "bolhas" });
    this.alerta = el("p", { class: "alerta-cozinha", role: "status" });
    this.raiz = el("div", { class: "cozinha mexendo" }, visual.cena, this.bolhas,
      painel({ class: "cozinha-painel" }, el("h2", {}, titulo), el("p", {}, descricao), ...visual.painel), this.alerta,
      botao(botaoTexto, () => this.mexer(), { class: "botao botao-mexer", id: botaoId, hidden: automatico }), this.colher);
    this.raiz.addEventListener("pointerdown", (e) => this.#pressionar(e));
    this.raiz.addEventListener("pointermove", (e) => this.#mover(e));
    ["pointerup", "pointercancel", "lostpointercapture"].forEach((tipo) => this.raiz.addEventListener(tipo, () => this.#soltar()));
    tela.append(this.raiz);
    this.timer = setInterval(() => this.#tique(), tiqueMs);
    this.desenhar();
  }

  mexer() {
    this.regra.mexer();
    this.desenhar();
  }

  /** Botão principal pressionado sobre a panela: o gesto passa a valer (e o ponteiro
   * fica preso à tela até soltar, mesmo saindo dela). Nos botões, nada. */
  #pressionar(evento) {
    if (this.automatico || evento.button !== 0 || evento.target.closest("button")) return;
    const p = this.#colherEm(evento);
    const vale = this.gesto.pressionar(p.x, p.y);
    this.raiz.dataset.apertado = String(vale);
    if (vale) this.raiz.setPointerCapture(evento.pointerId);
  }

  #soltar() {
    this.gesto.soltar();
    this.raiz.dataset.apertado = "false";
  }

  /** Cada ponto do movimento (também os agrupados pelo navegador) gira a massa. */
  #mover(evento) {
    if (this.automatico) return;
    const agrupados = evento.getCoalescedEvents?.() ?? [];
    const pontos = (agrupados.length ? agrupados : [evento]).map((e) => noJogo(e, this.tela));
    this.#colherEm(evento);
    const giros = pontos.map((p) => this.gesto.mover(p.x, p.y)).filter((delta) => delta !== 0);
    if (!giros.length) return;
    giros.forEach((delta) => this.regra.avanco(delta));
    this.#agendar();
  }

  /** A colher segue o ponteiro (concha na ponta). Devolve o ponto no jogo. */
  #colherEm(evento) {
    const p = noJogo(evento, this.tela);
    this.colher.hidden = false;
    Object.assign(this.colher.style, { left: p.x - 46 + "px", top: p.y - 256 + "px" });
    return p;
  }

  /** A Cássia mexe: a colher dá uma volta em elipse e cada tique gira o suficiente para o calor
   * ficar parado na zona (compensa o que a panela esfria): demora mais, mas não queima. */
  #cassiaMexe() {
    const r = this.regra.regras;
    const passo = (Math.PI * r.esfria) / r.passo;
    this.passoCassia = (this.passoCassia + passo) % (2 * Math.PI);
    const p = { x: CENTRO.x + RAIO_CASSIA.x * Math.cos(this.passoCassia), y: CENTRO.y + RAIO_CASSIA.y * Math.sin(this.passoCassia) };
    this.colher.hidden = false;
    Object.assign(this.colher.style, { left: p.x - 46 + "px", top: p.y - 256 + "px" });
    this.regra.avanco(passo);
  }

  #tique() {
    if (this.automatico && !this.regra.pronto) this.#cassiaMexe();
    this.regra.tique();
    this.desenhar();
    if (!this.regra.pronto) return;
    clearInterval(this.timer);
    setTimeout(() => this.concluir(), this.esperaFim);
  }

  /** Reaproveita os <img> das bolhas (criar e jogar fora uma dezena por quadro pesa sem GPU). */
  #sincronizarBolhas(lista) {
    while (this.bolhas.children.length < lista.length) this.bolhas.append(el("img", { src: imagemCozinha("bolha"), alt: "" }));
    while (this.bolhas.children.length > lista.length) this.bolhas.lastChild.remove();
    lista.forEach((b, i) => { this.bolhas.children[i].style.transform = `translate(${b.x}px, ${b.y}px)`; });
  }

  /** Vários movimentos do mouse no mesmo quadro desenham uma vez só. */
  #agendar() {
    if (this.pendente) return;
    this.pendente = true;
    requestAnimationFrame(() => {
      this.pendente = false;
      this.desenhar();
    });
  }

  desenhar() {
    const r = this.regra;
    this.visual.desenhar(r);
    this.alerta.textContent = r.pronto ? this.pronto : r.queimando ? "Cuidado! Está queimando!" : "";
    this.alerta.dataset.tipo = r.pronto ? "pronto" : "queima";
    this.#sincronizarBolhas(r.bolhas);
    Object.assign(this.raiz.dataset, { progresso: Math.round(r.progresso), calor: Math.round(r.temp), mexidas: r.mexidas });
  }

  fechar() {
    clearInterval(this.timer);
    this.raiz.remove();
  }
}

function rodarEtapa(deps, opcoes) {
  return deps.esperas.esperar((resolver) => {
    const etapa = new Etapa(deps, opcoes, () => resolver());
    return () => etapa.fechar();
  });
}

/** Visual da mistura (doce_mistura_giro), num <canvas> só: as faixas de massa como ficaram na etapa
 * anterior, as manchas dos outros ingredientes girando por cima e, por fim, a cor final do
 * brigadeiro com o progresso; tudo recortado na massa inteira (mistura_massa). */
function visualMistura(cores, corFinal) {
  const { caixa, sobre } = panelaComMassa(CENTRO.y);
  const massa = el("canvas", { class: "forma-nivel", width: 577, height: 430 });
  const c = massa.getContext("2d");
  const faixas = cores.map((cor, k) => tingida(`mistura_nivel_${Math.min(k, 2) + 1}`, cor));
  const manchas = cores.slice(1).map((cor, j) => tingida(`mistura_mancha_${Math.min(j + 1, 2)}`, cor, 420, 420));
  const recorte = mascara("mistura_massa");
  const final = corCss(rgb(corFinal));
  sobre(massa);
  const texto = el("p");
  const consistencia = barra("Consistência da massa");
  /** Um quadro da massa: faixas, manchas giradas (no plano do círculo, achatadas na perspectiva) e cor final. */
  const pintar = (m) => {
    const p = m.progresso / 100;
    c.clearRect(0, 0, 577, 430);
    faixas.forEach((faixa) => c.drawImage(faixa, 0, 0));
    manchas.forEach((mancha, j) => {
      c.save();
      c.globalAlpha = 1 - 0.9 * p;
      c.translate(CENTRO_BOCA.x, CENTRO_BOCA.y);
      c.scale(1, ACHATA_MANCHA);
      c.rotate(((m.anguloVisual + ANGULO_MANCHA * (j + 1)) * Math.PI) / 180);
      c.drawImage(mancha, -210, -210);
      c.restore();
    });
    c.globalAlpha = p;
    c.fillStyle = final;
    c.fillRect(0, 0, 577, 430);
    c.globalAlpha = 1;
    c.globalCompositeOperation = "destination-in";
    if (recorte.complete) c.drawImage(recorte, 0, 0, 577, 430);
    c.globalCompositeOperation = "source-over";
  };
  const desenhar = (m) => {
    pintar(m);
    texto.textContent = `Consistência da massa: ${Math.round(m.progresso)}%`;
    medir(consistencia, m.progresso);
  };
  return { cena: caixa, painel: [texto, consistencia], desenhar };
}

/** Etapa 2: misturar fora do fogo. 'cores' = cor de cada ingrediente da receita. */
export function misturarMassa(deps, misturar, cores) {
  return rodarEtapa(deps, { regra: new Misturada(misturar), tiqueMs: 50, botaoTexto: "MISTURAR (sem girar o mouse)", botaoId: "misturar_botao",
    titulo: "Misture a massa!", descricao: misturar.descricao, pronto: "Massa uniforme!", esperaFim: 1000,
    visual: visualMistura(cores, misturar.cor_final) });
}

/** Visual do fogo: panela pelo progresso, barra de calor (zona verde e de queima) e progresso. */
function visualFogo(regras) {
  const panela = el("img", { class: "panela", src: imagemCozinha("panela_3"), alt: "Panela", draggable: "false",
    style: { left: CENTRO.x + "px", top: CENTRO.y + "px", transform: `translate(-50%, -50%) scale(${ZOOM_PANELA})` } });
  const faixa = (de, ate, classe) => el("div", { class: classe, style: { left: de + "%", width: ate - de + "%" } });
  const marcador = el("div", { class: "marcador" });
  const calor = el("div", { class: "barra-calor", role: "meter", "aria-label": "Calor da panela", "aria-valuemin": 0, "aria-valuemax": 100 },
    faixa(regras.zona[0], regras.zona[1], "zona-verde"), regras.queima ? faixa(regras.queima, 100, "zona-queima") : null, marcador);
  const textoCalor = el("p");
  const textoProgresso = el("p");
  const progresso = barra("Progresso do doce");
  const desenhar = (m) => {
    const nome = m.imagem();
    if (panela.dataset.nome !== nome) {   // só troca a imagem quando a etapa da panela muda
      panela.dataset.nome = nome;
      panela.src = imagemCozinha(nome);
    }
    textoCalor.textContent = `Calor da panela: ${Math.round(m.temp)}%`;
    marcador.style.left = m.temp + "%";
    calor.setAttribute("aria-valuenow", Math.round(m.temp));
    textoProgresso.textContent = `Progresso do doce: ${Math.round(m.progresso)}%`;
    medir(progresso, m.progresso);
  };
  return { cena: panela, painel: [textoCalor, calor, textoProgresso, progresso], desenhar };
}

/** Etapa 3: mexer no fogo até o ponto. */
export function mexerPanela(deps, regras) {
  const automatico = Boolean(regras.automatico);
  return rodarEtapa(deps, { regra: new Mexida(regras), tiqueMs: 120, botaoTexto: "MEXER (sem girar o mouse)", botaoId: "mexer_botao",
    titulo: "Ponto do Brigadeiro!", automatico,
    descricao: automatico ? "A Cássia mexe a panela devagar e com carinho. Espere a massa chegar ao ponto."
      : "Segure o botão do mouse sobre a panela e gire: quanto mais rápido, mais esquenta. Mantenha o calor na zona verde.",
    pronto: "Ponto perfeito!", esperaFim: 1200, visual: visualFogo(regras) });
}
