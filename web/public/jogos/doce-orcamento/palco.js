// Palco: cenário (fundo com dissolve) e personagens em cena, com a mesma
// encenação do Ren'Py gerado (tools/gen_renpy.py, classe Palco; transforms
// palco_entra/ato_* de game/screens_doce.rpy):
// - com 'palco' no nó, os personagens ficam fixos lado a lado e cada fala só
//   troca a expressão; 'sai', 'entra' e 'mover' mexem neles;
// - sem 'palco' (modo foco), aparece só quem fala; a narração o retira;
// - a primeira aparição entra animada; ao fim do nó todos saem (dissolve);
// - a rubrica anima o ator (pula, balança, treme, salta, aproxima).
import { animar, carregarImagem, el, esperar, img, LARGURA } from "./dom.js";

const REPOUSO = { x: 0, y: 0, s: 1, o: 1 };
// Passos [segundos, valores, curva] (curvas do Ren'Py: easein = desacelera =
// CSS ease-out; easeout = acelera = CSS ease-in; ease = ease-in-out).
const ANIMACOES = {
  entra: [[0, { o: 0, y: 70 }], [0.35, { o: 1, y: 0 }, "ease-out"]],
  pula: [[0.12, REPOUSO], [0.14, { y: -34 }, "ease-in"], [0.14, { y: 0 }, "ease-out"], [0.12, { y: -18 }, "ease-in"], [0.12, { y: 0 }, "ease-out"]],
  balanca: [[0.12, REPOUSO], [0.1, { x: -16 }, "ease-in-out"], [0.1, { x: 16 }, "ease-in-out"], [0.1, { x: -10 }, "ease-in-out"], [0.1, { x: 0 }, "ease-in-out"]],
  treme: [[0.12, REPOUSO], ...[-9, 9, -9, 9, 0].map((x) => [0.05, { x }, "ease-in-out"])],
  salta: [[0, { y: 160, o: 0 }], [0.22, { y: -40, o: 1 }, "ease-in"], [0.18, { y: 0 }, "ease-out"]],
  aproxima: [[0.12, REPOUSO], [0.2, { s: 1.06 }, "ease-in-out"], [0.15, { s: 1.06 }], [0.2, { s: 1 }, "ease-in-out"]],
};
const DISSOLVE = 250;
const DISSOLVE_CENA = 500;
const ANDAR = 700;

/** Quadros da Web Animations API a partir dos passos (valores herdam do anterior). */
function quadros(passos) {
  const total = passos.reduce((soma, [d]) => soma + d, 0) || 1;
  let tempo = 0;
  let valores = { ...REPOUSO };
  const lista = passos.map(([duracao, mudanca]) => {
    tempo += duracao;
    valores = { ...valores, ...mudanca };
    return { offset: tempo / total, transform: `translate(${valores.x}px, ${valores.y}px) scale(${valores.s})`, opacity: valores.o };
  });
  passos.forEach(([, , curva], i) => {
    if (i > 0 && curva) lista[i - 1].easing = curva;
  });
  return { lista, total };
}

export class Palco {
  #atores = new Map();   // chave (id do fixo ou "foco") -> {caixa, imagem, pid, expressao, x}
  #fixos = [];
  #xFoco = 0.5;
  #fundo = null;

  constructor(cenario, camada, conteudo, assets) {
    this.cenario_ = cenario;
    this.camada = camada;
    this.personagens = conteudo.personagens;
    this.posicoes = conteudo.web.posicoes_palco;
    this.assets = assets;
    this.rapido = false;   // modo pular: sem esperar as animações
  }

  #ms(ms) {
    return this.rapido ? 1 : ms;
  }

  /** Troca o cenário com dissolve (mesmo fundo: nada muda). */
  async cenario(fundoId) {
    if (fundoId === this.#fundo) return;
    this.#fundo = fundoId;
    const nova = await carregarImagem(this.assets.fundos[fundoId].web);
    nova.className = "fundo";
    nova.alt = "";
    const antigas = [...this.cenario_.children];
    this.cenario_.append(nova);
    await animar(nova, [{ opacity: 0 }, { opacity: 1 }], { duration: this.#ms(DISSOLVE_CENA) });
    antigas.forEach((velha) => velha.remove());
  }

  get fundo() {
    return this.#fundo;
  }

  /** Começo do nó: fixa quem está no 'palco' (entrando) e onde fica o foco. */
  abrir(no) {
    this.#fixos = no.palco ?? [];
    this.#xFoco = no.vitrine?.length ? 0.72 : 0.5;
    const posicoes = this.posicoes[this.#fixos.length] ?? [];
    this.#fixos.forEach((pid, i) => this.#mostrar(pid, pid, this.personagens[pid].expressao_padrao, posicoes[i], "entra"));
  }

  /** Fim do nó: todos saem de cena (dissolve). */
  async fechar() {
    const chaves = [...this.#atores.keys()];
    await Promise.all(chaves.map((chave) => this.#retirar(chave)));
  }

  /** Tira tudo na hora (menu, carregar save). */
  limpar() {
    this.#atores.forEach((ator) => ator.caixa.remove());
    this.#atores.clear();
    this.cenario_.replaceChildren();
    this.#fundo = null;
  }

  /** Antes de cada fala: 'sai'/'entra'/'mover' e quem fala aparece (ou a narração tira o foco). */
  async antesDaFala(fala) {
    await this.#encenar(fala);
    const pessoa = this.personagens[fala.quem];
    if (!pessoa) return this.#fixos.length ? undefined : this.#retirar("foco");
    if (!pessoa.sprite) return this.#fixos.length ? undefined : this.#retirar("foco");
    const expressao = fala.expressao ?? pessoa.expressao_padrao;
    if (this.#fixos.includes(pessoa.id)) return this.#trocarExpressao(pessoa.id, expressao);
    const foco = this.#atores.get("foco");
    if (foco?.pid === pessoa.id && foco.expressao === expressao) return undefined;
    if (foco) return this.#trocarImagem(foco, pessoa.id, expressao);
    return this.#mostrar("foco", pessoa.id, expressao, this.#xFoco, "entra");
  }

  /** A rubrica anima o ator (se ele tem sprite); não bloqueia a linha de ação. */
  acao(fala) {
    const pessoa = this.personagens[fala.quem];
    if (!fala.anim || !pessoa?.sprite) return;
    const chave = this.#fixos.includes(pessoa.id) ? pessoa.id : "foco";
    const expressao = fala.expressao ?? pessoa.expressao_padrao;
    const ator = this.#atores.get(chave) ?? this.#mostrar(chave, pessoa.id, expressao, this.#xFoco, null);
    this.#trocarImagem(ator, pessoa.id, expressao);
    this.#tocar(ator, fala.anim);
  }

  async #encenar(fala) {
    const saindo = (fala.sai ?? []).map((pid) => this.#retirar(pid));
    Object.entries(fala.entra ?? {}).forEach(([pid, x]) => this.#mostrar(pid, pid, this.personagens[pid].expressao_padrao, x, "entra"));
    Object.entries(fala.mover ?? {}).forEach(([pid, x]) => this.#andar(pid, x));
    await Promise.all(saindo);
  }

  #mostrar(chave, pid, expressao, x, animacao) {
    this.#atores.get(chave)?.caixa.remove();
    const imagem = el("img", { class: "ator-imagem", alt: this.personagens[pid].nome, src: img(this.assets.personagens[pid + " " + expressao]) });
    const caixa = el("div", { class: "ator" }, imagem);
    const ator = { caixa, imagem, pid, expressao, x };
    this.#posicionar(ator, x);
    this.camada.append(caixa);
    this.#atores.set(chave, ator);
    if (animacao) this.#tocar(ator, animacao);
    return ator;
  }

  #posicionar(ator, x) {
    ator.x = x;
    Object.assign(ator.caixa.style, { left: x * LARGURA + "px", transform: `translateX(${-x * 100}%)` });
    ator.imagem.style.transformOrigin = `${x * 100}% 100%`;
  }

  #tocar(ator, nome) {
    const { lista, total } = quadros(ANIMACOES[nome]);
    ator.imagem.getAnimations().forEach((a) => a.cancel());
    if (this.rapido) return;
    animar(ator.imagem, lista, { duration: total * 1000 });
  }

  #andar(pid, x) {
    const ator = this.#atores.get(pid);
    if (!ator) return;
    const de = { left: ator.x * LARGURA + "px", transform: `translateX(${-ator.x * 100}%)` };
    this.#posicionar(ator, x);
    const para = { left: x * LARGURA + "px", transform: `translateX(${-x * 100}%)` };
    animar(ator.caixa, [de, para], { duration: this.#ms(ANDAR), easing: "ease-in-out" });
  }

  #trocarExpressao(pid, expressao) {
    const ator = this.#atores.get(pid);
    if (!ator) return this.#mostrar(pid, pid, expressao, this.#xFoco, "entra");
    return this.#trocarImagem(ator, pid, expressao);
  }

  /** Troca a imagem do ator sem animação (show da mesma tag no Ren'Py). */
  #trocarImagem(ator, pid, expressao) {
    if (ator.pid === pid && ator.expressao === expressao) return;
    Object.assign(ator, { pid, expressao });
    ator.imagem.src = img(this.assets.personagens[pid + " " + expressao]);
    ator.imagem.alt = this.personagens[pid].nome;
  }

  async #retirar(chave) {
    const ator = this.#atores.get(chave);
    if (!ator) return;
    this.#atores.delete(chave);
    await animar(ator.caixa, [{ opacity: 1 }, { opacity: 0 }], { duration: this.#ms(DISSOLVE) });
    ator.caixa.remove();
  }

  /** Espera curta que respeita o modo pular. */
  pausa(ms) {
    return esperar(this.#ms(ms));
  }
}
