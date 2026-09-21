/** تحليل التاريخ: يفهم DD/MM/YYYY و yyyy-mm-dd (ISO) — لا يعتمد على تفسير المتصفح */
function parseAnyDate(s: string): Date | null {
  const dm = s.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (dm) return new Date(Number(dm[3]), Number(dm[2]) - 1, Number(dm[1]))
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

/** تنسيق يدوي بأرقام لاتينية دائماً — toLocaleDateString('ar-SA') تعطي أرقاماً عربية على الجوال */
function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function fmtDate(iso?: string): string {
  if (!iso) return '—'
  const d = parseAnyDate(iso)
  if (!d) return iso
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`
}

export function fmtDateTime(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** لغة الواجهة الحالية — تضبطها شاشة التطبيق الرئيسية عند تبديل اللغة */
let currentLang: 'ar' | 'en' = 'ar'
export function setMoneyLang(l: 'ar' | 'en'): void {
  currentLang = l
}

/** المبالغ بأرقام لاتينية دائماً (مطابقة لملفات الإكسيل) — العملة فقط تتبع اللغة: ر.س / SAR */
export function fmtMoney(n?: number | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—'
  const s = n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return currentLang === 'ar' ? `${s} ر.س` : `${s} SAR`
}

/** المبالغ بالأرقام الإنجليزية دائماً — للمستندات الرسمية الإنجليزية (نموذج MRF) */
export function fmtMoneyEn(n?: number | null): string {
  if (n === undefined || n === null || Number.isNaN(n)) return '—'
  return `${n.toLocaleString('en-US', { maximumFractionDigits: 2 })} SAR`
}

export function fmtSize(bytes: number): string {
  if (bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} بايت`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ك.ب`
  return `${(bytes / 1024 / 1024).toFixed(1)} م.ب`
}
