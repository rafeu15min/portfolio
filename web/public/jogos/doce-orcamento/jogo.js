// O jogo em andamento: percorre os nós do roteiro (web/data/conteudo.json) e
// executa cada tipo como o Ren'Py gerado (tools/gen_renpy.py): cena, quiz,
// escolha, minigame da cozinha, carrinho, ramo, final, telas e fim. As regras
// (estado, efeitos, condições) são as de roteiro.js/motor.js, as mesmas que o
// teste de equivalência compara com o Python.
import { Interrompido } from "./dom.js";
import { arrastarIngredientes, mexerPanela, misturarMassa } from "./cozinha.js";
import { mostrarTelaFinal } from "./finais.js";
import { Estado, montarQuiz } from "./motor.js";
import { montarCarrinho, perguntarQuiz } from "./paineis.js";
import * as roteiro from "./roteiro.js";

/** Linha da caixa de diálogo de uma fala (narração, ação em itálico ou personagem). */
function linhaDaFala(fala, personagens) {
  if (Object.hasOwn(fala, "narracao")) return { texto: fala.dito, tipo: "narracao" };
  if (Object.hasOwn(fala, "acao")) return { texto: fala.dito, tipo: "acao" };
  const pessoa = personagens[fala.quem];
  return { nome: pessoa.nome, cor: pessoa.cor, texto: fala.dito, tipo: "fala" };
}

const EXECUTORES = {
  async cena(j, no) {
    await j.cenario(no.fundo);
    if (no.vitrine?.length) j.vitrine.mostrar(no.vitrine, j.estado);
    else j.vitrine.ocultar();
    j.palco.abrir(no);
    j.avisar(roteiro.entrar(no, j.estado));
    await j.falas(no.falas);
    await j.aguardar(j.palco.fechar());
    return no.seguir;
  },

  /** Quiz: repete até acertar; 1º erro = dica (se houver), depois a explicação, na voz de quem perguntou. */
  async quiz(j, no) {
    if (no.vitrine?.length) j.vitrine.mostrar(no.vitrine, j.estado);
    j.bloquear(true);
    const montado = montarQuiz(j.estado, no);
    let resposta = await j.perguntar(no, montado);
    while (resposta !== montado.correta) {
      j.som.efeito("erro");
      j.estado.errou(no.id);
      const dica = j.estado.erros[no.id] === 1 && no.dica?.length;
      j.palco.abrir(no);
      await j.falas(dica ? no.dica : no.explicacao);
      await j.aguardar(j.palco.fechar());
      resposta = await j.perguntar(no, montado);
    }
    j.som.efeito("acerto");
    j.bloquear(false);
    j.vitrine.ocultar();
    return no.seguir;
  },

  async escolha(j, no) {
    const opcoes = roteiro.opcoesVisiveis(no, j.estado);
    const i = await j.escolher(no.pergunta, opcoes.map((o) => o.texto));
    const { seguir, avisos } = roteiro.escolher(opcoes[i], j.estado);
    j.avisar(avisos);
    return seguir;
  },

  /** Cozinha: abertura, arrastar, misturar fora do fogo, jeito de cozinhar e mexer no fogo. */
  async minigame(j, no) {
    await j.cenario(no.fundo);
    j.vitrine.ocultar();
    j.palco.abrir(no);
    await j.falas(no.falas);
    await j.aguardar(j.palco.fechar());
    j.bloquear(true);
    const cores = await j.painel(() => arrastarIngredientes(j.deps({ no })));
    await j.painel(() => misturarMassa(j.deps(), no.misturar, cores));
    const i = await j.escolher(no.pergunta, no.opcoes.map((o) => o.texto));
    j.avisar(roteiro.escolher(no.opcoes[i], j.estado).avisos);
    await j.painel(() => mexerPanela(j.deps(), no.opcoes[i].mexer));
    j.bloquear(false);
    return no.opcoes[0].seguir;
  },

  async carrinho(j, no) {
    j.vitrine.ocultar();
    j.bloquear(true);
    const ids = await j.painel(() => montarCarrinho(j.deps({ no })));
    j.avisar(roteiro.finalizarCarrinho(no, j.estado, ids));
    j.bloquear(false);
    return no.seguir;
  },

  ramo: async (j, no) => roteiro.desviar(no, j.estado),
  final: async (j, no) => roteiro.decidirFinal(no, j.estado, j.c.jogo.afinidade.personagens),

  async tela(j, no) {
    j.vitrine.ocultar();
    await j.painel(() => mostrarTelaFinal(no.tela, j.deps()));
    return no.seguir;
  },

  fim: async (j) => {
    j.hud.mostrar(false);
    return null;
  },
};

export class Jogo {
  #sessao = 0;

  /** deps: {c, assets, tela, palco, dialogo, hud, vitrine, som, saves, esperas, aoTerminar} */
  constructor(deps) {
    Object.assign(this, deps);
    this.porId = new Map(this.c.nos.map((no) => [no.id, no]));
    this.titulos = new Map(this.c.fases.map((f) => [f.id, f.titulo]));
    this.estado = null;
    this.ponto = null;
    this.bloqueio = false;
    this.rodando = false;
  }

  /** Caderno: só depois que a Cássia o entrega e fora de quiz/minigame/carrinho. */
  get cadernoLiberado() {
    return this.rodando && !this.bloqueio && this.estado.tem(this.c.jogo.caderno.liberado_por_flag);
  }

  novo() {
    return this.#iniciar(new Estado(this.c.jogo.afinidade.personagens, this.c.regras), this.c.jogo.inicio);
  }

  carregar(ponto) {
    if (!this.porId.has(ponto.no)) {  // save de uma versão do roteiro que não tem mais esse nó
      this.hud.mensagem("Este save é de uma versão antiga do jogo: começando do início.");
      return this.novo();
    }
    return this.#iniciar(Estado.deDados(ponto.estado, this.c.regras), ponto.no);
  }

  /** Para tudo na hora (voltar ao menu, carregar outro save). */
  parar() {
    this.#sessao += 1;
    this.esperas.interromper();
    this.palco.limpar();
    this.vitrine.ocultar();
    this.dialogo.ocultar();
    this.pular(false);
    this.rodando = false;
    this.bloqueio = false;
    this.hud.mostrar(false);
  }

  async #iniciar(estado, noId) {
    this.parar();
    this.estado = estado;
    this.dialogo.historico.length = 0;
    this.rodando = true;
    this.hud.mostrar(true);
    const sessao = this.#sessao;
    try {
      let id = noId;
      while (id) {
        const no = this.porId.get(id);
        this.#entrar(no);
        id = await EXECUTORES[no.tipo](this, no);
      }
    } catch (erro) {
      if (erro instanceof Interrompido) return;
      throw erro;
    }
    if (sessao !== this.#sessao) return;
    this.rodando = false;
    this.aoTerminar();
  }

  /** Começo de um nó: ponto de save (antes dos efeitos), HUD e música da cena. */
  #entrar(no) {
    const titulo = this.titulos.get(no.fase);
    this.ponto = { no: no.id, estado: this.estado.paraDados(), fase: titulo, fundo: no.fundo ?? this.palco.fundo };
    if (no.tipo !== "fim") this.saves.autosalvar(this.ponto);
    this.tela.dataset.no = no.id;
    this.hud.fase(titulo);
    this.atualizarHud();
    this.som.musica(no.musica);
  }

  /** Espera algo da tela; se o jogo foi parado nesse meio-tempo, interrompe o nó. */
  aguardar(promessa) {
    const sessao = this.#sessao;
    return promessa.then((valor) => {
      if (sessao !== this.#sessao) throw new Interrompido();
      return valor;
    });
  }

  /** Telas que tomam o lugar do diálogo (quiz, cozinha, carrinho, telas finais). */
  painel(abrir) {
    this.dialogo.ocultar();
    this.pular(false);
    return this.aguardar(abrir());
  }

  /** Escolha A/B (pergunta na caixa, opções no meio): para o modo pular. */
  escolher(pergunta, textos) {
    this.pular(false);
    return this.aguardar(this.dialogo.perguntar(pergunta, textos));
  }

  perguntar(no, montado) {
    return this.painel(() => perguntarQuiz(this.deps({ titulo: no.titulo, montado, comVitrine: this.vitrine.aberta })));
  }

  deps(extra = {}) {
    return { esperas: this.esperas, tela: this.tela, estado: this.estado, c: this.c, assets: this.assets, som: this.som, ...extra };
  }

  async cenario(fundo) {
    this.dialogo.ocultar();
    await this.aguardar(this.palco.cenario(fundo));
  }

  async falas(lista) {
    for (const fala of roteiro.falasVisiveis(lista, this.estado)) await this.#falar(fala);
  }

  /** Uma fala: encenação, linha de ação em itálico (rubrica, com a animação) e a fala. */
  async #falar(fala) {
    await this.aguardar(this.palco.antesDaFala(fala));
    if (fala.frase_acao) {
      this.palco.acao(fala);
      await this.aguardar(this.dialogo.dizer({ texto: fala.frase_acao, tipo: "acao" }));
    }
    await this.aguardar(this.dialogo.dizer(linhaDaFala(fala, this.c.personagens)));
  }

  avisar(avisos) {
    this.hud.avisar(avisos);
    this.atualizarHud();
  }

  bloquear(sim) {
    this.bloqueio = sim;
    this.atualizarHud();
  }

  atualizarHud() {
    this.hud.atualizar(this.estado, this.cadernoLiberado);
  }

  /** Modo pular: as falas passam sozinhas até a próxima escolha, quiz ou tela. */
  pular(ligar) {
    this.dialogo.pulando = ligar;
    this.palco.rapido = ligar;
    this.tela.dataset.pulando = ligar ? "sim" : "";
  }
}
