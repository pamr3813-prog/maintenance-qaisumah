import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { toast } from 'sonner'
import type { Db, RoleKey } from '@/types'

// ===== الثوابت =====

export const ROLES: Record<RoleKey, string> = {
  storekeeper: 'أمين المستودع',
  purchasing: 'مسؤول المشتريات',
  siteSupervisor: 'مشرف الموقع',
  logisticsSupervisor: 'المشرف اللوجستي',
  omSuperintendent: 'مدير العمليات والصيانة',
  siteManager: 'مدير الموقع',
  projectManagement: 'إدارة المشروع',
  admin: 'مدير النظام',
}

export const ROLES_EN: Record<RoleKey, string> = {
  storekeeper: 'Storekeeper',
  purchasing: 'Purchasing Officer',
  siteSupervisor: 'Site Supervisor',
  logisticsSupervisor: 'Logistics Supervisor',
  omSuperintendent: 'O&M SUP"V',
  siteManager: 'Site Manager',
  projectManagement: 'Project Management',
  admin: 'System Admin',
}

/** المسمى الوظيفي حسب لغة الواجهة — في الإنجليزية يظهر بالإنجليزية وبالأحرف الكبيرة (SITE MANAGER).
 *  يقبل أيضاً أدواراً مخصصة حرة (مثل "مدير ادارة") فتُعاد كما كُتبت. */
export function roleLabel(role: string, lang: 'ar' | 'en'): string {
  const ar = (ROLES as Record<string, string>)[role]
  const en = (ROLES_EN as Record<string, string>)[role]
  return lang === 'ar' ? (ar ?? role) : en ? en.toUpperCase() : role
}

/** يطابق نصاً مكتوباً بمسمى دور رسمي (عربي أو إنجليزي) ويعيد مفتاحه؛ وإلا يعيد النص كدور مخصص حر */
export function normalizeRole(input: string): string {
  const v = input.trim()
  if (!v) return v
  const hit = (Object.keys(ROLES) as RoleKey[]).find(
    (k) => ROLES[k] === v || ROLES_EN[k].toLowerCase() === v.toLowerCase(),
  )
  return hit ?? v
}

/** مفاتيح ترجمة أسماء الصلاحيات */
export const PERM_LABELS = {
  canEditAssets: 'ad.permAssets',
  canEditOrders: 'ad.permRaiseClose', // رفع البلاغات وإغلاقها
  canViewKPIs: 'ad.permView', // رؤية المؤشرات والأعمال المفتوحة والمغلقة
  canManageUsers: 'ad.permUsers',
} as const

export type PermKey = keyof typeof PERM_LABELS

/** مصفوفة الصلاحيات — تُفرض على الخادم أيضاً */
export const PERMS: Record<string, string[]> = {
  canEditAssets: ['omSuperintendent', 'admin'],
  canEditOrders: ['omSuperintendent', 'siteSupervisor', 'siteManager', 'admin'],
  canViewKPIs: ['storekeeper', 'purchasing', 'siteSupervisor', 'logisticsSupervisor', 'omSuperintendent', 'siteManager', 'projectManagement', 'admin'],
  canManageUsers: ['omSuperintendent', 'admin'],
}

/** رقم إصدار التطبيق — يظهر في الشريط الجانبي للتأكد من وصول آخر تحديث */
export const APP_VERSION = 'v1.7.0'

// ===== أنواع السحابة =====

export interface User {
  id: string
  name: string
  email: string
  /** الدور: إما مفتاح دور رسمي أو مسمى مخصص حر يكتبه المدير */
  role: string
  active: boolean
  /** تجاوزات صلاحيات مخصصة لكل مستخدم — تتجاوز صلاحيات الدور */
  permOverrides?: Record<string, boolean>
  createdAt: string
}

export interface Notification {
  id: string
  text: string
  at: string
  readBy: string[]
}

const EMPTY_DB: Db = {
  assets: [],
  pmOrders: [],
  cmOrders: [],
  counters: { pm: 1001, cm: 2001 },
  users: [],
  notifications: [],
  chat: [],
}

// ===== جلسة HTTP =====

export async function fetchUsers(): Promise<Omit<User, 'pin'>[]> {
  const r = await fetch('/api/users')
  if (!r.ok) throw new Error('users fetch failed')
  return r.json()
}

export async function loginRequest(userId: string, pin: string) {
  const r = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, pin }),
  })
  if (!r.ok) throw new Error('login failed')
  return r.json() as Promise<{ token: string; user: User }>
}

// ===== سياق المتجر السحابي =====

interface StoreValue {
  db: Db
  ready: boolean
  online: boolean
  currentUser: User | null
  login: (userId: string, pin: string) => Promise<void>
  logout: () => void
  can: (perm: PermKey) => boolean
  send: (type: string, payload: unknown) => Promise<unknown>
  myUnread: number
}

const StoreCtx = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<Db>(EMPTY_DB)
  const [ready, setReady] = useState(false)
  const [online, setOnline] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const raw = sessionStorage.getItem('maint-user')
      return raw ? (JSON.parse(raw) as User) : null
    } catch {
      return null
    }
  })
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<number | null>(null)
  const ackRef = useRef<Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void }>>(new Map())
  const pendingRef = useRef<{ type: string; payload: unknown; resolve: (v: unknown) => void; reject: (e: Error) => void }[]>([])
  /* تتبّع الإشعارات المُنبَّه عنها — لإظهار تنبيه منبثق لكل إشعار جديد يصل لحظياً */
  const seenNotifsRef = useRef<Set<string>>(new Set())
  const notifInitRef = useRef(false)

  const flushPending = useCallback(() => {
    const ws = wsRef.current
    if (!ws || ws.readyState !== 1) return
    const queue = pendingRef.current.splice(0)
    for (const item of queue) {
      const actionId = Math.random().toString(36).slice(2)
      ackRef.current.set(actionId, { resolve: item.resolve, reject: item.reject })
      ws.send(JSON.stringify({ type: item.type, payload: item.payload, actionId }))
    }
  }, [])

  const connect = useCallback((token: string) => {
    if (reconnectRef.current) {
      window.clearTimeout(reconnectRef.current)
      reconnectRef.current = null
    }
    const proto = location.protocol === 'https:' ? 'wss' : 'ws'
    const ws = new WebSocket(`${proto}://${location.host}/ws?token=${encodeURIComponent(token)}`)
    wsRef.current = ws

    ws.onopen = () => {
      setOnline(true)
      flushPending()
    }
    ws.onclose = () => {
      setOnline(false)
      wsRef.current = null
      // إعادة اتصال تلقائية عند انقطاع الخادم أو الشبكة
      if (sessionStorage.getItem('maint-token')) {
        reconnectRef.current = window.setTimeout(() => connect(token), 1000)
      }
    }
    ws.onmessage = (ev) => {
      let msg
      try {
        msg = JSON.parse(ev.data)
      } catch {
        return
      }
      if (msg.type === 'state') {
        setDb(msg.db)
        setReady(true)
        /* تنبيه منبثق لكل إشعار جديد — الضغط عليه ينقلك إلى مصدره */
        const list = (msg.db?.notifications ?? []) as { id: string; text: string; link?: string | null }[]
        if (!notifInitRef.current) {
          list.forEach((n) => seenNotifsRef.current.add(n.id))
          notifInitRef.current = true
        } else {
          const fresh = list.filter((n) => !seenNotifsRef.current.has(n.id)).slice(0, 3)
          for (const n of fresh) {
            seenNotifsRef.current.add(n.id)
            const go = n.link ? () => window.location.assign(n.link as string) : undefined
            toast.info(n.text, go ? { action: { label: 'فتح ↗', onClick: go } } : undefined)
          }
        }
      } else if (msg.type === 'ack') {
        const p = msg.actionId && ackRef.current.get(msg.actionId)
        if (p) {
          ackRef.current.delete(msg.actionId)
          p.resolve(msg.result)
        }
      } else if (msg.type === 'error') {
        const p = msg.actionId && ackRef.current.get(msg.actionId)
        if (p) {
          ackRef.current.delete(msg.actionId)
          p.reject(new Error(msg.error))
        }
        toast.error(msg.error)
      }
    }
  }, [])

  useEffect(() => {
    const token = sessionStorage.getItem('maint-token')
    if (token && currentUser) connect(token)
    else setReady(true)
    return () => wsRef.current?.close()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const login = useCallback(
    async (userId: string, pin: string) => {
      const { token, user } = await loginRequest(userId, pin)
      sessionStorage.setItem('maint-token', token)
      sessionStorage.setItem('maint-user', JSON.stringify(user))
      setCurrentUser(user)
      connect(token)
    },
    [connect],
  )

  const logout = useCallback(() => {
    sessionStorage.removeItem('maint-token')
    sessionStorage.removeItem('maint-user')
    if (reconnectRef.current) {
      window.clearTimeout(reconnectRef.current)
      reconnectRef.current = null
    }
    const queue = pendingRef.current.splice(0)
    queue.forEach((item) => item.reject(new Error('تم تسجيل الخروج')))
    wsRef.current?.close()
    setCurrentUser(null)
    setDb(EMPTY_DB)
  }, [])

  const send = useCallback((type: string, payload: unknown) => {
    return new Promise((resolve, reject) => {
      const ws = wsRef.current
      if (ws && ws.readyState === 1) {
        const actionId = Math.random().toString(36).slice(2)
        ackRef.current.set(actionId, { resolve, reject })
        ws.send(JSON.stringify({ type, payload, actionId }))
        return
      }
      // الاتصال مقطوع مؤقتاً — ضع الإجراء في الانتظار حتى يكتمل إعادة الاتصال
      const item = { type, payload, resolve, reject }
      pendingRef.current.push(item)
      window.setTimeout(() => {
        const idx = pendingRef.current.indexOf(item)
        if (idx >= 0) {
          pendingRef.current.splice(idx, 1)
          reject(new Error('غير متصل بالخادم'))
          toast.error('غير متصل بالخادم')
        }
      }, 8000)
    })
  }, [])

  const can = useCallback((perm: PermKey) => {
    if (!currentUser) return false
    const base = (PERMS[perm] ?? []).includes(currentUser.role)
    const o = currentUser.permOverrides?.[perm]
    return o === undefined ? base : !!o
  }, [currentUser])

  const myUnread = useMemo(
    () => (currentUser ? db.notifications.filter((n) => !n.readBy.includes(currentUser.id)).length : 0),
    [db.notifications, currentUser],
  )

  const value = useMemo<StoreValue>(
    () => ({ db, ready, online, currentUser, login, logout, can, send, myUnread }),
    [db, ready, online, currentUser, login, logout, can, send, myUnread],
  )

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreCtx)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}
