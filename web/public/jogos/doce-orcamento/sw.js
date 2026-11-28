// Service worker do Doce Orçamento: o jogo inteiro fica no cache na primeira
// visita e depois abre sem rede (Chromebook offline). A lista de arquivos e a
// versão são preenchidas pelo build (tools/web.py); versão nova = cache novo,
// e o antigo é apagado. Caminhos relativos ao escopo: funciona em subpasta.
const VERSAO = "311a03d3980bc306";
const ARQUIVOS = ["./", "audio.js", "audio/acerto.wav", "audio/clique.wav", "audio/conquista.wav", "audio/erro.wav", "audio/moeda.wav", "audio/pagina.wav", "caderno.js", "camadas.js", "cozinha.js", "data/assets.json", "data/conteudo.json", "dialogo.js", "dom.js", "estilo.css", "expressao.js", "finais.js", "fonts/Fredoka-Variable.ttf", "fonts/Nunito-Variable.ttf", "fonts/OFL-Fredoka.txt", "fonts/OFL-Nunito.txt", "fonts/ORIGEM.txt", "hud.js", "img/cozinha/bolha.webp", "img/cozinha/colher_0.webp", "img/cozinha/colher_1.webp", "img/cozinha/colher_2.webp", "img/cozinha/colher_3.webp", "img/cozinha/colher_4.webp", "img/cozinha/colher_5.webp", "img/cozinha/colher_6.webp", "img/cozinha/mistura_disco.webp", "img/cozinha/mistura_elipse_1.webp", "img/cozinha/mistura_elipse_2.webp", "img/cozinha/mistura_mancha_1.webp", "img/cozinha/mistura_mancha_2.webp", "img/cozinha/mistura_massa.webp", "img/cozinha/mistura_nivel_1.webp", "img/cozinha/mistura_nivel_2.webp", "img/cozinha/mistura_nivel_3.webp", "img/cozinha/mistura_oval.webp", "img/cozinha/mistura_sombra.webp", "img/cozinha/panela_0.webp", "img/cozinha/panela_1.webp", "img/cozinha/panela_2.webp", "img/cozinha/panela_3.webp", "img/cozinha/panela_4.webp", "img/cozinha/panela_5.webp", "img/cozinha/panela_6.webp", "img/fundos/cozinha_cassia.webp", "img/fundos/cozinha_minigame.webp", "img/fundos/creditos.webp", "img/fundos/feira_fim_do_dia.webp", "img/fundos/feira_movimentada.webp", "img/fundos/listrado.webp", "img/fundos/onibus_excursao.webp", "img/fundos/patio_barraca.webp", "img/fundos/patio_revelacao.webp", "img/fundos/sala_aula_manha.webp", "img/fundos/supermercado.webp", "img/fundos/titulo.webp", "img/icones/icone_192.png", "img/icones/icone_512.png", "img/itens/achocolatado_comum.webp", "img/itens/achocolatado_premium.webp", "img/itens/brigadeiro.webp", "img/itens/brigadeiro_amendoim.webp", "img/itens/brigadeiro_bolinha.webp", "img/itens/brigadeiro_colorido.webp", "img/itens/brigadeiro_tradicional.webp", "img/itens/creme_de_leite.webp", "img/itens/forminhas.webp", "img/itens/granulado.webp", "img/itens/granulado_amendoim.webp", "img/itens/granulado_bolinha.webp", "img/itens/granulado_colorido.webp", "img/itens/leite_condensado.webp", "img/itens/leite_condensado_economico.webp", "img/personagens/ana_alegria.webp", "img/personagens/ana_choro.webp", "img/personagens/ana_euforia.webp", "img/personagens/ana_nervosismo.webp", "img/personagens/ana_raiva.webp", "img/personagens/ana_surpresa.webp", "img/personagens/cassia_alegria.webp", "img/personagens/cassia_raiva.webp", "img/personagens/cassia_tristeza.webp", "img/personagens/denis_alegria.webp", "img/personagens/denis_raiva.webp", "img/personagens/denis_tristeza.webp", "img/personagens/lucas_alegria.webp", "img/personagens/lucas_raiva.webp", "img/personagens/lucas_tristeza.webp", "img/personagens/tabata_alegria.webp", "img/personagens/tabata_raiva.webp", "img/personagens/tabata_tristeza.webp", "img/ui/menu_carregar_hover.webp", "img/ui/menu_carregar_idle.webp", "img/ui/menu_carregar_insensitive.webp", "img/ui/menu_continuar_hover.webp", "img/ui/menu_continuar_idle.webp", "img/ui/menu_continuar_insensitive.webp", "img/ui/menu_novo_jogo_hover.webp", "img/ui/menu_novo_jogo_idle.webp", "img/ui/menu_novo_jogo_insensitive.webp", "img/ui/menu_opcoes_hover.webp", "img/ui/menu_opcoes_idle.webp", "img/ui/menu_opcoes_insensitive.webp", "img/ui/menu_sair_hover.webp", "img/ui/menu_sair_idle.webp", "img/ui/menu_sair_insensitive.webp", "img/ui/menu_sobre_hover.webp", "img/ui/menu_sobre_idle.webp", "img/ui/menu_sobre_insensitive.webp", "img/ui/slider_hover_alca.webp", "img/ui/slider_idle_alca.webp", "index.html", "jogo.js", "jogo.pack", "licencas/Fulli.txt", "licencas/LEIA-ME.txt", "licencas/puppetbomb/readme.txt", "main.js", "manifest.webmanifest", "menu.js", "motor.js", "paineis.js", "palco.js", "roteiro.js", "saves.js"];
const CACHE = "doce-orcamento-" + VERSAO;

self.addEventListener("install", (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (evento) => {
  const antigos = (nomes) => nomes.filter((nome) => nome.startsWith("doce-orcamento-") && nome !== CACHE);
  evento.waitUntil(caches.keys()
    .then((nomes) => Promise.all(antigos(nomes).map((nome) => caches.delete(nome))))
    .then(() => self.clients.claim()));
});

// Cache primeiro (tudo é estático e versionado); navegação cai no index.html.
self.addEventListener("fetch", (evento) => {
  if (evento.request.method !== "GET") return;
  const navegacao = evento.request.mode === "navigate";
  evento.respondWith(caches.open(CACHE).then(async (cache) => {
    const achado = await cache.match(evento.request, { ignoreSearch: true });
    if (achado) return achado;
    if (navegacao) return (await cache.match("./")) ?? fetch(evento.request);
    return fetch(evento.request);
  }));
});
