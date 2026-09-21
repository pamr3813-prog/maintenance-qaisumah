// الأقسام التشغيلية العشرة — ثوابت مشتركة
export interface Dept {
  code: string
  ar: string
  en: string
}

export const DEPTS: Dept[] = [
  { code: 'CIV', ar: 'الأعمال المدنية والمباني', en: 'Civil & Bldgs' },
  { code: 'WTP', ar: 'محطة المياه', en: 'Water Plant' },
  { code: 'PWP', ar: 'محطة الكهرباء', en: 'Power Plant' },
  { code: 'MTP', ar: 'المركبات', en: 'Motor Pool' },
  { code: 'CEL', ar: 'الاتصالات والإلكترونيات', en: 'Comms & Elec' },
  { code: 'ASR', ar: 'الأسفلت والمدرج', en: 'Asphalt & Runway' },
  { code: 'RLT', ar: 'إنارة المدرج', en: 'Runway Lighting' },
  { code: 'HVC', ar: 'التكييف والتبريد', en: 'HVAC' },
  { code: 'ELE', ar: 'الكهرباء', en: 'Electrical' },
  { code: 'AGR', ar: 'الزراعة', en: 'Agriculture' },
]

export const ZONES = [
  'المبنى الرئيسي للركاب', 'صالة الوصول', 'صالة المغادرة', 'المدرج الرئيسي', 'المدرج الثانوي',
  'ساحة الطائرات', 'مبنى الشحن الجوي', 'برج المراقبة', 'محطة الكهرباء', 'محطة المياه',
  'الورشة المركزية', 'مواقف المركبات', 'المستودعات', 'السور والبوابات', 'المناطق الخضراء',
  'مواقف السيارات', 'مبنى الإطفاء والإنقاذ', 'منطقة الوقود',
]

export const ASSET_STATUS = ['تشغيل', 'خارج الخدمة', 'صيانة', 'احتياطي'] as const
export const CRITICALITY = ['حرج', 'عالي', 'متوسط', 'منخفض'] as const
export const ORDER_STATUS = ['مكتملة', 'قيد التنفيذ', 'لم تبدأ', 'متوقفة'] as const
export const PRIORITY = ['حرجة', 'عالية', 'متوسطة', 'منخفضة'] as const
export const FREQ = ['يومي', 'أسبوعي', 'شهري', 'ربع سنوي', 'نصف سنوي', 'سنوي'] as const

/** اسم القسم حسب لغة الواجهة */
export function deptLabel(code: string, lang: 'ar' | 'en'): string {
  const d = DEPTS.find((x) => x.code === code)
  if (!d) return code
  return lang === 'ar' ? d.ar : d.en
}

/** تاريخ اليوم المحلي بصيغة YYYY-MM-DD — لا يتأخر يوماً كما يحدث مع toISOString (غرينتش) */
export function localToday(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function isOverdue(due: string, status: string): boolean {
  return !!due && due < localToday() && status !== 'مكتملة'
}
