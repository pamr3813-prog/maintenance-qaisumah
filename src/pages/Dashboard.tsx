import { Link } from 'react-router'
import { Boxes, Wrench, RefreshCw, AlertTriangle, CheckCircle2, Clock, Banknote, Timer, Pencil } from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
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

const CHART_COLORS = ['#2e75b6', '#e8a33d', '#d9534f', '#3aa655', '#ffd966', '#7a6fbe']

/* آخر 6 أشهر بمسمياتها حسب لغة الواجهة — لمحاور الرسوم البيانية */
function lastMonths(lang: 'ar' | 'en', n = 6) {
  const out: string[] = []
  const d = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1)
    out.push(m.toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', { month: 'short', year: '2-digit' }))
  }
  return out
}

/* بيانات تجريبية ثابتة (مولّدة بصورة حتمية) لأغراض العرض والاختبار */
function demoMonthly(lang: 'ar' | 'en') {
  const months = lastMonths(lang)
  const seed = [4, 7, 5, 9, 6, 8]
  return months.map((m, i) => {
    const s = seed[i % seed.length]
    return {
      month: m,
      pm: 3 + ((s * 2) % 6),
      cm: 2 + ((s * 3) % 5),
      cost: 4000 + s * 950 + i * 380,
      down: 6 + ((s * 4) % 14),
    }
  })
}

const DEMO_PRIO = [
  { name: 'حرجة', value: 4 },
  { name: 'عالية', value: 7 },
  { name: 'متوسطة', value: 9 },
  { name: 'منخفضة', value: 3 },
]

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

  const monthly = demoMonthly(lang)

  const kpis = [
    { label: t('mt.assetsTotal'), value: db.assets.length, icon: Boxes, to: '/assets', color: '#2e75b6' },
    { label: t('mt.ordersTotal'), value: db.pmOrders.length + db.cmOrders.length, icon: Wrench, to: '/pm', color: '#2e75b6' },
    { label: t('mt.open'), value: open(db.pmOrders) + open(db.cmOrders), icon: Clock, to: '/pm', warn: open(db.pmOrders) + open(db.cmOrders) > 0, color: '#e8a33d' },
    { label: t('mt.overdue'), value: overduePm.length, icon: AlertTriangle, to: '/pm', bad: overduePm.length > 0, color: '#d9534f' },
    { label: t('mt.completed'), value: done, icon: CheckCircle2, to: '/pm', color: '#3aa655' },
    { label: t('mt.costTotal'), value: fmtMoney(cost), icon: Banknote, to: '/cm', color: '#ffd966' },
    { label: t('mt.downHours'), value: down, icon: Timer, to: '/cm', color: '#d9534f' },
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

      {/* لافتة الترحيب بالشعارين */}
      <Card className="border-0 bg-gradient-to-l from-[#0d1f3c] via-[#17365d] to-[#1f4e79] text-white shadow">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4 md:p-5">
          <div className="flex items-center gap-3">
            <img
              src="/logos/dammam-airports.png"
              alt="Dammam Airports"
              className="h-12 w-auto rounded bg-white p-1 object-contain md:h-14"
            />
            <div>
              <div className="text-base font-bold leading-tight md:text-lg">{t('dash.welcome')}</div>
              <div className="text-xs text-[#9fc3e8]">{t('dash.welcomeSub')}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-end">
              <div className="text-xs font-semibold text-[#9fc3e8]">MAG</div>
              <div className="text-[11px] text-[#9fc3e8]">{lang === 'ar' ? 'المجال العربي' : 'Al Majal Al Arabi'}</div>
            </div>
            <img src="/logos/al-majal.png" alt="MAG — Al Majal Al Arabi" className="h-10 w-auto object-contain md:h-12" />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map(({ label, value, icon: Icon, to, color, bad }) => (
          <Link key={label} to={to}>
            <Card
              className="border-t-4 shadow transition-shadow hover:shadow-lg"
              style={{ borderTopColor: bad ? '#c0504d' : color }}
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div
                  className="flex size-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${bad ? '#c0504d' : color}1A`, color: bad ? '#c0504d' : color }}
                >
                  <Icon className="size-6" />
                </div>
                <div>
                  <div className="text-3xl font-bold" style={{ color: bad ? '#c0504d' : '#17365d' }}>{value}</div>
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

      {/* الرسوم البيانية — بيانات تجريبية للعرض */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-lg font-bold text-[#17365d]">{t('dash.chartsSection')}</h2>
          <Badge className="bg-[#ffd966] text-[#17365d] hover:bg-[#ffd966]">{t('dash.demoBadge')}</Badge>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('dash.monthlyCompleted')}</CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5ecf5" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="pm" name="PM" stackId="a" fill="#2e75b6" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="cm" name="CM" stackId="a" fill="#e8a33d" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('dash.monthlyCost')}</CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5ecf5" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="cost" stroke="#3aa655" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('dash.prioDist')}</CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={DEMO_PRIO} dataKey="value" nameKey="name" innerRadius={42} outerRadius={70} paddingAngle={3}>
                    {DEMO_PRIO.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
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
