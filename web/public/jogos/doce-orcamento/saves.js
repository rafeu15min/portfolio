// Preferências e saves no localStorage do navegador. Num <iframe> de outro
// site ou em modo restrito o localStorage pode faltar: aí tudo fica só na
// memória (o jogo continua, só não lembra depois de fechar).

const PREFIXO = "doce-orcamento:";
const memoria = new Map();

function armazenamento() {
  try {
    const teste = PREFIXO + "teste";
    localStorage.setItem(teste, "1");
    localStorage.removeItem(teste);
    return localStorage;
  } catch {
    return { getItem: (k) => memoria.get(k) ?? null, setItem: (k, v) => memoria.set(k, String(v)), removeItem: (k) => memoria.delete(k) };
  }
}

const loja = armazenamento();

function ler(chave, padrao) {
  try {
    return JSON.parse(loja.getItem(PREFIXO + chave)) ?? padrao;
  } catch {
    return padrao;
  }
}

function gravar(chave, valor) {
  try {
    loja.setItem(PREFIXO + chave, JSON.stringify(valor));
  } catch (erro) {
    console.warn("não deu para salvar", chave, erro);
  }
}

// cps 38 = posição 20 do slider de velocidade (menu.js: 10 + 1,4 x posição).
const PADRAO = { musica: 0.8, efeitos: 0.8, mudo: false, cps: 38 };

/** Preferências (volumes, mudo, letras por segundo; 0 = texto instantâneo). */
export class Preferencias {
  constructor() {
    Object.assign(this, PADRAO, ler("preferencias", {}));
  }

  salvar() {
    gravar("preferencias", { musica: this.musica, efeitos: this.efeitos, mudo: this.mudo, cps: this.cps });
  }
}

export const SLOTS = 6;

/**
 * Saves: um ponto de jogo = {no, estado, fase, fundo, quando}, sempre no
 * começo de um nó (antes dos efeitos dele), como um label do Ren'Py.
 * 'auto' é gravado a cada nó; 1..SLOTS são os do jogador.
 */
export class Saves {
  ler(slot) {
    return ler("save:" + slot, null);
  }

  salvar(slot, ponto) {
    gravar("save:" + slot, { ...ponto, quando: Date.now() });
  }

  autosalvar(ponto) {
    this.salvar("auto", ponto);
  }

  todos() {
    return ["auto", ...Array.from({ length: SLOTS }, (_, i) => String(i + 1))].map((slot) => ({ slot, ponto: this.ler(slot) }));
  }

  /** O save mais recente (o 'Continuar' do menu), ou null. */
  maisRecente() {
    return this.todos().filter((s) => s.ponto).sort((a, b) => b.ponto.quando - a.ponto.quando)[0]?.ponto ?? null;
  }
}
