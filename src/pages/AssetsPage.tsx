import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useStore } from '@/lib/db'
import { useLang } from '@/lib/i18n'
import { fmtDate } from '@/lib/format'
import { ASSET_STATUS, CRITICALITY, DEPTS, ZONES, deptLabel } from '@/lib/departments'
import { SearchableSelect } from '@/components/SearchableSelect'
import { ReadOnlyBanner } from '@/components/ReadOnly'
import { PrintButton } from '@/components/Print'
import type { Asset } from '@/types'

const CRIT_STYLE: Record<string, string> = {
  'حرج': 'bg-red-100 text-red-700',
  'عالي': 'bg-orange-100 text-orange-700',
  'متوسط': 'bg-blue-100 text-blue-700',
  'منخفض': 'bg-slate-100 text-slate-600',
}

export default function AssetsPage() {
  const { db, send, can } = useStore()
  const { t, lang } = useLang()
  const [params] = useSearchParams()
  const [dept, setDept] = useState(params.get('dept') ?? '')
  const [q, setQ] = useState('')
  const editable = can('canEditAssets')

  const ql = q.trim().toLowerCase()
  const filtered = useMemo(
    () =>
      db.assets
        .filter((a) => !dept || a.dept === dept)
        .filter(
          (a) =>
            !ql ||
            a.assetNo.toLowerCase().includes(ql) ||
            a.name.toLowerCase().includes(ql) ||
            a.location.toLowerCase().includes(ql) ||
            a.category.toLowerCase().includes(ql),
        ),
    [db.assets, dept, ql],
  )

  return (
    <div className="space-y-4">
      {!editable && <ReadOnlyBanner />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t('nav.assets')}</h1>
          <p className="text-xs text-muted-foreground">{filtered.length} / {db.assets.length}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
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
          {editable && <AssetDialog send={send} />}
          <PrintButton />
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('mt.assetNo')}</TableHead>
              <TableHead>{t('mt.dept')}</TableHead>
              <TableHead>{t('mt.assetName')}</TableHead>
              <TableHead>{t('mt.location')}</TableHead>
              <TableHead>{t('mt.category')}</TableHead>
              <TableHead>{t('mt.installDate')}</TableHead>
              <TableHead>{t('mt.criticality')}</TableHead>
              <TableHead>{t('mt.status')}</TableHead>
              <TableHead className="w-24"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-bold">{a.assetNo}</TableCell>
                <TableCell><Badge variant="secondary">{deptLabel(a.dept, lang)}</Badge></TableCell>
                <TableCell className="max-w-72 whitespace-normal break-words">{a.name}</TableCell>
                <TableCell className="whitespace-normal break-words text-muted-foreground">{a.location}</TableCell>
                <TableCell>{a.category}</TableCell>
                <TableCell className="text-muted-foreground">{a.installDate ? fmtDate(a.installDate) : '—'}</TableCell>
                <TableCell><Badge className={CRIT_STYLE[a.criticality] ?? ''}>{a.criticality}</Badge></TableCell>
                <TableCell>
                  <Badge variant={a.status === 'تشغيل' ? 'default' : a.status === 'خارج الخدمة' ? 'destructive' : 'outline'}>
                    {a.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {editable && (
                    <div className="flex items-center">
                      <AssetDialog send={send} initial={a} />
                      <Button
                        variant="ghost"
                        size="icon"
                        title={t('common.delete')}
                        onClick={async () => {
                          if (!window.confirm(`${t('common.confirmDelete')}\n${a.assetNo} — ${a.name}`)) return
                          try {
                            await send('deleteAsset', { id: a.id })
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
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">{t('mt.noAssets')}</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function AssetDialog({
  send,
  initial,
}: {
  send: (type: string, payload: unknown) => Promise<unknown>
  initial?: Asset
}) {
  const { t, lang } = useLang()
  const [open, setOpen] = useState(false)
  const [assetNo, setAssetNo] = useState(initial?.assetNo ?? '')
  const [dept, setDept] = useState(initial?.dept ?? 'CIV')
  const [name, setName] = useState(initial?.name ?? '')
  const [location, setLocation] = useState(initial?.location ?? '')
  const [category, setCategory] = useState(initial?.category ?? '')
  const [installDate, setInstallDate] = useState(initial?.installDate ?? '')
  const [criticality, setCriticality] = useState<string>(initial?.criticality ?? 'متوسط')
  const [status, setStatus] = useState<string>(initial?.status ?? 'تشغيل')

  function submit() {
    if (!assetNo.trim() || !name.trim()) return
    void send('upsertAsset', {
      id: initial?.id,
      assetNo: assetNo.trim(),
      dept,
      name: name.trim(),
      location: location.trim(),
      category: category.trim(),
      installDate,
      criticality,
      status,
    })
    setOpen(false)
    if (!initial) {
      setAssetNo(''); setName(''); setLocation(''); setCategory(''); setInstallDate('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {initial ? (
          <Button variant="ghost" size="icon" title={t('common.edit')}>
            <Pencil className="size-4 text-primary" />
          </Button>
        ) : (
          <Button><Plus className="me-2 size-4" /> {t('mt.addAsset')}</Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? `${t('mt.editAsset')} — ${initial.assetNo}` : t('mt.newAsset')}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-3 py-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>{t('mt.assetNo')} *</Label>
            <Input value={assetNo} onChange={(e) => setAssetNo(e.target.value)} placeholder="WTR-001" />
          </div>
          <div className="space-y-1.5">
            <Label>{t('mt.dept')} *</Label>
            <SearchableSelect
              options={DEPTS.map((d) => ({ value: d.code, label: deptLabel(d.code, lang) }))}
              value={dept}
              onChange={setDept}
              clearable={false}
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>{t('mt.assetName')} *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('mt.location')}</Label>
            <SearchableSelect
              options={ZONES.map((z) => ({ value: z, label: z }))}
              value={location}
              onChange={setLocation}
              placeholder="—"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('mt.category')}</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder={lang === 'ar' ? 'مضخات / مولدات…' : 'Pumps / Generators…'} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('mt.installDate')}</Label>
            <Input type="date" value={installDate} onChange={(e) => setInstallDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t('mt.criticality')}</Label>
            <SearchableSelect
              options={CRITICALITY.map((c) => ({ value: c, label: c }))}
              value={criticality}
              onChange={setCriticality}
              clearable={false}
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>{t('mt.status')}</Label>
            <SearchableSelect
              options={ASSET_STATUS.map((s) => ({ value: s, label: s }))}
              value={status}
              onChange={setStatus}
              clearable={false}
            />
          </div>
        </div>
        <Button className="w-full" onClick={submit}>{t('common.save')}</Button>
      </DialogContent>
    </Dialog>
  )
}
