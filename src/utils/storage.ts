import type { Flashcard, Lesson } from '../types/flashcard'

const STORAGE_KEY = 'kotoba-flashcards-v1'
const THEME_KEY = 'kotoba-theme'
const LESSONS_KEY = 'kotoba-lessons-v1'
export const defaultLesson: Lesson = { id: 'lesson-1', title: 'Bài 1', description: 'Từ vựng cơ bản', createdAt: new Date().toISOString() }

export const seedCards: Flashcard[] = [
  { id: 'seed-1', lessonId: 'lesson-1', kanji: '勉強', reading: 'べんきょう', meaning: 'Học tập', note: 'Miễn cường', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'seed-2', lessonId: 'lesson-1', kanji: '旅行', reading: 'りょこう', meaning: 'Du lịch', note: 'Lữ hành', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'seed-3', lessonId: 'lesson-1', kanji: '美しい', reading: 'うつくしい', meaning: 'Đẹp, xinh đẹp', note: 'Mỹ', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
]

export function loadCards(): Flashcard[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedCards
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return seedCards
    return parsed.filter(isFlashcard).map((card) => ({ ...card, lessonId: card.lessonId || 'lesson-1' }))
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

export function loadLessons(): Lesson[] {
  try {
    const raw = localStorage.getItem(LESSONS_KEY)
    if (!raw) return [defaultLesson]
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return [defaultLesson]
    const lessons = parsed.filter(isLesson)
    return lessons.length ? lessons : [defaultLesson]
  } catch {
    return [defaultLesson]
  }
}

function isLesson(value: unknown): value is Lesson {
  if (!value || typeof value !== 'object') return false
  const lesson = value as Record<string, unknown>
  return ['id', 'title', 'description'].every((key) => typeof lesson[key] === 'string')
}

export function saveLessons(lessons: Lesson[]) {
  localStorage.setItem(LESSONS_KEY, JSON.stringify(lessons))
}

export function loadTheme(): 'light' | 'dark' {
  return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
}

export function saveTheme(theme: 'light' | 'dark') {
  localStorage.setItem(THEME_KEY, theme)
}
