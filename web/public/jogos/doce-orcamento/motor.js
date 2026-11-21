// Regras do Doce Orçamento: caixa, extrato, itens, afinidade, quiz e final.
// Porte fiel de tools/motor.py (a fonte das regras); o teste
// web/test/equivalencia.test.mjs prova que os dois dão o mesmo resultado em
// todos os caminhos do roteiro. Dinheiro sempre em centavos (inteiros).
// Os nomes dos campos do estado são os do Python (vão no save e na referência).

import { aridade, avaliarTexto, divInteira, ErroExpressao, extremo, numero, pyStr, verdade } from "./expressao.js";

const proprio = (obj, chave) => (obj != null && Object.hasOwn(obj, chave) ? obj[chave] : undefined);
const obter = (obj, chave, padrao) => proprio(obj, chave) ?? padrao;

function falha(mensagem) {
  throw new Error(mensagem);
}

// --- dinheiro -----------------------------------------------------------------

/** round() do Python: metade vai para o par (12,5 -> 12; 13,5 -> 14). */
function arredondarPar(x) {
  const r = Math.round(x);
  return Math.abs(x % 1) === 0.5 && r % 2 !== 0 ? r - 1 : r;
}

/** Reais (número do YAML, ex.: 1.5) em centavos inteiros. */
export function centavos(valor) {
  const x = Number(valor) * 100;
  if (!Number.isFinite(x)) falha("valor em reais inválido: " + valor);
  return arredondarPar(x);
}

/** Centavos no padrão brasileiro: 123456 -> 'R$ 1.234,56'. */
export function brl(valorCentavos) {
  const v = numero(valorCentavos);
  const absoluto = Math.abs(v);
  const reais = String(Math.floor(absoluto / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return (v < 0 ? "-" : "") + "R$ " + reais + "," + String(absoluto % 100).padStart(2, "0");
}

/** Centavos sem o símbolo: 3000 -> '30', 1250 -> '12,50' (divmod do Python). */
export function reais(valorCentavos) {
  const inteiro = divInteira(valorCentavos, 100);
  const resto = numero(valorCentavos) - inteiro * 100;
  return resto ? inteiro + "," + String(resto).padStart(2, "0") : String(inteiro);
}

/** Divisão inteira arredondada para cima na metade (87,5 -> 88). b=0 -> 0. */
export function dividir(a, b) {
  if (!verdade(b)) return 0;
  return divInteira(2 * numero(a) + numero(b), 2 * numero(b));
}

export const pct = (valor, taxa) => dividir(numero(valor) * numero(taxa), 100);

const FUNCOES = new Map([
  ["min", extremo(false)], ["max", extremo(true)], ["abs", aridade((x) => Math.abs(numero(x)), 1)],
  ["brl", aridade(brl, 1)], ["reais", aridade(reais, 1)], ["dividir", aridade(dividir, 2)], ["pct", aridade(pct, 2)],
]);
const FORMATOS = { brl, num: pyStr };
const MODELO = /<<(.+?)>>/g;

// --- estado -------------------------------------------------------------------------

/** Tudo o que muda durante a partida (é o que vai no save). */
export class Estado {
  constructor(personagens, regras = {}) {
    Object.defineProperty(this, "regras", { value: regras, enumerable: false, writable: true });
    Object.assign(this, {
      producao: 0, sobras: 0, capital: 0, caixa: 0, receitas: 0, despesas: 0, dividas: 0,
      a_receber: 0, preco: 0, vendidas: 0, extrato: [], itens: {}, carrinho: [], flags: {}, erros: {}, final: null,
    });
    const inicial = regras.afinidade_inicial ?? {};
    this.afinidade = Object.fromEntries(personagens.map((p) => [p, obter(inicial, p, 0)]));
  }

  /** Cópia só de dados (JSON) do estado: save e comparação com o Python. */
  paraDados() {
    return structuredClone({ ...this });
  }

  static deDados(dados, regras) {
    const estado = new Estado([], regras);
    return Object.assign(estado, structuredClone(dados));
  }

  lucroLiquido() {
    return this.receitas - this.despesas;
  }

  tem(flag) {
    return Boolean(proprio(this.flags, flag));
  }

  errou(quizId) {
    this.erros[quizId] = obter(this.erros, quizId, 0) + 1;
  }

  avaliar(expressao) {
    return avaliarTexto(expressao, contexto(this, variaveis(this)));
  }

  cond(expressao) {
    return verdade(this.avaliar(expressao));
  }

  /** Troca cada <<expressão>> do texto pelo valor calculado. */
  texto(modelo) {
    const ctx = contexto(this, variaveis(this));
    return modelo.replace(MODELO, (_, expressao) => pyStr(avaliarTexto(expressao.trim(), ctx)));
  }

  /** Aplica efeitos [{nome: argumentos}, ...] na ordem; devolve os avisos da interface. */
  aplicar(efeitos) {
    return efeitos.flatMap((efeito) => {
      const [nome, args] = Object.entries(efeito)[0];
      const regra = EFEITOS.get(nome) ?? falha("efeito desconhecido: " + nome);
      return regra(this, args);
    });
  }
}

// --- expressões: nomes visíveis --------------------------------------------------------

/** Nomes das expressões no estado atual (constantes, estado, preços, afinidade, cálculos em ordem). */
function variaveis(estado) {
  const r = estado.regras;
  const v = new Map(Object.entries(r.constantes ?? {}));
  const fixos = { caixa: estado.caixa, receitas: estado.receitas, despesas: estado.despesas, dividas: estado.dividas,
    a_receber: estado.a_receber, preco: estado.preco, producao: estado.producao, estoque: obter(estado.itens, "brigadeiro", 0),
    vendidas: estado.vendidas, sobras: estado.sobras, lucro: estado.lucroLiquido(), capital: estado.capital };
  Object.entries(fixos).forEach(([nome, valor]) => v.set(nome, valor));
  Object.entries(r.precos ?? {}).forEach(([item, c]) => v.set("preco_" + item, c));
  Object.entries(estado.afinidade).forEach(([p, n]) => v.set("af_" + p, n));
  const ctx = contexto(estado, v);
  (r.calculos ?? []).forEach((calculo) => v.set(calculo.nome, avaliarTexto(calculo.expr, ctx)));
  return v;
}

/** tabela("nome", chave) de regras.tabelas. As tabelas do jogo.yaml têm chaves
 * inteiras, que o JSON guarda como texto: chave numérica (bool conta como 0/1,
 * como no dict do Python) vira texto; chave texto não acha nada, como no Python. */
function tabela(estado, nome, chave) {
  if (typeof chave === "string") return 0;
  return obter(proprio(estado.regras.tabelas, nome), String(Number(chave)), 0);
}

function contexto(estado, v) {
  return {
    valor: (id) => (v.has(id) ? v.get(id) : nomeEspecial(estado, id)),
    funcao: (nome) => (nome === "tabela" ? aridade((n, c) => tabela(estado, n, c), 2) : FUNCOES.get(nome)),
  };
}

/** f_<flag>: a flag foi ligada; c_<item>: o item está no carrinho escolhido. */
function nomeEspecial(estado, id) {
  if (id.startsWith("f_")) return estado.tem(id.slice(2));
  if (id.startsWith("c_")) return estado.carrinho.includes(id.slice(2));
  return undefined;
}

// --- quiz e final ------------------------------------------------------------------------

/** Pergunta e 3 opções do quiz, com a resposta calculada no estado atual. */
export function montarQuiz(estado, spec) {
  const certo = estado.avaliar(spec.resposta);
  const valores = [certo, ...spec.erros.map((e) => estado.avaliar(e))];
  // set() do Python: True e 1 são o mesmo valor.
  if (new Set(valores.map(numero)).size !== 3 || Math.min(...valores.map(numero)) <= 0) {
    falha("opções do quiz inválidas " + JSON.stringify(valores) + " (" + spec.resposta + ")");
  }
  const formato = FORMATOS[spec.formato ?? "brl"];
  const posicao = "ABC".indexOf(spec.correta);
  const erros = valores.slice(1);
  const ordem = [0, 1, 2].map((i) => (i === posicao ? certo : erros.shift()));
  return { pergunta: estado.texto(spec.pergunta), correta: posicao,
    opcoes: ordem.map((valor, i) => "ABC"[i] + ") " + formato(valor)) };
}

/** Quem chama Angélica no ônibus: maior afinidade; empate, quem vem antes em 'ordem'. */
export function escolherFinal(afinidade, ordem) {
  return ordem.reduce((melhor, p) => (afinidade[p] > afinidade[melhor] ? p : melhor));
}

/** O que fere as regras do caixa (vazio = tudo certo). */
export function inconsistencias(e) {
  const problemas = [];
  const esperado = e.capital + e.receitas - e.a_receber - e.despesas + e.dividas;
  if (e.caixa !== esperado) problemas.push(`caixa ${e.caixa} difere do esperado ${esperado}`);
  const noCaixa = e.extrato.filter((m) => m.tipo !== "a_receber").reduce((s, m) => s + m.valor, 0);
  if (noCaixa !== e.caixa) problemas.push(`extrato soma ${noCaixa}, caixa ${e.caixa}`);
  const negativos = ["caixa", "dividas", "a_receber"].filter((nome) => e[nome] < 0)
    .concat(Object.entries(e.itens).filter(([, q]) => q < 0).map(([item]) => item));
  return problemas.concat(negativos.map((nome) => "negativo: " + nome));
}

// --- carrinho (tela 'Montar o carrinho') ------------------------------------------------

const precoDe = (estado, item) => proprio(estado.regras.precos, item) ?? falha("item sem preço: " + item);
const somaPrecos = (estado, ids) => ids.reduce((soma, item) => soma + precoDe(estado, item), 0);

/** Carrinho inicial: o 1º item (versão da vitrine) de cada grupo. */
export const carrinhoPadrao = (spec) => spec.grupos.map((grupo) => grupo[0]);

/** Todas as combinações (1 item por grupo), na ordem dos grupos. */
export function carrinhosPossiveis(spec) {
  return spec.grupos.reduce((combinacoes, grupo) => combinacoes.flatMap((antes) => grupo.map((item) => [...antes, item])), [[]]);
}

/** Regra única da compra: cabe no caixa finaliza; acima do caixa, só com o
 * empréstimo (até caixa + empréstimo). O que sobra fica de reserva. */
export function avaliarCarrinho(estado, spec, ids) {
  const total = somaPrecos(estado, ids);
  const valor = estado.avaliar(spec.emprestimo.valor);
  const cabe = total <= estado.caixa;
  const comEmprestimo = !cabe && total <= estado.caixa + valor;
  const ok = cabe || comEmprestimo;
  const reserva = estado.caixa + (comEmprestimo ? valor : 0) - total;
  return { total, ok, emprestimo: comEmprestimo, reserva: ok ? reserva : null };
}

/** Efetiva a compra do carrinho escolhido: despesa = soma dos preços; um de cada item no inventário. */
function compraCarrinho(e, args) {
  const valor = somaPrecos(e, e.carrinho);
  e.despesas += valor;
  e.carrinho.forEach((item) => moverItem(e, item, 1));
  return movimentar(e, "despesa", -valor, args.desc);
}

// --- efeitos ------------------------------------------------------------------------------

/** Dinheiro de um efeito: número = reais (YAML); texto = expressão em centavos. */
const dinheiro = (e, valor) => (typeof valor === "string" ? e.avaliar(valor) : centavos(valor));
const quantidade = (e, valor) => (typeof valor === "string" ? e.avaliar(valor) : valor);

/** str.format do Python para '{nome}', '{{' e '}}'. */
function formatar(modelo, dados) {
  return modelo.replace(/\{\{|\}\}|\{(\w*)\}/g, (achado, nome) => {
    if (nome === undefined) return achado[0];
    return Object.hasOwn(dados, nome) ? pyStr(dados[nome]) : falha("campo ausente no texto: " + nome);
  });
}

function movimentar(e, tipo, valor, desc) {
  const texto = e.texto(desc);
  if (e.caixa + valor < 0) falha("caixa ficaria negativo em: " + texto);
  e.caixa += valor;
  e.extrato.push({ tipo, desc: texto, valor });
  return [{ tipo: "caixa", valor }];
}

function moverItem(e, item, qtd) {
  const novo = obter(e.itens, item, 0) + qtd;
  if (novo < 0) falha("estoque negativo de " + item);
  e.itens[item] = novo;
}

function venda(e, args) {
  const qtd = quantidade(e, obter(args, "qtd", 0));
  const valor = Object.hasOwn(args, "valor") ? dinheiro(e, args.valor) : qtd * e.preco;
  moverItem(e, "brigadeiro", -qtd);
  e.vendidas += qtd;
  e.receitas += valor;
  return movimentar(e, "receita", valor, e.texto(formatar(args.desc, { qtd, preco: brl(e.preco) })));
}

function vendaAteRestar(e, args) {
  const qtd = obter(e.itens, "brigadeiro", 0) - quantidade(e, args.restante);
  if (qtd < 0) falha("estoque menor que o que deveria restar");
  return venda(e, { qtd, desc: args.desc });
}

function aReceber(e, args) {
  const valor = dinheiro(e, args.valor);
  e.receitas += valor;
  e.a_receber += valor;
  e.extrato.push({ tipo: "a_receber", desc: e.texto(args.desc), valor });
  return [];
}

function recebimento(e, args) {
  const valor = dinheiro(e, args.valor);
  if (valor > e.a_receber) falha("recebimento maior que o valor a receber");
  e.a_receber -= valor;
  return movimentar(e, "recebimento", valor, args.desc);
}

function quitar(e, args) {
  const valor = dinheiro(e, args.valor);
  if (valor > e.dividas) falha("pagamento maior que a dívida");
  e.dividas -= valor;
  return movimentar(e, "quitacao", -valor, args.desc);
}

/** Soma (ou tira) pontos, sempre entre 0 e o máximo. A interface NÃO mostra. */
function afinidade(e, args) {
  const maximo = e.regras.afinidade_maxima ?? 5;
  Object.entries(args).forEach(([pessoa, pontos]) => {
    const atual = proprio(e.afinidade, pessoa) ?? falha("afinidade com personagem desconhecido: " + pessoa);
    e.afinidade[pessoa] = Math.max(0, Math.min(maximo, atual + pontos));
  });
  return [];
}

function capital(e, args) {
  const valor = dinheiro(e, args.valor);
  e.capital += valor;
  return movimentar(e, "capital", valor, args.desc);
}

function despesa(e, args) {
  const valor = dinheiro(e, args.valor);
  e.despesas += valor;
  return movimentar(e, "despesa", -valor, args.desc);
}

function emprestimo(e, args) {
  const valor = dinheiro(e, args.valor);
  e.dividas += valor;
  return movimentar(e, "emprestimo", valor, args.desc);
}

function producao(e, qtd) {
  const n = quantidade(e, qtd);
  e.producao += n;
  moverItem(e, "brigadeiro", n);
  return [];
}

function consumoRestante(e) {
  e.sobras = obter(e.itens, "brigadeiro", 0);
  moverItem(e, "brigadeiro", -e.sobras);
  return [];
}

// Registro de efeitos (mesmos nomes de motor.EFEITOS).
const EFEITOS = new Map([
  ["capital", capital],
  ["despesa", despesa],
  ["compra_carrinho", compraCarrinho],
  ["venda", venda],
  ["venda_ate_restar", vendaAteRestar],
  ["a_receber", aReceber],
  ["recebimento", recebimento],
  ["emprestimo", emprestimo],
  ["quitar", quitar],
  ["consumo", (e, args) => (moverItem(e, obter(args, "item", "brigadeiro"), -quantidade(e, args.qtd)), [])],
  ["itens", (e, args) => (Object.entries(args).forEach(([item, qtd]) => moverItem(e, item, qtd)), [])],
  ["afinidade", afinidade],
  ["flag", (e, nome) => ((e.flags[nome] = true), [])],
  ["preco", (e, valor) => ((e.preco = centavos(valor)), [])],
  ["producao", producao],
  ["consumo_restante", consumoRestante],
  ["se", (e, args) => (e.cond(args.cond) ? e.aplicar(args.efeitos) : [])],
]);

export { ErroExpressao, proprio };
