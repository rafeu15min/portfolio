// Som do jogo: música por cena e efeitos curtos, pela Web Audio API.
//
// Música: as faixas vêm num pacote binário só (jogo.pack, montado por
// tools/web.py; a licença Pizza Doggy proíbe oferecer os arquivos avulsos).
// Cada faixa vira um Blob tocado por UM elemento <audio> (decodifica aos
// poucos: leve para Chromebook), ligado a um ganho de fade e a um de volume.
// Troca em SEQUÊNCIA: a faixa atual some (fade-out), só então a nova entra
// (fade-in); com um elemento só, duas faixas nunca tocam juntas. Pedir a faixa
// que já toca não reinicia nada.
// Navegadores só liberam som depois de um gesto (clique/tecla): até lá a faixa
// pedida fica guardada e começa no primeiro gesto (desbloquear()).
// Para os testes, <html data-musica="chave" data-audio="running|suspended">.

const EFEITOS = ["clique", "acerto", "erro", "moeda", "pagina"];

/** Lê o índice do jogo.pack e devolve {chave: Blob ogg}. */
function abrirPacote(buffer) {
  const visao = new DataView(buffer);
  const magico = new TextDecoder().decode(new Uint8Array(buffer, 0, 8));
  if (magico !== "DOCEPAK1") throw new Error("jogo.pack inválido");
  const tamanho = visao.getUint32(8, true);
  const indice = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 12, tamanho)));
  const base = 12 + tamanho;
  return Object.fromEntries(Object.entries(indice).map(([chave, [inicio, bytes]]) =>
    [chave, new Blob([buffer.slice(base + inicio, base + inicio + bytes)], { type: "audio/ogg" })]));
}

export class Som {
  #ctx = null;
  #fade = null;
  #volMusica = null;
  #volEfeitos = null;
  #elemento = new Audio();
  #urls = {};
  #buffers = new Map();
  #atual = null;    // chave que está tocando (ou em fade-in)
  #alvo = null;     // chave pedida por último
  #trocando = false;

  constructor(fadeSegundos, preferencias) {
    this.fade = fadeSegundos;
    this.prefs = preferencias;
    this.#elemento.loop = true;
    this.#elemento.preload = "auto";
    this.#marcar();
  }

  /** Busca o pacote de músicas (sem ele o jogo segue em silêncio). */
  async carregarMusicas(url) {
    try {
      const resposta = await fetch(url);
      if (!resposta.ok) throw new Error(resposta.status);
      const blobs = abrirPacote(await resposta.arrayBuffer());
      this.#urls = Object.fromEntries(Object.entries(blobs).map(([k, b]) => [k, URL.createObjectURL(b)]));
    } catch (erro) {
      console.warn("música indisponível:", erro);
    }
    this.#trocar();
  }

  /** Cria/retoma o AudioContext no 1º gesto do jogador (política de autoplay). */
  desbloquear() {
    if (!this.#ctx) this.#montar();
    if (this.#ctx.state !== "running") this.#ctx.resume().then(() => this.#marcar(), () => {});
    this.#marcar();
    this.#trocar();
  }

  #montar() {
    const Contexto = window.AudioContext ?? window.webkitAudioContext;
    this.#ctx = new Contexto();
    this.#fade = this.#ctx.createGain();
    this.#volMusica = this.#ctx.createGain();
    this.#volEfeitos = this.#ctx.createGain();
    this.#ctx.createMediaElementSource(this.#elemento).connect(this.#fade);
    this.#fade.connect(this.#volMusica).connect(this.#ctx.destination);
    this.#volEfeitos.connect(this.#ctx.destination);
    this.#fade.gain.value = 0;
    this.#ctx.onstatechange = () => this.#marcar();
    this.aplicarVolumes();
    EFEITOS.forEach((nome) => this.#carregarEfeito(nome));
  }

  async #carregarEfeito(nome) {
    try {
      const dados = await (await fetch("audio/" + nome + ".wav")).arrayBuffer();
      this.#buffers.set(nome, await this.#ctx.decodeAudioData(dados));
    } catch (erro) {
      console.warn("efeito indisponível:", nome, erro);
    }
  }

  aplicarVolumes() {
    if (!this.#ctx) return;
    const mudo = this.prefs.mudo;
    this.#volMusica.gain.value = mudo ? 0 : this.prefs.musica;
    this.#volEfeitos.gain.value = mudo ? 0 : this.prefs.efeitos;
  }

  efeito(nome) {
    const buffer = this.#buffers.get(nome);
    if (!buffer || this.#ctx?.state !== "running") return;
    const fonte = this.#ctx.createBufferSource();
    fonte.buffer = buffer;
    fonte.connect(this.#volEfeitos);
    fonte.start();
  }

  /** Pede a música da cena (null = nenhuma mudança, como os nós que só desviam). */
  musica(chave) {
    if (!chave) return;
    this.#alvo = chave;
    this.#trocar();
  }

  get tocando() {
    return this.#atual;
  }

  /** Executa as trocas pendentes em sequência (uma por vez). */
  async #trocar() {
    if (this.#trocando || !this.#ctx || this.#ctx.state === "closed" || !this.#urls[this.#alvo]) return;
    this.#trocando = true;
    document.documentElement.dataset.musicaTroca = "sim";
    try {
      while (this.#alvo !== this.#atual && this.#urls[this.#alvo]) {
        if (this.#atual) await this.#rampa(0);
        this.#elemento.pause();
        this.#atual = this.#alvo;
        this.#elemento.src = this.#urls[this.#atual];
        this.#marcar();
        // Sem saída de áudio (ou play bloqueado) a promessa pode não voltar: não espera mais de 2 s.
        await Promise.race([this.#elemento.play().catch(() => {}), new Promise((ok) => setTimeout(ok, 2000))]);
        this.#rampa(1);
      }
    } finally {
      this.#trocando = false;
      document.documentElement.dataset.musicaTroca = "";
    }
  }

  /** Fade do ganho até 'valor' em 'fade' segundos; resolve no fim. */
  #rampa(valor) {
    const agora = this.#ctx.currentTime;
    const ganho = this.#fade.gain;
    ganho.cancelScheduledValues(agora);
    ganho.setValueAtTime(ganho.value, agora);
    ganho.linearRampToValueAtTime(valor, agora + this.fade);
    return new Promise((resolve) => setTimeout(resolve, this.fade * 1000));
  }

  #marcar() {
    document.documentElement.dataset.musica = this.#atual ?? "";
    document.documentElement.dataset.audio = this.#ctx?.state ?? "bloqueado";
  }
}
