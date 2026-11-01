export type Flashcard = {
  id: string
  lessonId: string
  kanji: string
  reading: string
  meaning: string
  note: string
  createdAt: string
  updatedAt: string
}

export type FlashcardDraft = Omit<Flashcard, 'id' | 'lessonId' | 'createdAt' | 'updatedAt'>

export type Lesson = {
  id: string
  title: string
  description: string
  createdAt: string
}
