import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLang } from '@/lib/i18n'

/** زر طباعة — يظهر على الشاشة فقط ويطبع الصفحة الحالية كما هي (مع الفلاتر المطبقة) */
export function PrintButton({ label }: { label?: string }) {
  const { t } = useLang()
  return (
    <Button variant="outline" size="sm" className="gap-1.5 print:hidden" onClick={() => window.print()}>
      <Printer className="size-4" /> {label ?? t('common.print')}
    </Button>
  )
}

/** ترويسة التقرير المطبوع — بالشعارين، لا تظهر على الشاشة */
export function PrintHeader() {
  const { lang } = useLang()
  const now = new Date()
  const date = now.toLocaleDateString(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB', { dateStyle: 'long' })
  const time = now.toLocaleTimeString(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-GB', { hour: '2-digit', minute: '2-digit' })
  return (
    <div dir="rtl" className="mb-4 hidden border-b-2 border-[#17365d] pb-3 print:block">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <img src="/logos/al-majal.png" alt="MAG" className="h-10 w-auto object-contain" />
          <div>
            <div className="text-xs font-bold text-[#17365d]">{lang === 'ar' ? 'المجال العربي' : 'Al Majal Al Arabi'}</div>
            <div className="text-[10px] text-gray-500">MAG</div>
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-[#17365d]">
            {lang === 'ar' ? 'نظام صيانة مطار القيصومة' : 'Qaisumah Airport Maintenance System'}
          </div>
          <div className="text-[11px] text-gray-500">
            {lang === 'ar' ? 'مطارات الدمام — المجال العربي' : 'Dammam Airports — Al Majal Al Arabi (MAG)'}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-end">
            <div className="text-xs font-bold text-[#17365d]">{lang === 'ar' ? 'مطار القيصومة' : 'Qaisumah Airport'}</div>
            <div className="text-[10px] text-gray-500">Dammam Airports</div>
          </div>
          <img src="/logos/dammam-airports.png" alt="Dammam Airports" className="h-10 w-auto rounded border border-gray-200 object-contain p-0.5" />
        </div>
      </div>
      <div className="mt-2 border-t border-gray-200 pt-1 text-center text-[11px] text-gray-500">
        {lang === 'ar' ? 'تاريخ الطباعة' : 'Printed on'}: {date} — {time}
      </div>
    </div>
  )
}
