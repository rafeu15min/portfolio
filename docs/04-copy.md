# 04 — Copy (pt-BR)

Tom: descritivo e direto. Sem slogans nem frases de efeito (ver manifesto).
Os textos de projeto e timeline vivem em `content/*.json`. Aqui ficam os
textos de interface e a copy das seções fixas.

## Hero

- **Nome:** RaFeu (ASCII, figlet Small, só o traço)
- **Linha 1:** Engenheiro de Software · Integrador de IA
- **Linha 2:** Desenvolvo em Rust, Python e Java, com foco em segurança e infraestrutura.
- **CTAs:** `ver projetos ↓` · `contato`

## Manifesto

> **01 · Segurança.** Segurança de memória, menor privilégio e atenção às dependências.
>
> **02 · Performance.** Otimização orientada por medição e profiling.
>
> **03 · Governança.** Tratamento de dados pessoais de acordo com a LGPD desde o projeto do sistema.

## Stack

- **Título:** Stack
- **Lede:** Tecnologias usadas nos meus projetos, com link para cada um.
- **Dados:** `content/stack.json`. Cada tecnologia lista os slugs dos
  projetos onde aparece. Só entra tecnologia com projeto que a comprove.
- **Card principal:** `linguagem principal` · **Rust** — texto em `content/stack.json`.
- **Grupos:** Linguagens · Frameworks · Infra & dados · IA & 3D.

## Projetos

- **Título:** PROJETOS
- **Subtítulo:** Projetos pessoais e de estudo, com link para o código quando ele é público.
- **Rótulos:** `ativo` · `em construção` · `protótipo` · `estudo` · `concluído` · `código ↗` · `🔒 repo privado` · `sem repo público`
- **Dados:** `content/projects.json` (16 projetos, levantados do GitHub e de `~/Projetos`).

## Trajetória

- **Título:** Trajetória
- **Subtítulo:** Formação e experiência profissional.
- **Dados:** `content/timeline.json`.

## Devoção

- **Título:** Devoção (não "Santos": o Espírito Santo e Jesus são Deus)
- **Intro, placas e orações:** `content/devocao.json`.
- **Botão:** entrar na exposição 3D →
- **Página:** "arraste para girar · clique numa imagem" · "visão geral" ·
  "carregando modelos n/5"

## Contato

- **Título:** `> CONTATO_`
- **Intro:** Projeto, vaga ou problema cabeludo de infraestrutura? Escreve.
- **Campos:** nome · e-mail · mensagem
- **Consentimento:** Autorizo o uso destes dados exclusivamente para
  responder esta mensagem. Nada é armazenado no servidor.
- **Botão:** enviar
- **Sucesso:** Recebido. Respondo em breve.
- **Erro (rate limit):** Calma — muitas mensagens em pouco tempo. Tenta de novo em um minuto.
- **Erro (validação):** Confere os campos: nome, e-mail válido e uma mensagem de até 4000 caracteres.
- **Erro (genérico):** Não deu pra enviar agora. Me chama direto pelo GitHub.
  *(pendente: decidir se um e-mail público entra no site)*

## Rodapé

Feito com Rust e Vue, sem cookies nem rastreadores · Catanduva/SP
