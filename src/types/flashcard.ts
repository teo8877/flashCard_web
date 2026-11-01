export type Flashcard = {
  id: string
  kanji: string
  reading: string
  meaning: string
  note: string
  createdAt: string
  updatedAt: string
}

export type FlashcardDraft = Omit<Flashcard, 'id' | 'createdAt' | 'updatedAt'>
