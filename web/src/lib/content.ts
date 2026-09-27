// Conteúdo embutido em build — o site renderiza completo sem a API.
import projectsJson from '@content/projects.json'
import timelineJson from '@content/timeline.json'

export type Accent = 'rust' | 'cyan' | 'pink' | 'purple'

export interface Project {
  slug: string
  name: string
  tagline: string
  summary: string
  highlights: string[]
  stack: string[]
  status: string
  visibility: 'public' | 'private'
  repo: string | null
  accent: Accent
  todo?: string
}

export interface TimelineEntry {
  kind: 'trabalho' | 'formação'
  org: string | null
  role: string
  period: string | null
  text: string
}

export const projects = projectsJson as Project[]
export const timeline = timelineJson as TimelineEntry[]

export const findProject = (slug: string) => projects.find((p) => p.slug === slug)

import devocaoJson from '@content/devocao.json'

export interface DevotionPiece {
  id: string
  name: string
  subtitle: string
  meaning: string | null
  feast: string
  refs: string
  text: string
  prayer: string | null
  model: string
  position: [number, number, number]
  rotationY: number
  height: number
  base: 'altar' | 'corbel' | 'glory'
  /** gira sempre de frente para a câmera (Espírito Santo) */
  billboard?: boolean
  credit: string | null
  creditUrl: string | null
}

export const devocao = devocaoJson as { intro: string; pieces: DevotionPiece[] }

import stackJson from '@content/stack.json'

export interface StackItem {
  name: string
  /** slugs de content/projects.json onde a tecnologia aparece */
  projects: string[]
}

export const stack = stackJson as {
  main: StackItem & { text: string }
  groups: { title: string; items: StackItem[] }[]
}
