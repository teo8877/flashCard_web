import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, BookOpen, Check, Download, Edit3,
  Layers, Lightbulb, LogIn, LogOut, Maximize2, Minimize2, Moon, Plus, Search, Shuffle, Sun, Trash2, Upload, X,
} from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { Flashcard, FlashcardDraft, Lesson } from './types/flashcard'
import { exportCards, parseCardsFile } from './utils/importExport'
import { defaultLesson, loadCards, loadLessons, loadTheme, saveCards, saveLessons, saveTheme } from './utils/storage'
import { deleteCloudCard, deleteCloudLesson, fetchCloudData, isCloudConfigured, supabase, upsertCloudCard, upsertCloudLesson } from './utils/supabase'

const emptyDraft: FlashcardDraft = { kanji: '', reading: '', meaning: '', note: '' }
const faceLabels = ['Kanji', 'Cách đọc', 'Nghĩa', 'Âm Hán-Việt']

function makeCard(draft: FlashcardDraft, lessonId: string): Flashcard {
  const now = new Date().toISOString()
  return { ...draft, lessonId, id: crypto.randomUUID(), createdAt: now, updatedAt: now }
}

export default function App() {
  const [cards, setCards] = useState<Flashcard[]>(loadCards)
  const [lessons, setLessons] = useState<Lesson[]>(loadLessons)
  const [selectedLessonId, setSelectedLessonId] = useState(() => loadLessons()[0]?.id ?? defaultLesson.id)
  const [selectedId, setSelectedId] = useState<string | null>(() => loadCards()[0]?.id ?? null)
  const [face, setFace] = useState(0)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editing, setEditing] = useState<Flashcard | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLessonId, setDeleteLessonId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>(loadTheme)
  const [shuffled, setShuffled] = useState(false)
  const [studyFullscreen, setStudyFullscreen] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [cloudLoading, setCloudLoading] = useState(isCloudConfigured)
  const [cloudEmpty, setCloudEmpty] = useState(false)
  const [authError, setAuthError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => saveCards(cards), [cards])
  useEffect(() => saveLessons(lessons), [lessons])
  useEffect(() => {
    if (!supabase) { setCloudLoading(false); return }
    let active = true
    void supabase.auth.getSession().then(({ data }) => { if (active) setUser(data.session?.user ?? null) })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null))
    void fetchCloudData().then((data) => {
      if (!active || !data) return
      if (!data.lessons.length) { setCloudEmpty(true); return }
      setLessons(data.lessons)
      setCards(data.cards)
      setSelectedLessonId((current) => data.lessons.some((lesson) => lesson.id === current) ? current : data.lessons[0].id)
      setSelectedId(data.cards[0]?.id ?? null)
    }).catch(() => setToast('Không thể tải dữ liệu online. Đang dùng dữ liệu trên máy này.')).finally(() => { if (active) setCloudLoading(false) })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])
  useEffect(() => {
    if (!user || !cloudEmpty) return
    void Promise.all([...lessons.map(upsertCloudLesson), ...cards.map(upsertCloudCard)]).then(() => {
      setCloudEmpty(false)
      setToast('Đã đồng bộ dữ liệu hiện tại lên Supabase')
    }).catch(() => setToast('Không thể đồng bộ dữ liệu lên Supabase'))
  }, [cards, cloudEmpty, lessons, user])
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    saveTheme(theme)
  }, [theme])
  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  const visibleCards = useMemo(() => {
    const filtered = cards.filter((card) => card.lessonId === selectedLessonId).filter((card) => {
      const matchesSearch = [card.kanji, card.reading, card.meaning].some((value) => value.toLowerCase().includes(query.toLowerCase()))
      const matchesFilter = filter === 'all' || (filter === 'hasNote' ? card.note.trim().length > 0 : card.reading.trim().length > 0)
      return matchesSearch && matchesFilter
    })
    return shuffled ? [...filtered].sort(() => Math.random() - 0.5) : filtered
  }, [cards, filter, query, selectedLessonId, shuffled])

  const selectedIndex = Math.max(0, visibleCards.findIndex((card) => card.id === selectedId))
  const selected = visibleCards[selectedIndex] ?? visibleCards[0]

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id)
  }, [selected, selectedId])

  const selectCard = (id: string) => { setSelectedId(id); setFace(0) }
  const move = (delta: number) => {
    if (!visibleCards.length) return
    const next = (selectedIndex + delta + visibleCards.length) % visibleCards.length
    selectCard(visibleCards[next].id)
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (modal || deleteId) return
      if (event.key === ' ' || event.key === 'Enter') { event.preventDefault(); setFace((value) => (value + 1) % 4) }
      if (event.key === 'ArrowLeft') move(-1)
      if (event.key === 'ArrowRight') move(1)
      if (event.key === 'Escape') setStudyFullscreen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const saveDraft = (draft: FlashcardDraft) => {
    if (!draft.kanji.trim()) return
    if (editing) {
      const updated = { ...editing, ...draft, updatedAt: new Date().toISOString() }
      setCards((current) => current.map((card) => card.id === editing.id ? updated : card))
      if (user) void upsertCloudCard(updated).catch(() => setToast('Không thể lưu thẻ lên máy chủ'))
      setSelectedId(editing.id)
      setToast('Đã cập nhật thẻ thành công')
    } else {
      const card = makeCard(draft, selectedLessonId)
      setCards((current) => [card, ...current])
      if (user) void upsertCloudCard(card).catch(() => setToast('Không thể lưu thẻ lên máy chủ'))
      setSelectedId(card.id)
      setToast('Đã thêm thẻ mới')
    }
    setFace(0); setModal(null); setEditing(null)
  }
  const confirmDelete = () => {
    if (!deleteId) return
    const remaining = cards.filter((card) => card.id !== deleteId)
    const nextCard = remaining.find((card) => card.lessonId === selectedLessonId)
    setCards(remaining); setSelectedId(nextCard?.id ?? null); setDeleteId(null); setFace(0); setToast('Đã xóa thẻ')
    if (user) void deleteCloudCard(deleteId).catch(() => setToast('Không thể xóa thẻ trên máy chủ'))
  }
  const importFile = async (file: File) => {
    try {
      const drafts = await parseCardsFile(file)
      const imported = drafts.map((draft) => makeCard(draft, selectedLessonId))
      setCards((current) => [...imported, ...current])
      if (user) imported.forEach((card) => void upsertCloudCard(card).catch(() => setToast('Không thể lưu dữ liệu lên máy chủ')))
      setSelectedId(imported[0]?.id ?? selectedId)
      setToast(`Đã nhập ${imported.length} thẻ`)
    } catch (error) {
      setToast(error instanceof Error ? error.message : 'Không thể đọc tệp JSON')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const faceContent = selected ? [selected.kanji, selected.reading || 'Chưa có cách đọc', selected.meaning || 'Chưa có nghĩa', selected.note || 'Chưa có âm Hán-Việt'][face] : ''
  const selectedLesson = lessons.find((lesson) => lesson.id === selectedLessonId) ?? lessons[0]
  const addLesson = () => {
    const title = window.prompt('Tên bài mới (ví dụ: Bài 2)')
    if (!title?.trim()) return
    const lesson: Lesson = { id: crypto.randomUUID(), title: title.trim(), description: 'Bộ từ vựng mới', createdAt: new Date().toISOString() }
    setLessons((current) => [...current, lesson])
    if (user) void upsertCloudLesson(lesson).catch(() => setToast('Không thể lưu bài lên máy chủ'))
    setSelectedLessonId(lesson.id)
    setSelectedId(null)
    setFace(0)
    setToast(`Đã tạo ${lesson.title}`)
  }
  const renameLesson = () => {
    if (!selectedLesson || !user) return
    const title = window.prompt('Tên bài mới', selectedLesson.title)
    if (!title?.trim() || title.trim() === selectedLesson.title) return
    const updated = { ...selectedLesson, title: title.trim() }
    setLessons((current) => current.map((lesson) => lesson.id === updated.id ? updated : lesson))
    void upsertCloudLesson(updated).catch(() => setToast('Không thể đổi tên bài trên máy chủ'))
    setToast('Đã đổi tên bài')
  }
  const confirmDeleteLesson = () => {
    if (!deleteLessonId || lessons.length <= 1) return
    const remainingLessons = lessons.filter((lesson) => lesson.id !== deleteLessonId)
    const remainingCards = cards.filter((card) => card.lessonId !== deleteLessonId)
    const nextLesson = remainingLessons[0]
    setLessons(remainingLessons)
    setCards(remainingCards)
    setSelectedLessonId(nextLesson.id)
    setSelectedId(remainingCards.find((card) => card.lessonId === nextLesson.id)?.id ?? null)
    setDeleteLessonId(null)
    setFace(0)
    setToast('Đã xóa bài và các thẻ thuộc bài')
    if (user) void deleteCloudLesson(deleteLessonId).catch(() => setToast('Không thể xóa bài trên máy chủ'))
  }

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900 transition-colors dark:bg-[#10131b] dark:text-slate-100">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-[#151923]/90">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-5 py-4 lg:px-10">
          <div className="flex items-center gap-3"><div className="brand-mark"><BookOpen size={22} /></div><div><h1 className="font-display text-xl font-bold tracking-tight">Kotoba</h1><p className="hidden text-[11px] font-medium uppercase tracking-[.18em] text-slate-400 sm:block">Japanese flashcards</p></div></div>
          <div className="flex items-center gap-2"><button className="icon-btn" aria-label="Đổi giao diện" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button><button className="secondary-btn hidden sm:flex" onClick={() => exportCards(cards)}><Download size={16} /> Xuất dữ liệu</button>{isCloudConfigured && (user ? <button className="secondary-btn" onClick={() => void supabase?.auth.signOut()}><LogOut size={16} /> <span className="hidden sm:inline">Thoát admin</span></button> : <button className="secondary-btn" onClick={() => setLoginOpen(true)}><LogIn size={16} /> <span className="hidden sm:inline">Đăng nhập admin</span></button>)}{user && <button className="primary-btn" onClick={() => { setEditing(null); setModal('add') }}><Plus size={17} /> <span className="hidden sm:inline">Thêm thẻ</span></button>}</div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-5 py-8 lg:px-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">BỘ THẺ CỦA BẠN</p><h2 className="mt-1 font-display text-3xl font-bold tracking-tight">Học mỗi ngày, nhớ lâu hơn.</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Tập trung vào từng từ, từng bước một.</p></div><div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400"><Layers size={17} className="text-teal-500" /> {cards.filter((card) => card.lessonId === selectedLessonId).length} thẻ trong {selectedLesson?.title}</div></div>
        <div className="lesson-bar"><div className="flex min-w-0 items-center gap-3"><BookOpen size={18} className="text-teal-500" /><div className="min-w-0"><p className="eyebrow">DANH SÁCH BÀI HỌC</p><p className="truncate font-display font-bold">{selectedLesson?.title}</p></div></div><div className="lesson-actions"><select className="lesson-select" value={selectedLessonId} onChange={(event) => { setSelectedLessonId(event.target.value); setSelectedId(null); setFace(0) }}>{lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title} ({cards.filter((card) => card.lessonId === lesson.id).length} từ)</option>)}</select>{user && <><button className="lesson-icon-btn" title="Đổi tên bài" aria-label="Đổi tên bài" onClick={renameLesson}><Edit3 size={15} /></button><button className="lesson-icon-btn delete" title="Xóa bài" aria-label="Xóa bài" disabled={lessons.length <= 1} onClick={() => setDeleteLessonId(selectedLessonId)}><Trash2 size={15} /></button><button className="primary-btn" onClick={addLesson}><Plus size={16} /> <span className="hidden sm:inline">Thêm bài</span></button></>}</div></div>
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.3fr)_390px]">
          <section className={studyFullscreen ? 'study-section study-fullscreen' : 'study-section'}>
            <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><span className="eyebrow">CHẾ ĐỘ HỌC</span>{selected && <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-600 dark:bg-teal-900/30 dark:text-teal-300">{selectedIndex + 1} / {visibleCards.length}</span>}</div><div className="flex items-center gap-2"><button className="secondary-btn" onClick={() => setShuffled(!shuffled)}><Shuffle size={15} /> {shuffled ? 'Đã trộn' : 'Trộn thẻ'}</button><button className="secondary-btn" onClick={() => setStudyFullscreen(!studyFullscreen)}>{studyFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}<span className="hidden sm:inline">{studyFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}</span></button></div></div>
            <div className="study-card-wrap">
              {selected ? <button className="study-card" onClick={() => setFace((value) => (value + 1) % 4)} aria-label="Lật thẻ"><div className="card-topline"><span>THẺ {String(selectedIndex + 1).padStart(2, '0')}</span><span>{face + 1} / 4</span></div><div className={`face-content face-${face}`}>{face === 0 && <span className="kanji-display">{faceContent}</span>}{face === 1 && <><span className="face-label">CÁCH ĐỌC</span><span className="reading-display">{faceContent}</span></>}{face === 2 && <><span className="face-label">NGHĨA TIẾNG VIỆT</span><span className="meaning-display">{faceContent}</span></>}{face === 3 && <><span className="face-label">ÂM HÁN-VIỆT</span><span className="note-display">{faceContent}</span></>}</div><div className="card-hint"><Lightbulb size={14} /> Nhấn để lật thẻ</div><div className="face-dots">{faceLabels.map((label, index) => <span key={label} title={label} className={index === face ? 'active' : ''} />)}</div></button> : <div className="empty-study"><BookOpen size={34} /><p>Chưa có thẻ để học</p><button className="primary-btn" onClick={() => setModal('add')}><Plus size={16} /> Thêm thẻ đầu tiên</button></div>}
            </div>
            {selected && <div className="mt-5 flex items-center justify-center gap-3"><button className="nav-btn" onClick={() => move(-1)}><ArrowLeft size={17} /> Từ trước</button><button className="flip-btn" onClick={() => setFace((value) => (value + 1) % 4)}>Lật thẻ <span>Space</span></button><button className="nav-btn" onClick={() => move(1)}>Từ tiếp theo <ArrowRight size={17} /></button></div>}
            <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#151923]"><h3 className="font-display font-bold">Mẹo học hiệu quả</h3><div className="mt-3 grid gap-3 text-sm text-slate-500 dark:text-slate-400 sm:grid-cols-3"><p><b className="text-slate-700 dark:text-slate-200">⌘ Space</b><br />Lật thẻ nhanh</p><p><b className="text-slate-700 dark:text-slate-200">← →</b><br />Di chuyển giữa các từ</p><p><b className="text-slate-700 dark:text-slate-200">4 mặt</b><br />Học đủ ngữ cảnh</p></div></div>
          </section>
          <aside className="min-w-0"><div className="mb-4 flex items-center justify-between"><div><p className="eyebrow">THƯ VIỆN TỪ VỰNG</p><h3 className="mt-1 font-display text-xl font-bold">Tất cả từ</h3></div><span className="text-sm text-slate-400">{visibleCards.length} kết quả</span></div><div className="search-box"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm Kanji, cách đọc, nghĩa..." />{query && <button onClick={() => setQuery('')}><X size={15} /></button>}</div><div className="mt-3 flex items-center gap-2"><select className="filter-select" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">Tất cả thẻ</option><option value="hasReading">Có cách đọc</option><option value="hasNote">Có âm Hán-Việt</option></select><button className="import-btn" onClick={() => fileRef.current?.click()}><Upload size={15} /> Nhập JSON</button><input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(event) => event.target.files?.[0] && importFile(event.target.files[0])} /></div><div className="card-list mt-4">{visibleCards.length ? visibleCards.map((card) => <div key={card.id} className={`list-row ${card.id === selected?.id ? 'selected' : ''}`} onClick={() => selectCard(card.id)}><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><strong className="text-lg">{card.kanji}</strong>{card.id === selected?.id && <Check size={14} className="text-teal-500" />}</div><p className="mt-0.5 text-sm text-slate-400">{card.reading || 'Chưa có cách đọc'} <span className="mx-1">·</span> {card.meaning || 'Chưa có nghĩa'}</p></div><div className="row-actions"><button aria-label="Chỉnh sửa" onClick={(event) => { event.stopPropagation(); setEditing(card); setModal('edit') }}><Edit3 size={15} /></button><button aria-label="Xóa" onClick={(event) => { event.stopPropagation(); setDeleteId(card.id) }}><Trash2 size={15} /></button></div></div>) : <div className="empty-list"><BookOpen size={28} /><p className="font-semibold">Chưa tìm thấy thẻ nào</p><p className="text-sm">Thử từ khóa khác hoặc thêm một thẻ mới.</p></div>}</div></aside>
        </div>
      </main>
      {cloudLoading && <div className="cloud-loading">Đang tải dữ liệu online...</div>}
      {loginOpen && <LoginModal error={authError} onClose={() => { setLoginOpen(false); setAuthError('') }} onLogin={async (email, password) => { if (!supabase) return; const result = await supabase.auth.signInWithPassword({ email, password }); if (result.error) setAuthError('Email hoặc mật khẩu không đúng.'); else { setLoginOpen(false); setAuthError('') } }} />}
      {modal && user && <FlashcardModal mode={modal} initial={editing ?? emptyDraft} onClose={() => { setModal(null); setEditing(null) }} onSave={saveDraft} />}
      {deleteId && <ConfirmModal onCancel={() => setDeleteId(null)} onConfirm={confirmDelete} />}
      {deleteLessonId && <LessonConfirmModal lesson={lessons.find((lesson) => lesson.id === deleteLessonId)} onCancel={() => setDeleteLessonId(null)} onConfirm={confirmDeleteLesson} />}
      {toast && <div className="toast"><Check size={17} /> {toast}</div>}
    </div>
  )
}

function FlashcardModal({ mode, initial, onClose, onSave }: { mode: 'add' | 'edit'; initial: FlashcardDraft | Flashcard; onClose: () => void; onSave: (draft: FlashcardDraft) => void }) {
  const [draft, setDraft] = useState<FlashcardDraft>({ kanji: initial.kanji, reading: initial.reading, meaning: initial.meaning, note: initial.note })
  const [error, setError] = useState('')
  const update = (key: keyof FlashcardDraft, value: string) => setDraft((current) => ({ ...current, [key]: value }))
  const submit = (event: React.FormEvent) => { event.preventDefault(); if (!draft.kanji.trim()) { setError('Vui lòng nhập Kanji hoặc từ tiếng Nhật.'); return } onSave({ ...draft, kanji: draft.kanji.trim() }) }
  return <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><form className="modal" onSubmit={submit}><div className="flex items-start justify-between"><div><p className="eyebrow">{mode === 'add' ? 'THẺ MỚI' : 'CHỈNH SỬA THẺ'}</p><h2 className="mt-1 font-display text-2xl font-bold">{mode === 'add' ? 'Thêm từ vựng' : 'Cập nhật từ vựng'}</h2></div><button type="button" className="icon-btn" onClick={onClose}><X size={18} /></button></div><div className="mt-6 space-y-4"><label>Kanji / từ tiếng Nhật <span>*</span><input autoFocus value={draft.kanji} onChange={(event) => update('kanji', event.target.value)} placeholder="例: 勉強" /></label><label>Cách đọc <input value={draft.reading} onChange={(event) => update('reading', event.target.value)} placeholder="例: べんきょう" /></label><label>Nghĩa tiếng Việt <input value={draft.meaning} onChange={(event) => update('meaning', event.target.value)} placeholder="Ví dụ: Học tập" /></label><label>Âm Hán-Việt <input value={draft.note} onChange={(event) => update('note', event.target.value)} placeholder="Ví dụ: miễn cường" /></label></div>{error && <p className="mt-3 text-sm font-medium text-rose-500">{error}</p>}<div className="mt-7 flex justify-end gap-3"><button type="button" className="nav-btn" onClick={onClose}>Hủy</button><button className="primary-btn" type="submit">{mode === 'add' ? <Plus size={16} /> : <Check size={16} />} {mode === 'add' ? 'Thêm thẻ' : 'Lưu thay đổi'}</button></div></form></div>
}

function ConfirmModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return <div className="modal-backdrop"><div className="modal max-w-md"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-900/20"><Trash2 size={20} /></div><h2 className="mt-4 font-display text-2xl font-bold">Xóa thẻ này?</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Thao tác này không thể hoàn tác. Bạn có chắc muốn xóa thẻ khỏi bộ từ vựng?</p><div className="mt-7 flex justify-end gap-3"><button className="nav-btn" onClick={onCancel}>Hủy</button><button className="danger-btn" onClick={onConfirm}><Trash2 size={16} /> Xóa thẻ</button></div></div></div>
}

function LessonConfirmModal({ lesson, onCancel, onConfirm }: { lesson?: Lesson; onCancel: () => void; onConfirm: () => void }) {
  return <div className="modal-backdrop"><div className="modal max-w-md"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-900/20"><Trash2 size={20} /></div><h2 className="mt-4 font-display text-2xl font-bold">Xóa {lesson?.title ?? 'bài học'}?</h2><p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">Các thẻ thuộc bài này cũng sẽ bị xóa. Thao tác này không thể hoàn tác.</p><div className="mt-7 flex justify-end gap-3"><button className="nav-btn" onClick={onCancel}>Hủy</button><button className="danger-btn" onClick={onConfirm}><Trash2 size={16} /> Xóa bài</button></div></div></div>
}

function LoginModal({ error, onClose, onLogin }: { error: string; onClose: () => void; onLogin: (email: string, password: string) => Promise<void> }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    await onLogin(email, password)
    setLoading(false)
  }
  return <div className="modal-backdrop"><form className="modal max-w-md" onSubmit={submit}><div className="flex items-start justify-between"><div><p className="eyebrow">QUẢN TRỊ</p><h2 className="mt-1 font-display text-2xl font-bold">Đăng nhập admin</h2></div><button type="button" className="icon-btn" onClick={onClose}><X size={18} /></button></div><p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Chỉ admin mới có thể thêm, sửa hoặc xóa từ vựng.</p><div className="mt-6 space-y-4"><label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" /></label><label>Mật khẩu<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" /></label></div>{error && <p className="mt-3 text-sm font-medium text-rose-500">{error}</p>}<div className="mt-7 flex justify-end gap-3"><button type="button" className="nav-btn" onClick={onClose}>Hủy</button><button className="primary-btn" disabled={loading}>{loading ? 'Đang đăng nhập...' : <><LogIn size={16} /> Đăng nhập</>}</button></div></form></div>
}
