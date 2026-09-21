import { Link } from 'react-router'
import { Boxes, Wrench, RefreshCw, AlertTriangle, CheckCircle2, Clock, Banknote, Timer, Pencil } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useStore } from '@/lib/db'
import { useLang } from '@/lib/i18n'
import { fmtDate, fmtDateTime, fmtMoney } from '@/lib/format'
import { DEPTS, deptLabel, isOverdue, localToday } from '@/lib/departments'
import { ReadOnlyBanner } from '@/components/ReadOnly'

const STATUS_COLORS: Record<string, string> = {
  'مكتملة': 'bg-green-100 text-green-800',
  'قيد التنفيذ': 'bg-amber-100 text-amber-800',
  'لم تبدأ': 'bg-slate-100 text-slate-600',
  'متوقفة': 'bg-red-100 text-red-700',
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge className={`${STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-600'}`}>{status}</Badge>
}

export default function Dashboard() {
  const { db, can } = useStore()
  const { t, lang } = useLang()

  const open = (arr: { status: string }[]) => arr.filter((x) => x.status !== 'مكتملة').length
  const overduePm = db.pmOrders.filter((o) => isOverdue(o.due, o.status))
  const cost =
    db.pmOrders.reduce((s, o) => s + (o.cost || 0), 0) + db.cmOrders.reduce((s, o) => s + (o.cost || 0), 0)
  const down = db.cmOrders.reduce((s, o) => s + (o.downTime || 0), 0)
  const done =
    db.pmOrders.filter((o) => o.status === 'مكتملة').length +
    db.cmOrders.filter((o) => o.status === 'مكتملة').length

  const kpis = [
    { label: t('mt.assetsTotal'), value: db.assets.length, icon: Boxes, to: '/assets' },
    { label: t('mt.ordersTotal'), value: db.pmOrders.length + db.cmOrders.length, icon: Wrench, to: '/pm' },
    { label: t('mt.open'), value: open(db.pmOrders) + open(db.cmOrders), icon: Clock, to: '/pm', warn: open(db.pmOrders) + open(db.cmOrders) > 0 },
    { label: t('mt.overdue'), value: overduePm.length, icon: AlertTriangle, to: '/pm', bad: overduePm.length > 0 },
    { label: t('mt.completed'), value: done, icon: CheckCircle2, to: '/pm' },
    { label: t('mt.costTotal'), value: fmtMoney(cost), icon: Banknote, to: '/cm' },
    { label: t('mt.downHours'), value: down, icon: Timer, to: '/cm' },
  ]

  /* أوامر حسب الحالة (دورية + تصحيحية) */
  const statusCount = (s: string) =>
    db.pmOrders.filter((o) => o.status === s).length + db.cmOrders.filter((o) => o.status === s).length
  const maxStatus = Math.max(1, ...['مكتملة', 'قيد التنفيذ', 'لم تبدأ', 'متوقفة'].map(statusCount))

  /* أعمال مفتوحة حسب القسم */
  const deptOf = (assetId: string) => db.assets.find((a) => a.id === assetId)?.dept ?? ''
  const openByDept = DEPTS.map((d) => ({
    code: d.code,
    value:
      db.pmOrders.filter((o) => o.status !== 'مكتملة' && deptOf(o.assetId) === d.code).length +
      db.cmOrders.filter((o) => o.status !== 'مكتملة' && deptOf(o.assetId) === d.code).length,
  }))
  const maxDept = Math.max(1, ...openByDept.map((d) => d.value))

  return (
    <div className="space-y-6">
      {!can('canEditOrders') && <ReadOnlyBanner />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{t('dash.title')}</h1>
        <Badge variant="outline" className="text-sm">
          {t('mt.today')}: {fmtDate(localToday())}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, to, warn, bad }) => (
          <Link key={label} to={to}>
            <Card className={`transition-shadow hover:shadow-md ${bad ? 'border-red-300 bg-red-50' : warn ? 'border-amber-300 bg-amber-50' : ''}`}>
              <CardContent className="flex items-center gap-4 p-5">
                <div className={`flex size-11 items-center justify-center rounded-lg ${bad ? 'bg-red-600/10 text-red-600' : warn ? 'bg-amber-500/10 text-amber-600' : 'bg-primary/10 text-primary'}`}>
                  <Icon className="size-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{value}</div>
                  <div className="text-sm text-muted-foreground">{label}</div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <RefreshCw className="size-5 text-primary" />
              {t('mt.byStatus')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {['مكتملة', 'قيد التنفيذ', 'لم تبدأ', 'متوقفة'].map((s) => (
              <div key={s} className="flex items-center gap-3">
                <div className="w-24 shrink-0"><StatusBadge status={s} /></div>
                <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
                  <div className={`h-full ${STATUS_COLORS[s].split(' ')[0]}`} style={{ width: `${(statusCount(s) / maxStatus) * 100}%` }} />
                </div>
                <span className="w-8 text-end text-sm font-bold">{statusCount(s)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wrench className="size-5 text-primary" />
              {t('mt.openByDept')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {openByDept.map((d) => (
              <div key={d.code} className="flex items-center gap-3">
                <div className="w-24 shrink-0 text-xs font-semibold">{deptLabel(d.code, lang)}</div>
                <div className="h-5 flex-1 overflow-hidden rounded bg-muted">
                  <div className="h-full bg-blue-500" style={{ width: `${(d.value / maxDept) * 100}%` }} />
                </div>
                <span className="w-8 text-end text-sm font-bold">{d.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className={overduePm.length > 0 ? 'border-red-300' : ''}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className={`size-5 ${overduePm.length > 0 ? 'text-red-600' : 'text-green-600'}`} />
            {t('mt.overdueList')} ({overduePm.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {overduePm.length === 0 ? (
            <p className="text-sm text-muted-foreground">✅ {t('mt.noOverdue')}</p>
          ) : (
            <ul className="divide-y text-sm">
              {overduePm.map((o) => {
                const asset = db.assets.find((a) => a.id === o.assetId)
                return (
                  <li key={o.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                      <Badge variant="outline">{o.no}</Badge>
                      <span className="min-w-0 break-words">
                        {o.task} — <span className="text-muted-foreground">{asset?.name ?? o.assetId}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">{fmtDate(o.due)}</Badge>
                      <Link to="/pm" className="text-muted-foreground hover:text-foreground" title={t('common.edit')}>
                        <Pencil className="size-4" />
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="size-5 text-primary" />
            {t('nt.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y text-sm">
            {db.notifications.slice(0, 8).map((n) => (
              <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0 break-words">{n.text}</span>
                <span className="text-xs text-muted-foreground">{fmtDateTime(n.at)}</span>
              </li>
            ))}
            {db.notifications.length === 0 && (
              <li className="py-2 text-muted-foreground">{t('nt.empty')}</li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
