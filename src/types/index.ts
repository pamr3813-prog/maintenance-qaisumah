// ===== أنواع نظام الصيانة =====

export type RoleKey =
  | 'storekeeper'
  | 'purchasing'
  | 'siteSupervisor'
  | 'logisticsSupervisor'
  | 'omSuperintendent' // مدير العمليات والصيانة
  | 'siteManager'
  | 'projectManagement'
  | 'admin'

export type AssetStatus = 'تشغيل' | 'خارج الخدمة' | 'صيانة' | 'احتياطي'
export type Criticality = 'حرج' | 'عالي' | 'متوسط' | 'منخفض'
export type OrderStatus = 'مكتملة' | 'قيد التنفيذ' | 'لم تبدأ' | 'متوقفة'
export type Priority = 'حرجة' | 'عالية' | 'متوسطة' | 'منخفضة'
export type Frequency = 'يومي' | 'أسبوعي' | 'شهري' | 'ربع سنوي' | 'نصف سنوي' | 'سنوي'

export interface Asset {
  id: string
  assetNo: string
  dept: string // كود القسم من DEPTS
  name: string
  location: string
  category: string
  installDate: string
  criticality: Criticality
  status: AssetStatus
  createdBy: string
  createdAt: string
}

export interface PmOrder {
  id: string
  no: string
  date: string
  assetId: string
  task: string
  freq: Frequency
  techId: string | null
  techName: string
  status: OrderStatus
  cost: number
  due: string // تاريخ الاستحقاق القادم
  createdBy: string
  createdAt: string
  completedAt?: string
}

export interface OrderPhoto {
  id: string
  kind: 'before' | 'after' // صور العطل قبل الصيانة / بعد الإنجاز
  dataUrl: string
  name: string
  at: string
  by: string
}

export interface CmOrder {
  id: string
  no: string
  date: string
  assetId: string
  fault: string
  priority: Priority
  techId: string | null
  techName: string
  status: OrderStatus
  downTime: number // ساعات التوقف
  cost: number
  photos?: OrderPhoto[]
  createdBy: string
  createdAt: string
  completedAt?: string
}

export interface User {
  id: string
  name: string
  email: string
  /** الدور: مفتاح دور رسمي أو مسمى مخصص حر يكتبه المدير */
  role: string
  active: boolean
  permOverrides?: Record<string, boolean>
  createdAt: string
}

export interface Notification {
  id: string
  text: string
  link?: string | null
  at: string
  readBy: string[]
}

export interface Db {
  assets: Asset[]
  pmOrders: PmOrder[]
  cmOrders: CmOrder[]
  counters: { pm: number; cm: number }
  users: User[]
  notifications: Notification[]
}
