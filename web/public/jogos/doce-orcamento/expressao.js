// Avaliador das expressões do roteiro (content/SCHEMA.md): porte fiel de
// tools/motor.py (_eval). Sem eval e sem new Function: um tokenizador, um
// analisador descendente recursivo (mesma precedência do Python) que monta uma
// árvore pequena, e um avaliador que só conhece os nós do subconjunto
// permitido. Qualquer outra coisa (atributo, índice, lambda, /, **, função fora
// da lista, nome desconhecido) é erro, como no Python.

const PALAVRAS = new Set(["and", "or", "not", "if", "else", "True", "False", "None"]);
const CONSTANTES = new Map([["True", true], ["False", false], ["None", null]]);
const COMPARACOES = new Set(["==", "!=", "<", "<=", ">", ">="]);
// Números só inteiros (Python também recusa float: motor._constante).
const TOKEN = /\s*(?:(\d+)(?![\w.])|([A-Za-z_]\w*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|(\/\/|==|!=|<=|>=|[-+*%<>(),]))/y;

export class ErroExpressao extends Error {}

function erro(mensagem) {
  throw new ErroExpressao(mensagem);
}

// --- tokens ---------------------------------------------------------------

function textoLiteral(bruto) {
  const escapes = { n: "\n", t: "\t", "\\": "\\", "'": "'", '"': '"' };
  return bruto.slice(1, -1).replace(/\\(.)/g, (_, c) => escapes[c] ?? erro("escape não suportado: \\" + c));
}

function token(m) {
  if (m[1] !== undefined) return { tipo: "num", valor: Number(m[1]) };
  if (m[2] !== undefined) return { tipo: PALAVRAS.has(m[2]) ? "palavra" : "nome", valor: m[2] };
  if (m[3] !== undefined) return { tipo: "str", valor: textoLiteral(m[3]) };
  return { tipo: "op", valor: m[4] };
}

/** Lista de tokens; qualquer caractere fora do subconjunto é erro. */
export function tokens(texto) {
  const lista = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < texto.length) {
    if (/^\s*$/.test(texto.slice(TOKEN.lastIndex))) break;
    const inicio = TOKEN.lastIndex;
    const m = TOKEN.exec(texto);
    if (!m) erro("símbolo fora do subconjunto em: " + texto.slice(inicio, inicio + 12));
    lista.push(token(m));
  }
  return lista;
}

// --- análise (precedência do Python: if-else < or < and < not < comparação < + - < * // % < unário) ---

class Analisador {
  constructor(lista) {
    this.lista = lista;
    this.pos = 0;
  }

  olhar() {
    return this.lista[this.pos];
  }

  e(tipo, valor) {
    const t = this.olhar();
    return t !== undefined && t.tipo === tipo && t.valor === valor;
  }

  aceitar(tipo, valor) {
    if (!this.e(tipo, valor)) return false;
    this.pos += 1;
    return true;
  }

  exigir(tipo, valor) {
    if (!this.aceitar(tipo, valor)) erro("esperava '" + valor + "'");
  }

  expressao() {
    const corpo = this.ou();
    if (!this.aceitar("palavra", "if")) return corpo;
    const teste = this.ou();
    this.exigir("palavra", "else");
    return { t: "se", teste, corpo, senao: this.expressao() };
  }

  booleana(op, proximo) {
    const itens = [proximo()];
    while (this.aceitar("palavra", op)) itens.push(proximo());
    return itens.length === 1 ? itens[0] : { t: op, itens };
  }

  ou() {
    return this.booleana("or", () => this.conjuncao());
  }

  conjuncao() {
    return this.booleana("and", () => this.nao());
  }

  nao() {
    if (this.aceitar("palavra", "not")) return { t: "not", x: this.nao() };
    return this.comparacao();
  }

  comparacao() {
    const a = this.soma();
    const t = this.olhar();
    if (t === undefined || t.tipo !== "op" || !COMPARACOES.has(t.valor)) return a;
    this.pos += 1;
    const no = { t: "cmp", op: t.valor, a, b: this.soma() };
    const depois = this.olhar();
    if (depois !== undefined && depois.tipo === "op" && COMPARACOES.has(depois.valor)) erro("comparação encadeada");
    return no;
  }

  binaria(ops, proximo) {
    let a = proximo();
    for (let t = this.olhar(); t !== undefined && t.tipo === "op" && ops.has(t.valor); t = this.olhar()) {
      this.pos += 1;
      a = { t: "bin", op: t.valor, a, b: proximo() };
    }
    return a;
  }

  soma() {
    return this.binaria(new Set(["+", "-"]), () => this.termo());
  }

  termo() {
    return this.binaria(new Set(["*", "//", "%"]), () => this.unario());
  }

  unario() {
    if (this.aceitar("op", "-")) return { t: "neg", x: this.unario() };
    if (this.e("op", "+")) erro("+ unário fora do subconjunto");
    return this.primario();
  }

  argumentos() {
    const args = [];
    while (!this.aceitar("op", ")")) {
      args.push(this.expressao());
      if (!this.aceitar("op", ",")) {
        this.exigir("op", ")");
        break;
      }
    }
    return args;
  }

  primario() {
    const t = this.olhar();
    if (t === undefined) erro("expressão incompleta");
    this.pos += 1;
    if (t.tipo === "num" || t.tipo === "str") return { t: "const", v: t.valor };
    if (t.tipo === "palavra" && CONSTANTES.has(t.valor)) return { t: "const", v: CONSTANTES.get(t.valor) };
    if (t.tipo === "nome") return this.aceitar("op", "(") ? { t: "chamada", nome: t.valor, args: this.argumentos() } : { t: "nome", id: t.valor };
    if (t.tipo === "op" && t.valor === "(") {
      const dentro = this.expressao();
      this.exigir("op", ")");
      return dentro;
    }
    return erro("símbolo inesperado: " + t.valor);
  }
}

const CACHE = new Map();

/** Árvore da expressão (memorizada: o roteiro repete as mesmas contas). */
export function analisar(texto) {
  const chave = String(texto).trim();
  if (CACHE.has(chave)) return CACHE.get(chave);
  const a = new Analisador(tokens(chave));
  const arvore = a.expressao();
  if (a.pos !== a.lista.length) erro("sobrou texto na expressão: " + chave);
  CACHE.set(chave, arvore);
  return arvore;
}

// --- semântica do Python (int, bool, str, None) ---------------------------------

const ehNumero = (x) => typeof x === "number" || typeof x === "boolean";

function numero(x) {
  if (!ehNumero(x)) erro("operação com valor não numérico: " + pyStr(x));
  return Number(x);
}

/** str() do Python: True/False/None e inteiros. */
export function pyStr(x) {
  if (x === true) return "True";
  if (x === false) return "False";
  if (x === null || x === undefined) return "None";
  return String(x);
}

export const verdade = (x) => Boolean(x);  // 0, "", None e False são falsos (igual ao Python)

/** Divisão inteira e resto com o sinal do Python (arredonda para -infinito). */
export function divInteira(a, b) {
  if (numero(b) === 0) erro("divisão por zero");
  return Math.floor(numero(a) / numero(b));
}

function resto(a, b) {
  return numero(a) - numero(b) * divInteira(a, b);
}

function somar(a, b) {
  if (typeof a === "string" && typeof b === "string") return a + b;
  return numero(a) + numero(b);
}

const ARITMETICA = {
  "+": somar,
  "-": (a, b) => numero(a) - numero(b),
  "*": (a, b) => numero(a) * numero(b),
  "//": divInteira,
  "%": resto,
};

function igual(a, b) {
  if (ehNumero(a) && ehNumero(b)) return Number(a) === Number(b);
  return a === b;  // textos, None; tipos diferentes nunca são iguais
}

function menor(a, b) {
  if (ehNumero(a) && ehNumero(b)) return Number(a) < Number(b);
  if (typeof a === "string" && typeof b === "string") return a < b;
  return erro("comparação entre tipos diferentes");
}

export const COMPARA = {
  "==": igual,
  "!=": (a, b) => !igual(a, b),
  "<": menor,
  ">": (a, b) => menor(b, a),
  "<=": (a, b) => menor(a, b) || igual(a, b),
  ">=": (a, b) => menor(b, a) || igual(a, b),
};

// --- avaliação ----------------------------------------------------------------------

/**
 * Avalia a árvore. 'ctx' dá: valor(nome) -> valor ou undefined (nome que não
 * existe), funcao(nome) -> função permitida ou undefined.
 */
export function avaliarArvore(no, ctx) {
  const ev = (x) => avaliarArvore(x, ctx);
  switch (no.t) {
    case "const": return no.v;
    case "nome": return valorDoNome(no.id, ctx);
    case "bin": return ARITMETICA[no.op](ev(no.a), ev(no.b));
    case "neg": return -numero(ev(no.x));
    case "not": return !verdade(ev(no.x));
    case "and": return no.itens.every((x) => verdade(ev(x)));
    case "or": return no.itens.some((x) => verdade(ev(x)));
    case "cmp": return COMPARA[no.op](ev(no.a), ev(no.b));
    case "se": return verdade(ev(no.teste)) ? ev(no.corpo) : ev(no.senao);
    case "chamada": return chamar(no, ctx, ev);
    default: return erro("nó fora do subconjunto: " + no.t);
  }
}

function valorDoNome(id, ctx) {
  const valor = ctx.valor(id);
  if (valor === undefined) erro("nome desconhecido na expressão: " + id);
  return valor;
}

function chamar(no, ctx, ev) {
  const f = ctx.funcao(no.nome);
  if (f === undefined) erro("função não permitida na expressão: " + no.nome);
  return f(...no.args.map(ev));
}

/** Avalia o texto de uma expressão. */
export function avaliarTexto(texto, ctx) {
  return avaliarArvore(analisar(texto), ctx);
}

/** Erro se a quantidade de argumentos não for a esperada (como o TypeError do Python). */
export function aridade(f, minimo, maximo = minimo) {
  return (...args) => {
    if (args.length < minimo || args.length > maximo) erro("número de argumentos inválido");
    return f(...args);
  };
}

/** min/max do Python: devolve o próprio argumento (bool continua bool). */
export function extremo(maior) {
  return aridade((...args) => args.reduce((m, x) => ((maior ? menor(m, x) : menor(x, m)) ? x : m)), 2, Infinity);
}

export { numero };
