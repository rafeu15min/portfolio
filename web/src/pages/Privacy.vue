<script setup lang="ts">
import { onMounted } from 'vue'
import PaperCard from '@/components/collage/PaperCard.vue'
import Tape from '@/components/collage/Tape.vue'

onMounted(() => {
  document.title = 'Privacidade · Rafeu'
})
</script>

<template>
  <div class="section wrap privacy">
    <RouterLink to="/" class="back">← voltar</RouterLink>

    <PaperCard variant="notebook" :tilt="0.3" class="privacy__body">
      <Tape pos="tl" />
      <h1 class="stencil">Política de privacidade</h1>
      <p class="privacy__date">Atualizada em 9 de outubro de 2026</p>

      <h2 class="stencil">rclone FeuVault</h2>
      <p>
        "rclone FeuVault" é o nome do acesso OAuth que uso para sincronizar a minha própria conta do
        Google Drive com o meu servidor doméstico e o meu leitor de e-books, por meio do rclone. Não é
        um serviço aberto ao público: a única conta que o usa é a minha.
      </p>

      <h2 class="stencil">Dados acessados</h2>
      <p>
        O acesso lê e grava arquivos na pasta de livros do meu Drive. Os arquivos são copiados apenas
        para aparelhos meus. Nenhum dado é vendido, compartilhado com terceiros ou usado para
        publicidade.
      </p>

      <h2 class="stencil">Revogar o acesso</h2>
      <p>
        O acesso pode ser revogado a qualquer momento em
        <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener">myaccount.google.com/permissions</a>.
      </p>

      <h2 class="stencil">Contato</h2>
      <p>Dúvidas: pelo formulário de contato da <RouterLink to="/#contato">página inicial</RouterLink>.</p>
    </PaperCard>
  </div>
</template>

<style scoped>
.back {
  display: inline-block;
  padding: 0.5rem 0;
  margin-bottom: 1.5rem;
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--on-bg);
}
.privacy__body { max-width: 46rem; overflow-wrap: anywhere; }
.privacy__body h1 { margin: 0; font-size: 2rem; }
.privacy__body h2 { margin: 1.6rem 0 0.4rem; font-size: 1.2rem; }
.privacy__date { margin: 0.3rem 0 0; font-family: var(--font-mono); font-size: 0.85rem; }
.privacy__body p { margin-top: 0; }
</style>
