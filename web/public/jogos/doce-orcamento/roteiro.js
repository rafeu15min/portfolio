// O que cada tipo de nó do roteiro faz com o estado (sem tela): a mesma
// semântica de tools/caminhos.py (ramificar) e do Ren'Py gerado
// (tools/gen_renpy.py). O jogo (jogo.js) e o teste de equivalência usam estas
// funções, então o que o teste prova é o que o jogo faz.

import { avaliarCarrinho, escolherFinal } from "./motor.js";

/** Texto exibido: fala, narração ou ação (conteudo.texto_da_fala). */
export const textoDaFala = (fala) => fala.texto || fala.narracao || fala.acao;

/** Fala ou opção com 'se' só aparece quando a condição vale. */
export const visivel = (item, estado) => !Object.hasOwn(item, "se") || estado.cond(item.se);

/** Falas que aparecem, cada uma com o texto já calculado ('dito'). */
export function falasVisiveis(falas = [], estado) {
  return falas.filter((f) => visivel(f, estado)).map((f) => ({ ...f, dito: estado.texto(textoDaFala(f)) }));
}

export const opcoesVisiveis = (no, estado) => no.opcoes.filter((o) => visivel(o, estado));

/** Ao entrar no nó: a cena aplica os efeitos antes das falas (avisos do caixa). */
export function entrar(no, estado) {
  return no.tipo === "cena" ? estado.aplicar(no.efeitos ?? []) : [];
}

/** Escolha A/B ou jeito de cozinhar: aplica os efeitos da opção. */
export function escolher(opcao, estado) {
  return { seguir: opcao.seguir, avisos: estado.aplicar(opcao.efeitos ?? []) };
}

/** Ramo: o primeiro caso cuja condição vale, senão 'senao'. */
export function desviar(no, estado) {
  return no.casos.find((caso) => estado.cond(caso.se))?.seguir ?? no.senao;
}

/** Final: quem tem mais afinidade (desempate pela ordem) chama Angélica. */
export function decidirFinal(no, estado, ordem) {
  estado.final = escolherFinal(estado.afinidade, ordem);
  return no.finais.find((f) => f.personagem === estado.final).seguir;
}

/** Item cuja arte (ícone e nome) aparece no lugar de 'id': a aparência segue o que
 * foi comprado (itens.yaml > aparencia; ex.: os brigadeiros seguem o granulado do
 * carrinho). A 1ª entrada cujo item está no carrinho vence, como doce_arte no Ren'Py. */
export function itemDaArte(itens, estado, id) {
  const aparencia = Object.entries(itens[id]?.aparencia ?? {});
  return aparencia.find(([comprado]) => estado.carrinho.includes(comprado))?.[1] ?? id;
}

/** Finaliza a compra do carrinho 'ids' (só se a regra deixa): empréstimo, compra e efeitos do nó. */
export function finalizarCarrinho(no, estado, ids) {
  const avaliacao = avaliarCarrinho(estado, no, ids);
  if (!avaliacao.ok) throw new Error("carrinho não cabe no caixa nem com o empréstimo");
  estado.carrinho = [...ids];
  const avisos = avaliacao.emprestimo ? estado.aplicar(no.efeitos_emprestimo) : [];
  return avisos.concat(estado.aplicar([{ compra_carrinho: { desc: no.desc } }, ...(no.efeitos ?? [])]));
}
