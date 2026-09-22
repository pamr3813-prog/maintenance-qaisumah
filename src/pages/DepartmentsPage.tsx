import { useNavigate } from 'react-router'
import { Building2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useStore } from '@/lib/db'
import { useLang } from '@/lib/i18n'
import { fmtMoney } from '@/lib/format'
import { DEPTS, deptLabel } from '@/lib/departments'
import { PrintButton } from '@/components/Print'

export default function DepartmentsPage() {
  const { db } = useStore()
  const { t, lang } = useLang()
  const navigate = useNavigate()

  const deptOf = (assetId: string) => db.assets.find((a) => a.id === assetId)?.dept ?? ''

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{t('nav.depts')}</h1>
        <PrintButton />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {DEPTS.map((d) => {
          const assets = db.assets.filter((a) => a.dept === d.code)
          const pm = db.pmOrders.filter((o) => deptOf(o.assetId) === d.code)
          const cm = db.cmOrders.filter((o) => deptOf(o.assetId) === d.code)
          const cost = pm.reduce((s, o) => s + (o.cost || 0), 0) + cm.reduce((s, o) => s + (o.cost || 0), 0)
          const openWork =
            pm.filter((o) => o.status !== 'مكتملة').length + cm.filter((o) => o.status !== 'مكتملة').length
          return (
            <Card
              key={d.code}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => navigate(`/assets?dept=${d.code}`)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="flex items-start gap-2 text-base">
                  <Building2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>
                    {deptLabel(d.code, lang)}
                    <span className="block text-xs font-normal text-muted-foreground">{d.code}</span>
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <Row label={t('mt.deptAssets')} value={assets.length} />
                <Row label={t('mt.deptPm')} value={pm.length} />
                <Row label={t('mt.deptCm')} value={cm.length} />
                <Row label={t('mt.deptCost')} value={fmtMoney(cost)} />
                <Row label={t('mt.deptOpen')} value={openWork} highlight={openWork > 0} />
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b last:border-0 py-1">
      <span className="text-muted-foreground">{label}</span>
      <b className={highlight ? 'text-red-600' : ''}>{value}</b>
    </div>
  )
}
