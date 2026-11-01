import type { Flashcard } from '../types/flashcard'

const STORAGE_KEY = 'kotoba-flashcards-v1'
const THEME_KEY = 'kotoba-theme'

export const seedCards: Flashcard[] = [
  { id: 'seed-1', kanji: '勉強', reading: 'べんきょう', meaning: 'Học tập', note: 'Miễn cường', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'seed-2', kanji: '旅行', reading: 'りょこう', meaning: 'Du lịch', note: 'Lữ hành', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'seed-3', kanji: '美しい', reading: 'うつくしい', meaning: 'Đẹp, xinh đẹp', note: 'Mỹ', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
]

export function loadCards(): Flashcard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedCards
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return seedCards
    return parsed.filter(isFlashcard)
  } catch {
    return seedCards
  }
}

function isFlashcard(value: unknown): value is Flashcard {
  if (!value || typeof value !== 'object') return false
  const card = value as Record<string, unknown>
  return ['id', 'kanji', 'reading', 'meaning', 'note'].every((key) => typeof card[key] === 'string')
}

export function saveCards(cards: Flashcard[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards))
}

export function loadTheme(): 'light' | 'dark' {
  return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
}

export function saveTheme(theme: 'light' | 'dark') {
  localStorage.setItem(THEME_KEY, theme)
}
