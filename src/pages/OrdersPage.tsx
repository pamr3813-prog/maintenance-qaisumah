import { useMemo, useRef, useState } from 'react'
import { Plus, Pencil, Trash2, Camera, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useStore } from '@/lib/db'
import { useLang } from '@/lib/i18n'
import { fmtDate, fmtMoney } from '@/lib/format'
import { DEPTS, FREQ, ORDER_STATUS, PRIORITY, deptLabel, isOverdue, localToday } from '@/lib/departments'
import { SearchableSelect } from '@/components/SearchableSelect'
import { ReadOnlyBanner } from '@/components/ReadOnly'
import type { CmOrder, OrderPhoto, OrderStatus, PmOrder } from '@/types'

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

function PhotoThumb({ p, onRemove }: { p: OrderPhoto; onRemove?: () => void }) {
  return (
    <div className="group relative size-16 overflow-hidden rounded-md border">
      <img src={p.dataUrl} alt={p.name} className="size-full object-cover" />
      <span className={`absolute start-0 top-0 px-1 text-[9px] font-bold text-white ${p.kind === 'after' ? 'bg-green-600' : 'bg-red-600'}`}>
        {p.kind === 'after' ? '✔' : '⚠'}
      </span>
      {onRemove && (
        <button
          type="button"
          title="حذف"
          onClick={onRemove}
          className="absolute end-0 top-0 hidden rounded-bl bg-black/60 p-0.5 text-white group-hover:block"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  )
}

function PhotoUploader({
  kind,
  photos,
  onAdd,
  onRemove,
  disabled,
}: {
  kind: 'before' | 'after'
  photos: OrderPhoto[]
  onAdd: (list: OrderPhoto[]) => void
  onRemove: (id: string) => void
  disabled?: boolean
}) {
  const { t } = useLang()
  const inputRef = useRef<HTMLInputElement>(null)
  const mine = photos.filter((p) => p.kind === kind)

  async function handleFiles(files: FileList | null) {
    if (!files) return
    const added: OrderPhoto[] = []
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) continue
      const dataUrl = await fileToDataUrl(f)
      added.push({ id: Math.random().toString(36).slice(2), kind, dataUrl, name: f.name, at: new Date().toISOString(), by: '' })
    }
    if (added.length) onAdd(added)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="sm:col-span-2 space-y-1.5">
      <Label className="flex items-center gap-1.5">
        <Camera className="size-3.5 text-primary" />
        {kind === 'before' ? t('mt.photosBefore') : t('mt.photosAfter')}
      </Label>
      <div className="flex flex-wrap items-center gap-2">
        {mine.map((p) => (
          <PhotoThumb key={p.id} p={p} onRemove={disabled ? undefined : () => onRemove(p.id)} />
        ))}
        {!disabled && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex size-16 flex-col items-center justify-center gap-0.5 rounded-md border-2 border-dashed text-muted-foreground hover:border-primary hover:text-primary"
            title={t('mt.addPhoto')}
          >
            <Camera className="size-5" />
            <span className="text-[9px]">{t('mt.addPhoto')}</span>
          </button>
        )}
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => void handleFiles(e.target.files)} />
      </div>
      {!disabled && <p className="text-[11px] text-muted-foreground">{t('mt.photoHint')}</p>}
    </div>
  )
}

type Kind = 'pm' | 'cm'

const PRIO_STYLE: Record<string, string> = {
  'حرجة': 'bg-red-600 text-white',
  'عالية': 'bg-orange-100 text-orange-700',
  'متوسطة': 'bg-blue-100 text-blue-700',
  'منخفضة': 'bg-slate-100 text-slate-600',
}

export default function OrdersPage({ kind }: { kind: Kind }) {
  const { db, send, can, currentUser } = useStore()
  const { t, lang } = useLang()
  const [dept, setDept] = useState('')
  const [q, setQ] = useState('')
  const editable = can('canEditOrders')

  const isPm = kind === 'pm'
  const list: (PmOrder | CmOrder)[] = isPm ? db.pmOrders : db.cmOrders

  const deptOf = (assetId: string) => db.assets.find((a) => a.id === assetId)?.dept ?? ''
  const ql = q.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      list
        .filter((o) => !dept || deptOf(o.assetId) === dept)
        .filter((o) => {
          if (!ql) return true
          const asset = db.assets.find((a) => a.id === o.assetId)
          return (
            o.no.toLowerCase().includes(ql) ||
            ('task' in o && o.task.toLowerCase().includes(ql)) ||
            ('fault' in o && o.fault.toLowerCase().includes(ql)) ||
            (o.techName ?? '').toLowerCase().includes(ql) ||
            (asset?.name ?? '').toLowerCase().includes(ql) ||
            (asset?.assetNo ?? '').toLowerCase().includes(ql)
          )
        }),
    [list, dept, ql, db.assets],
  )

  return (
    <div className="space-y-4">
      {!editable && <ReadOnlyBanner />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{isPm ? t('nav.pm') : t('nav.cm')}</h1>
          <p className="text-xs text-muted-foreground">{filtered.length} / {list.length}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('common.search')} className="w-44 md:w-56" />
          <SearchableSelect
            className="w-56"
            options={[
              { value: '', label: `${t('mt.filterDept')}: ${t('common.all')}` },
              ...DEPTS.map((d) => ({ value: d.code, label: deptLabel(d.code, lang) })),
            ]}
            value={dept}
            onChange={setDept}
            clearable={false}
          />
          {editable && <OrderDialog kind={kind} db={db} send={send} currentUserName={currentUser?.name ?? ''} />}
        </div>
      </div>

      {isPm && (
        <p className="text-xs text-muted-foreground">⚠️ {t('mt.overdueHint')}</p>
      )}

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('mt.orderNo')}</TableHead>
              <TableHead>{t('common.date')}</TableHead>
              <TableHead>{t('mt.assetNo')}</TableHead>
              <TableHead>{t('mt.dept')}</TableHead>
              <TableHead>{isPm ? t('mt.task') : t('mt.fault')}</TableHead>
              {!isPm && <TableHead>{t('mt.priority')}</TableHead>}
              {isPm && <TableHead>{t('mt.freq')}</TableHead>}
              <TableHead>{t('mt.tech')}</TableHead>
              <TableHead>{t('mt.status')}</TableHead>
              <TableHead className="text-center">{isPm ? t('mt.due') : t('mt.downHours')}</TableHead>
              <TableHead className="text-center">{t('mt.deptCost')}</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((o) => {
              const asset = db.assets.find((a) => a.id === o.assetId)
              const od = isPm && isOverdue((o as PmOrder).due, o.status)
              return (
                <TableRow key={o.id} className={od ? 'bg-red-50' : ''}>
                  <TableCell className="font-bold">{o.no}</TableCell>
                  <TableCell className="text-muted-foreground">{o.date ? fmtDate(o.date) : '—'}</TableCell>
                  <TableCell className="whitespace-normal break-all font-mono text-xs">{asset?.assetNo ?? '—'}</TableCell>
                  <TableCell><Badge variant="secondary">{deptLabel(asset?.dept ?? '', lang)}</Badge></TableCell>
                  <TableCell className="max-w-72 whitespace-normal break-words">
                    {'task' in o ? o.task : o.fault}
                    {!isPm && (o as CmOrder).photos?.length ? (
                      <span className="mt-1.5 flex flex-wrap gap-1">
                        {(o as CmOrder).photos!.map((p) => (
                          <a key={p.id} href={p.dataUrl} target="_blank" rel="noreferrer" title={p.name}>
                            <img src={p.dataUrl} alt={p.name} className="size-10 rounded border object-cover" />
                          </a>
                        ))}
                      </span>
                    ) : null}
                  </TableCell>
                  {!isPm && (
                    <TableCell><Badge className={PRIO_STYLE[(o as CmOrder).priority] ?? ''}>{(o as CmOrder).priority}</Badge></TableCell>
                  )}
                  {isPm && <TableCell>{(o as PmOrder).freq}</TableCell>}
                  <TableCell className="whitespace-normal break-words">{o.techName || '—'}</TableCell>
                  <TableCell>
                    <Badge
                      variant={o.status === 'مكتملة' ? 'default' : o.status === 'متوقفة' ? 'destructive' : 'outline'}
                      className={o.status === 'قيد التنفيذ' ? 'bg-amber-100 text-amber-800' : ''}
                    >
                      {o.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {isPm ? (
                      <span className={od ? 'font-bold text-red-600' : 'text-muted-foreground'}>
                        {(o as PmOrder).due ? fmtDate((o as PmOrder).due) : '—'}{od ? ' ⚠️' : ''}
                      </span>
                    ) : (
                      <span>{(o as CmOrder).downTime}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">{fmtMoney(o.cost)}</TableCell>
                  <TableCell>
                    {editable && (
                      <div className="flex items-center">
                        <OrderDialog kind={kind} db={db} send={send} initial={o} currentUserName={currentUser?.name ?? ''} />
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t('common.delete')}
                          onClick={async () => {
                            if (!window.confirm(`${t('common.confirmDelete')}\n${o.no}`)) return
                            try {
                              await send(isPm ? 'deletePm' : 'deleteCm', { id: o.id })
                              toast.success(t('common.deleted'))
                            } catch { /* رسالة الخطأ تظهر تلقائياً */ }
                          }}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-10 text-center text-muted-foreground">
                  {isPm ? t('mt.noPm') : t('mt.noCm')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function OrderDialog({
  kind,
  db,
  send,
  initial,
  currentUserName,
}: {
  kind: Kind
  db: { assets: { id: string; assetNo: string; name: string }[]; users: { id: string; name: string; active: boolean }[] }
  send: (type: string, payload: unknown) => Promise<unknown>
  initial?: PmOrder | CmOrder
  currentUserName: string
}) {
  const { t } = useLang()
  const isPm = kind === 'pm'
  const [open, setOpen] = useState(false)
  const [date, setDate] = useState(initial?.date ?? localToday())
  const [assetId, setAssetId] = useState(initial?.assetId ?? '')
  const [task, setTask] = useState(isPm && 'task' in (initial ?? {}) ? (initial as PmOrder).task : '')
  const [fault, setFault] = useState(!isPm && 'fault' in (initial ?? {}) ? (initial as CmOrder).fault : '')
  const [freq, setFreq] = useState<string>(isPm ? ((initial as PmOrder)?.freq ?? 'شهري') : 'شهري')
  const [priority, setPriority] = useState<string>(!isPm ? ((initial as CmOrder)?.priority ?? 'متوسطة') : 'متوسطة')
  const [techId, setTechId] = useState(initial?.techId ?? '')
  const [status, setStatus] = useState<OrderStatus>(initial?.status ?? 'لم تبدأ')
  const [cost, setCost] = useState(String(initial?.cost ?? 0))
  const [due, setDue] = useState(isPm ? ((initial as PmOrder)?.due ?? '') : '')
  const [downTime, setDownTime] = useState(!isPm ? String((initial as CmOrder)?.downTime ?? 0) : '0')
  const [photos, setPhotos] = useState<OrderPhoto[]>(!isPm ? ((initial as CmOrder)?.photos ?? []) : [])

  const techUsers = db.users.filter((u) => u.active)
  const techName = techUsers.find((u) => u.id === techId)?.name ?? initial?.techName ?? currentUserName

  function submit() {
    if (!assetId || !(isPm ? task.trim() : fault.trim())) return
    const base = {
      id: initial?.id,
      date,
      assetId,
      techId: techId || null,
      techName,
      status,
      cost: Number(cost) || 0,
    }
    void send(isPm ? 'upsertPm' : 'upsertCm', isPm
      ? { ...base, task: task.trim(), freq, due }
      : { ...base, fault: fault.trim(), priority, downTime: Number(downTime) || 0, photos: photos.map((p) => ({ ...p, by: p.by || currentUserName })) })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {initial ? (
          <Button variant="ghost" size="icon" title={t('common.edit')}>
            <Pencil className="size-4 text-primary" />
          </Button>
        ) : (
          <Button><Plus className="me-2 size-4" /> {isPm ? t('mt.addPm') : t('mt.addCm')}</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initial ? `${t('common.edit')} — ${initial.no}` : isPm ? t('mt.addPm') : t('mt.addCm')}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t('common.date')}</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('mt.assetNo')} *</Label>
            <SearchableSelect
              options={db.assets.map((a) => ({ value: a.id, label: `${a.assetNo} — ${a.name}` }))}
              value={assetId}
              onChange={setAssetId}
              placeholder="—"
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>{isPm ? `${t('mt.task')} *` : `${t('mt.fault')} *`}</Label>
            <Input value={isPm ? task : fault} onChange={(e) => (isPm ? setTask : setFault)(e.target.value)} />
          </div>
          {isPm && (
            <>
              <div className="space-y-1.5">
                <Label>{t('mt.freq')}</Label>
                <SearchableSelect options={FREQ.map((f) => ({ value: f, label: f }))} value={freq} onChange={setFreq} clearable={false} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('mt.due')}</Label>
                <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
              </div>
            </>
          )}
          {!isPm && (
            <>
              <div className="space-y-1.5">
                <Label>{t('mt.priority')}</Label>
                <SearchableSelect options={PRIORITY.map((p) => ({ value: p, label: p }))} value={priority} onChange={setPriority} clearable={false} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('mt.downHours')}</Label>
                <Input type="number" min="0" step="0.5" value={downTime} onChange={(e) => setDownTime(e.target.value)} />
              </div>
            </>
          )}
          <div className="space-y-1.5">
            <Label>{t('mt.tech')}</Label>
            <SearchableSelect
              options={[{ value: '', label: currentUserName || '—' }, ...techUsers.map((u) => ({ value: u.id, label: u.name }))]}
              value={techId}
              onChange={setTechId}
              placeholder={currentUserName || '—'}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('mt.status')}</Label>
            <SearchableSelect
              options={ORDER_STATUS.map((s) => ({ value: s, label: s }))}
              value={status}
              onChange={(v) => setStatus(v as OrderStatus)}
              clearable={false}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('mt.deptCost')} (SAR)</Label>
            <Input type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
          {!isPm && (
            <>
              <PhotoUploader
                kind="before"
                photos={photos}
                onAdd={(add) => setPhotos((prev) => [...prev, ...add])}
                onRemove={(id) => setPhotos((prev) => prev.filter((p) => p.id !== id))}
              />
              <PhotoUploader
                kind="after"
                photos={photos}
                onAdd={(add) => setPhotos((prev) => [...prev, ...add])}
                onRemove={(id) => setPhotos((prev) => prev.filter((p) => p.id !== id))}
              />
            </>
          )}
        </div>
        <Button className="w-full" onClick={submit}>{t('common.save')}</Button>
      </DialogContent>
    </Dialog>
  )
}
