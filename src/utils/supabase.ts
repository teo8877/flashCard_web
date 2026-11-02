import { createClient } from '@supabase/supabase-js'
import type { Flashcard, Lesson } from '../types/flashcard'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isCloudConfigured = Boolean(url && anonKey)
export const supabase = isCloudConfigured ? createClient(url, anonKey) : null

type CloudCard = {
  id: string
  lesson_id: string
  kanji: string
  reading: string
  meaning: string
  note: string
  created_at: string
  updated_at: string
}

type CloudLesson = Omit<Lesson, 'createdAt'> & { created_at: string }

export async function fetchCloudData() {
  if (!supabase) return null
  const [{ data: lessons, error: lessonsError }, { data: cards, error: cardsError }] = await Promise.all([
    supabase.from('lessons').select('*').order('created_at'),
    supabase.from('flashcards').select('*').order('created_at', { ascending: false }),
  ])
  if (lessonsError) throw lessonsError
  if (cardsError) throw cardsError
  return {
    lessons: (lessons as CloudLesson[]).map(({ created_at, ...lesson }) => ({ ...lesson, createdAt: created_at })),
    cards: (cards as CloudCard[]).map(({ created_at, updated_at, lesson_id, ...card }) => ({ ...card, lessonId: lesson_id, createdAt: created_at, updatedAt: updated_at })),
  }
}

export async function upsertCloudLesson(lesson: Lesson) {
  if (!supabase) return
  const { error } = await supabase.from('lessons').upsert({ id: lesson.id, title: lesson.title, description: lesson.description, created_at: lesson.createdAt })
  if (error) throw error
}

export async function deleteCloudLesson(id: string) {
  if (!supabase) return
  const { error } = await supabase.from('lessons').delete().eq('id', id)
  if (error) throw error
}

export async function upsertCloudCard(card: Flashcard) {
  if (!supabase) return
  const { error } = await supabase.from('flashcards').upsert({
    id: card.id, lesson_id: card.lessonId, kanji: card.kanji, reading: card.reading,
    meaning: card.meaning, note: card.note, created_at: card.createdAt, updated_at: card.updatedAt,
  })
  if (error) throw error
}

export async function deleteCloudCard(id: string) {
  if (!supabase) return
  const { error } = await supabase.from('flashcards').delete().eq('id', id)
  if (error) throw error
}
