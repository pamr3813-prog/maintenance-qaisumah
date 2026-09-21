import { Lock } from 'lucide-react'
import { useLang } from '@/lib/i18n'

/** شعار «قراءة فقط» عند غياب صلاحية التعديل */
export function ReadOnlyBanner() {
  const { t } = useLang()
  return (
    <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
      <Lock className="size-4 shrink-0" />
      {t('perm.denied')}
    </div>
  )
}
