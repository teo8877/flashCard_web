import type { Flashcard, FlashcardDraft } from '../types/flashcard'

export function exportCards(cards: Flashcard[]) {
  const blob = new Blob([JSON.stringify(cards, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `kotoba-flashcards-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function parseCardsFile(file: File): Promise<FlashcardDraft[]> {
  const content = await file.text()
  const parsed: unknown = JSON.parse(content)
  if (!Array.isArray(parsed)) throw new Error('Tệp JSON phải chứa một danh sách thẻ.')
  const cards = parsed.map((item, index) => {
    if (!item || typeof item !== 'object') throw new Error(`Thẻ số ${index + 1} không hợp lệ.`)
    const row = item as Record<string, unknown>
    if (typeof row.kanji !== 'string' || !row.kanji.trim()) throw new Error(`Thẻ số ${index + 1} thiếu trường Kanji.`)
    return {
      kanji: row.kanji.trim(),
      reading: typeof row.reading === 'string' ? row.reading.trim() : '',
      meaning: typeof row.meaning === 'string' ? row.meaning.trim() : '',
      note: typeof row.note === 'string' ? row.note.trim() : '',
    }
  })
  return cards
}
