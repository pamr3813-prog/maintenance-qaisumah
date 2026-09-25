import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { Send, ImagePlus, X, Trash2, MessagesSquare } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useStore } from '@/lib/db'
import { useLang } from '@/lib/i18n'
import { fmtDateTime } from '@/lib/format'

/* ضغط الصور قبل الإرسال: أقصى بُعد 1280 بكسل بصيغة JPEG */
async function fileToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', 0.72)
}

/* تحويل أرقام البلاغات داخل النص إلى روابط مباشرة (CM-2001 → /cm?q=CM-2001) */
function renderText(text: string) {
  const parts = text.split(/(\b(?:CM|PM)-\d+\b)/g)
  return parts.map((p, i) =>
    /^\b(CM|PM)-\d+$/.test(p) ? (
      <Link key={i} to={`/${p.startsWith('CM') ? 'cm' : 'pm'}?q=${encodeURIComponent(p)}`} className="font-bold text-primary underline underline-offset-2">
        {p}
      </Link>
    ) : (
      <span key={i}>{p}</span>
    ),
  )
}

const AVATAR_COLORS = ['#2e75b6', '#3aa655', '#e8a33d', '#7a6fbe', '#d9534f', '#0d9488']
const colorOf = (name: string) => AVATAR_COLORS[[...name].reduce((s, c) => s + c.charCodeAt(0), 0) % AVATAR_COLORS.length]

export default function ChatPage() {
  const { db, send, currentUser } = useStore()
  const { t, lang } = useLang()
  const [text, setText] = useState('')
  const [photo, setPhoto] = useState<{ dataUrl: string; name: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [db.chat.length])

  async function handleFile(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) return
    try {
      const dataUrl = await fileToDataUrl(file)
      setPhoto({ dataUrl, name: file.name })
    } catch {
      toast.error('تعذر قراءة الصورة')
    }
  }

  async function submit() {
    const body = text.trim()
    if (!body && !photo) return
    setBusy(true)
    try {
      await send('sendChat', { text: body, photo })
      setText('')
      setPhoto(null)
    } catch { /* رسالة الخطأ تظهر تلقائياً */ }
    finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-[calc(100dvh-9rem)] flex-col gap-3 md:h-[calc(100dvh-7rem)]">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <MessagesSquare className="size-6 text-primary" />
          {t('chat.title')}
        </h1>
        <p className="text-xs text-muted-foreground">{t('chat.subtitle')}</p>
      </div>

      <Card className="flex min-h-0 flex-1 flex-col">
        <CardHeader className="border-b py-3">
          <CardTitle className="text-sm text-muted-foreground">
            {db.chat.length} {lang === 'ar' ? 'رسالة' : 'messages'}
          </CardTitle>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 overflow-y-auto p-4">
          {db.chat.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">{t('chat.empty')}</p>
          )}
          <div className="space-y-4">
            {db.chat.map((m) => {
              const mine = m.userId === currentUser?.id
              return (
                <div key={m.id} className={`flex gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
                  <div
                    className="flex size-9 shrink-0 select-none items-center justify-center rounded-full text-sm font-bold text-white"
                    style={{ backgroundColor: colorOf(m.userName) }}
                  >
                    {m.userName.trim().charAt(0)}
                  </div>
                  <div className={`max-w-[80%] md:max-w-[65%] ${mine ? 'text-end' : ''}`}>
                    <div className={`mb-1 flex items-center gap-2 text-xs text-muted-foreground ${mine ? 'justify-end' : ''}`}>
                      <span className="font-semibold text-foreground">{m.userName}</span>
                      <span>{fmtDateTime(m.at)}</span>
                      {(mine || currentUser?.role === 'admin') && (
                        <button
                          type="button"
                          title={t('chat.delete')}
                          className="text-muted-foreground hover:text-destructive"
                          onClick={async () => {
                            try {
                              await send('deleteChat', { id: m.id })
                            } catch { /* رسالة الخطأ تظهر تلقائياً */ }
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      )}
                    </div>
                    {(m.text || !m.photo) && (
                      <div className={`inline-block whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-sm shadow-sm ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        {renderText(m.text)}
                      </div>
                    )}
                    {m.photo && (
                      <a href={m.photo.dataUrl} target="_blank" rel="noreferrer" title={m.photo.name}>
                        <img src={m.photo.dataUrl} alt={m.photo.name} className="mt-1.5 max-h-64 rounded-xl border object-contain" />
                      </a>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          <div ref={bottomRef} />
        </CardContent>

        {/* منطقة الإدخال */}
        <div className="border-t p-3">
          {photo && (
            <div className="mb-2 flex items-center gap-2">
              <img src={photo.dataUrl} alt={photo.name} className="h-14 rounded-md border object-cover" />
              <button type="button" onClick={() => setPhoto(null)} className="text-muted-foreground hover:text-destructive" title={t('common.delete')}>
                <X className="size-4" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void handleFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <Button type="button" variant="outline" size="icon" onClick={() => inputRef.current?.click()} title={t('chat.attach')}>
              <ImagePlus className="size-5" />
            </Button>
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  void submit()
                }
              }}
              placeholder={t('chat.placeholder')}
              className="flex-1"
            />
            <Button onClick={() => void submit()} disabled={busy || (!text.trim() && !photo)}>
              <Send className="me-1.5 size-4" />
              {t('chat.send')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
