// A API só enriquece. Toda chamada falha em silêncio pro conteúdo estático.
export interface RepoStats {
  stars: number
  pushed_at: string
  language: string | null
}

export async function fetchRepoStats(slug: string): Promise<RepoStats | null> {
  try {
    const res = await fetch(`/api/github/${encodeURIComponent(slug)}`)
    return res.ok ? await res.json() : null
  } catch {
    return null
  }
}

export interface ContactPayload {
  name: string
  email: string
  message: string
  consent: boolean
  website: string // honeypot: humano deixa vazio
}

export type ContactResult = 'ok' | 'rate_limited' | 'invalid' | 'error'

export async function sendContact(payload: ContactPayload): Promise<ContactResult> {
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) return 'ok'
    if (res.status === 429) return 'rate_limited'
    if (res.status === 422 || res.status === 400) return 'invalid'
    return 'error'
  } catch {
    return 'error'
  }
}
