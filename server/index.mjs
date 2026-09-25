// خادم نظام صيانة مطار القيصومة — نفس بنية نظام المستودع: مزامنة لحظية (WebSocket) + صلاحيات + إشعارات
// التشغيل: node server/index.mjs   (المنفذ 7102، ويتم الوصول عبر proxy من خادم Vite على /api و /ws)
import { createServer } from 'http'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { WebSocketServer } from 'ws'
import express from 'express'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || process.env.MAINT_PORT || 7102
const DATA_FILE = join(__dirname, 'data.json')

const uid = () => Math.random().toString(36).slice(2, 10)

/* صور مرفقة ببلاغات الصيانة التصحيحية — تحقق من البنية والحجم */
function sanitizePhotos(input) {
  if (input === undefined || input === null) return undefined
  if (!Array.isArray(input)) throw new Error('صيغة الصور غير صالحة')
  if (input.length > 12) throw new Error('الحد الأقصى 12 صورة لكل بلاغ')
  return input.map((p) => {
    if (!p || typeof p !== 'object') throw new Error('صيغة الصور غير صالحة')
    if (typeof p.dataUrl !== 'string' || !p.dataUrl.startsWith('data:image/')) throw new Error('صيغة الصورة غير صالحة')
    if (p.dataUrl.length > 900_000) throw new Error('حجم الصورة كبير — الحد الأقصى نحو 650 كيلوبايت للصورة')
    return {
      id: typeof p.id === 'string' && p.id ? p.id : uid(),
      kind: p.kind === 'after' ? 'after' : 'before',
      dataUrl: p.dataUrl,
      name: String(p.name ?? '').slice(0, 120),
      at: String(p.at ?? ''),
      by: String(p.by ?? '').slice(0, 80),
    }
  })
}

// ===== الصلاحيات =====
export const PERMS = {
  canEditAssets: ['omSuperintendent', 'admin'], // سجل الأصول
  canEditOrders: ['omSuperintendent', 'siteSupervisor', 'siteManager', 'admin'], // رفع البلاغات وإغلاقها
  canViewKPIs: ['storekeeper', 'purchasing', 'siteSupervisor', 'logisticsSupervisor', 'omSuperintendent', 'siteManager', 'projectManagement', 'admin'], // رؤية المؤشرات والأعمال
  canManageUsers: ['omSuperintendent', 'admin'],
}
const has = (user, perm) => {
  if (!user) return false
  const base = !!PERMS[perm]?.includes(user.role)
  const o = user.permOverrides?.[perm]
  return o === undefined ? base : !!o
}

// ===== البذر =====
function buildSeed() {
  const now = new Date().toISOString()
  const mkUser = (name, email, role, pin) => ({ id: uid(), name, email, role, pin, active: true, createdAt: now })

  const assets = [
    { id: uid(), assetNo: 'CIV-001', dept: 'CIV', name: 'المبنى الرئيسي للركاب', location: 'المبنى الرئيسي للركاب', category: 'مباني', installDate: '2020-03-01', criticality: 'عالي', status: 'تشغيل', createdBy: 'النظام', createdAt: now },
    { id: uid(), assetNo: 'WTP-001', dept: 'WTP', name: 'خزان مياه خرساني 500 م³', location: 'محطة المياه', category: 'خزانات', installDate: '2021-06-15', criticality: 'حرج', status: 'تشغيل', createdBy: 'النظام', createdAt: now },
    { id: uid(), assetNo: 'WTP-002', dept: 'WTP', name: 'طلمبة مياه رئيسية 30 كيلو واط', location: 'محطة المياه', category: 'طلمبات', installDate: '2021-06-15', criticality: 'حرج', status: 'صيانة', createdBy: 'النظام', createdAt: now },
    { id: uid(), assetNo: 'PWP-001', dept: 'PWP', name: 'مولد كهرباء ديزل 500 كيلوفولت', location: 'محطة الكهرباء', category: 'مولدات', installDate: '2019-11-01', criticality: 'حرج', status: 'تشغيل', createdBy: 'النظام', createdAt: now },
    { id: uid(), assetNo: 'PWP-002', dept: 'PWP', name: 'لوحة توزيع رئيسية 1000 أمبير', location: 'محطة الكهرباء', category: 'لوحات كهربائية', installDate: '2019-11-01', criticality: 'عالي', status: 'تشغيل', createdBy: 'النظام', createdAt: now },
    { id: uid(), assetNo: 'HVC-001', dept: 'HVC', name: 'وحدة تكييف مركزية 60 طن', location: 'صالة المغادرة', category: 'تكييف', installDate: '2020-05-20', criticality: 'متوسط', status: 'تشغيل', createdBy: 'النظام', createdAt: now },
    { id: uid(), assetNo: 'ELE-001', dept: 'ELE', name: 'محول كهرباء 1000 كيلوفولت أمبير', location: 'محطة الكهرباء', category: 'محولات', installDate: '2019-10-01', criticality: 'حرج', status: 'تشغيل', createdBy: 'النظام', createdAt: now },
    { id: uid(), assetNo: 'RLT-001', dept: 'RLT', name: 'نظام إنارة المدرج الرئيسي', location: 'المدرج الرئيسي', category: 'إنارة', installDate: '2020-01-10', criticality: 'حرج', status: 'تشغيل', createdBy: 'النظام', createdAt: now },
    { id: uid(), assetNo: 'MTP-001', dept: 'MTP', name: 'رافعة شوكية 3 طن', location: 'الورشة المركزية', category: 'مركبات ومعدات', installDate: '2022-02-01', criticality: 'منخفض', status: 'احتياطي', createdBy: 'النظام', createdAt: now },
    { id: uid(), assetNo: 'CEL-001', dept: 'CEL', name: 'جهاز اتصال لاسلكي للأرضي', location: 'برج المراقبة', category: 'اتصالات', installDate: '2021-01-15', criticality: 'عالي', status: 'تشغيل', createdBy: 'النظام', createdAt: now },
  ]
  const aid = (n) => assets[n].id
  const pm = [
    { id: uid(), no: 'PM-1001', date: '2026-09-10', assetId: aid(1), task: 'تنظيف وتعقيم الخزان وفحص الصمامات', freq: 'شهري', techId: null, techName: 'م. أحمد', status: 'مكتملة', cost: 450, due: '2026-10-10', createdBy: 'النظام', createdAt: now, completedAt: '2026-09-10' },
    { id: uid(), no: 'PM-1002', date: '2026-09-15', assetId: aid(2), task: 'فحص محامل الطلمبة وتغيير الزيت', freq: 'ربع سنوي', techId: null, techName: 'ف. سعد', status: 'قيد التنفيذ', cost: 800, due: '2026-09-25', createdBy: 'النظام', createdAt: now },
    { id: uid(), no: 'PM-1003', date: '2026-08-20', assetId: aid(3), task: 'اختبار تشغيل المولد تحت الحمل', freq: 'شهري', techId: null, techName: 'م. فهد', status: 'مكتملة', cost: 300, due: '2026-09-20', createdBy: 'النظام', createdAt: now, completedAt: '2026-09-20' },
    { id: uid(), no: 'PM-1004', date: '2026-07-01', assetId: aid(5), task: 'تنظيف ملفات التبريد وفحص الفريون', freq: 'نصف سنوي', techId: null, techName: 'ف. خالد', status: 'لم تبدأ', cost: 1200, due: '2026-09-15', createdBy: 'النظام', createdAt: now },
    { id: uid(), no: 'PM-1005', date: '2026-09-01', assetId: aid(6), task: 'فحص عزل المحول وقياس درجة الحرارة', freq: 'ربع سنوي', techId: null, techName: 'م. عبدالله', status: 'مكتملة', cost: 600, due: '2026-12-01', createdBy: 'النظام', createdAt: now, completedAt: '2026-09-05' },
    { id: uid(), no: 'PM-1006', date: '2026-09-18', assetId: aid(7), task: 'اختبار إنارة المدرج الليلي الكامل', freq: 'شهري', techId: null, techName: 'ف. يوسف', status: 'قيد التنفيذ', cost: 250, due: '2026-09-28', createdBy: 'النظام', createdAt: now },
  ]
  const cm = [
    { id: uid(), no: 'CM-2001', date: '2026-09-19', assetId: aid(2), fault: 'تسريب مياه من إسطوانة الطلمبة', priority: 'عالية', techId: null, techName: 'ف. سعد', status: 'قيد التنفيذ', downTime: 6, cost: 900, createdBy: 'النظام', createdAt: now },
    { id: uid(), no: 'CM-2002', date: '2026-09-20', assetId: aid(5), fault: 'توقف ضاغط التكييف عن العمل', priority: 'حرجة', techId: null, techName: 'ف. خالد', status: 'قيد التنفيذ', downTime: 12, cost: 2400, createdBy: 'النظام', createdAt: now },
    { id: uid(), no: 'CM-2003', date: '2026-09-14', assetId: aid(8), fault: 'تآكل إطارات الرافعة الأمامية', priority: 'متوسطة', techId: null, techName: 'ف. عمر', status: 'مكتملة', downTime: 0, cost: 350, createdBy: 'النظام', createdAt: now, completedAt: '2026-09-16' },
    { id: uid(), no: 'CM-2004', date: '2026-09-21', assetId: aid(9), fault: 'ضعف مدى جهاز الاتصال اللاسلكي', priority: 'متوسطة', techId: null, techName: 'ف. ناصر', status: 'لم تبدأ', downTime: 0, cost: 0, createdBy: 'النظام', createdAt: now },
    { id: uid(), no: 'CM-2005', date: '2026-09-08', assetId: aid(3), fault: 'اهتزاز غير طبيعي أثناء التشغيل', priority: 'عالية', techId: null, techName: 'م. فهد', status: 'مكتملة', downTime: 4, cost: 1100, createdBy: 'النظام', createdAt: now, completedAt: '2026-09-12' },
  ]

  return {
    assets,
    pmOrders: pm,
    cmOrders: cm,
    counters: { pm: 1006, cm: 2006 },
    users: [
      mkUser('مدير النظام / System Admin', 'admin@qaisumah-airport.sa', 'admin', '1234'),
      mkUser('مدير العمليات والصيانة / O&M Superintendent', 'om@qaisumah-airport.sa', 'omSuperintendent', '5555'),
      mkUser('مشرف الموقع / Site Supervisor', 'site.supervisor@qaisumah-airport.sa', 'siteSupervisor', '3333'),
      mkUser('مدير الموقع / Site Manager', 'site.manager@qaisumah-airport.sa', 'siteManager', '6666'),
    ],
    notifications: [],
  }
}

// ===== التخزين السحابي (Supabase Storage) — اختياري عبر متغيرات البيئة =====
const SUPA_URL = process.env.SUPABASE_URL
const SUPA_KEY = process.env.SUPABASE_SERVICE_KEY
const SUPA_BUCKET = process.env.SUPABASE_BUCKET || 'maintenance-data'
const CLOUD_MODE = !!(SUPA_URL && SUPA_KEY)

async function cloudUpload(json) {
  const r = await fetch(`${SUPA_URL}/storage/v1/object/${SUPA_BUCKET}/data.json`, {
    method: 'PUT',
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json' },
    body: json,
  })
  if (!r.ok) console.error('Supabase upload failed:', r.status, await r.text().catch(() => ''))
}

async function cloudDownload() {
  const r = await fetch(`${SUPA_URL}/storage/v1/object/${SUPA_BUCKET}/data.json`, {
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` },
  })
  if (r.status === 404) return null
  if (r.status === 400) {
    /* Supabase يرجع 400 NoSuchKey عند غياب الملف بدلاً من 404 */
    const body = await r.text().catch(() => '')
    if (body.includes('NoSuchKey') || body.includes('not_found')) return null
    throw new Error(`Supabase download failed: ${r.status} ${body.slice(0, 200)}`)
  }
  if (!r.ok) throw new Error(`Supabase download failed: ${r.status}`)
  return JSON.parse(await r.text())
}

function loadData() {
  if (existsSync(DATA_FILE)) {
    try { return JSON.parse(readFileSync(DATA_FILE, 'utf-8')) } catch { /* إعادة بذر */ }
  }
  const seed = buildSeed()
  saveData(seed)
  return seed
}

/* حفظ محلي فوري + رفع سحابي متتابع (حفاظاً على الترتيب) */
let cloudChain = Promise.resolve()
function saveData(db) {
  const json = JSON.stringify(db)
  writeFileSync(DATA_FILE, json)
  if (CLOUD_MODE) {
    cloudChain = cloudChain.then(() => cloudUpload(json)).catch((e) => console.error('cloud save:', e.message))
  }
}

async function initData() {
  if (CLOUD_MODE) {
    try {
      const remote = await cloudDownload()
      if (remote) {
        writeFileSync(DATA_FILE, JSON.stringify(remote))
        console.log('Loaded data from Supabase cloud storage')
        return remote
      }
      /* أول تشغيل سحابي: ارفع نسخة البذر المحلية */
      const local = loadData()
      await cloudUpload(JSON.stringify(local))
      return local
    } catch (e) {
      console.error('Cloud load failed, falling back to local:', e.message)
    }
  }
  return loadData()
}

let db = await initData()

// ===== الإشعارات =====
const sessions = new Map() // token -> userId
const wss = new WebSocketServer({ noServer: true })

function notify(text, link) {
  db.notifications.unshift({ id: uid(), text, link: link ?? null, at: new Date().toISOString(), readBy: [] })
  if (db.notifications.length > 100) db.notifications.length = 100
}

function broadcast() {
  const msg = JSON.stringify({ type: 'state', db, at: Date.now() })
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(msg)
  }
}

// ===== معالجة الإجراءات =====
function handleAction(user, type, payload) {
  const now = new Date().toISOString()
  let result = null
  switch (type) {
    case 'upsertAsset': {
      if (!has(user, 'canEditAssets')) throw new Error('غير مصرح — تعديل الأصول لمدير العمليات والصيانة فقط')
      const a = payload
      if (!a.assetNo?.trim() || !a.name?.trim() || !a.dept?.trim()) throw new Error('رقم الأصل والاسم والقسم حقول إلزامية')
      if (a.id) {
        const t = db.assets.find((x) => x.id === a.id)
        if (!t) throw new Error('الأصل غير موجود')
        Object.assign(t, {
          assetNo: a.assetNo.trim(), dept: a.dept.trim(), name: a.name.trim(),
          location: (a.location ?? '').trim(), category: (a.category ?? '').trim(),
          installDate: a.installDate ?? '', criticality: a.criticality ?? 'متوسط', status: a.status ?? 'تشغيل',
        })
        notify(`عدّل ${user.name} بيانات الأصل ${t.assetNo}`, `/assets?q=${encodeURIComponent(t.assetNo)}`)
      } else {
        if (db.assets.some((x) => x.assetNo === a.assetNo.trim())) throw new Error('رقم الأصل مسجل مسبقاً')
        const asset = {
          id: uid(), assetNo: a.assetNo.trim(), dept: a.dept.trim(), name: a.name.trim(),
          location: (a.location ?? '').trim(), category: (a.category ?? '').trim(),
          installDate: a.installDate ?? '', criticality: a.criticality ?? 'متوسط', status: a.status ?? 'تشغيل',
          createdBy: user.name, createdAt: now,
        }
        db.assets.push(asset)
        notify(`أضاف ${user.name} أصلاً جديداً: ${asset.assetNo} — ${asset.name}`, `/assets?q=${encodeURIComponent(asset.assetNo)}`)
      }
      break
    }

    case 'deleteAsset': {
      if (!has(user, 'canEditAssets')) throw new Error('غير مصرح — تعديل الأصول لمدير العمليات والصيانة فقط')
      const t = db.assets.find((x) => x.id === payload.id)
      if (!t) break
      db.assets = db.assets.filter((x) => x.id !== payload.id)
      notify(`حذف ${user.name} الأصل ${t.assetNo}`, '/assets')
      break
    }

    case 'upsertPm': {
      if (!has(user, 'canEditOrders')) throw new Error('غير مصرح — تعديل أوامر الصيانة')
      const o = payload
      if (!o.assetId || !o.task?.trim()) throw new Error('الأصل والمهمة حقول إلزامية')
      const asset = db.assets.find((x) => x.id === o.assetId)
      if (!asset) throw new Error('الأصل غير موجود')
      if (o.id) {
        const t = db.pmOrders.find((x) => x.id === o.id)
        if (!t) throw new Error('العملية غير موجودة')
        const wasDone = t.status === 'مكتملة'
        Object.assign(t, {
          date: o.date ?? t.date, assetId: o.assetId, task: o.task.trim(), freq: o.freq ?? 'شهري',
          techId: o.techId ?? null, techName: o.techName ?? '',
          status: o.status ?? 'لم تبدأ', cost: Number(o.cost) || 0, due: o.due ?? '',
          completedAt: o.status === 'مكتملة' ? (wasDone ? t.completedAt : now) : undefined,
        })
        notify(`عدّل ${user.name} عملية دورية ${t.no}`, `/pm?q=${encodeURIComponent(t.no)}`)
      } else {
        const no = `PM-${db.counters.pm++}`
        const order = {
          id: uid(), no, date: o.date || now.slice(0, 10), assetId: o.assetId, task: o.task.trim(),
          freq: o.freq ?? 'شهري', techId: o.techId ?? null, techName: o.techName ?? '',
          status: o.status ?? 'لم تبدأ', cost: Number(o.cost) || 0, due: o.due ?? '',
          createdBy: user.name, createdAt: now,
        }
        db.pmOrders.unshift(order)
        notify(`أنشأ ${user.name} عملية دورية ${no}: ${order.task} — ${asset.name}`, `/pm?q=${encodeURIComponent(no)}`)
      }
      break
    }

    case 'deletePm': {
      if (!has(user, 'canEditOrders')) throw new Error('غير مصرح — تعديل أوامر الصيانة')
      const t = db.pmOrders.find((x) => x.id === payload.id)
      if (!t) break
      db.pmOrders = db.pmOrders.filter((x) => x.id !== payload.id)
      notify(`حذف ${user.name} العملية الدورية ${t.no}`, '/pm')
      break
    }

    case 'upsertCm': {
      if (!has(user, 'canEditOrders')) throw new Error('غير مصرح — تعديل أوامر الصيانة')
      const o = payload
      if (!o.assetId || !o.fault?.trim()) throw new Error('الأصل ووصف العطل حقول إلزامية')
      const asset = db.assets.find((x) => x.id === o.assetId)
      if (!asset) throw new Error('الأصل غير موجود')
      if (o.id) {
        const t = db.cmOrders.find((x) => x.id === o.id)
        if (!t) throw new Error('البلاغ غير موجود')
        const wasDone = t.status === 'مكتملة'
        Object.assign(t, {
          date: o.date ?? t.date, assetId: o.assetId, fault: o.fault.trim(), priority: o.priority ?? 'متوسطة',
          techId: o.techId ?? null, techName: o.techName ?? '',
          status: o.status ?? 'لم تبدأ', downTime: Number(o.downTime) || 0, cost: Number(o.cost) || 0,
          photos: sanitizePhotos(o.photos) ?? t.photos,
          completedAt: o.status === 'مكتملة' ? (wasDone ? t.completedAt : now) : undefined,
        })
        notify(`عدّل ${user.name} بلاغاً ${t.no}`, `/cm?q=${encodeURIComponent(t.no)}`)
      } else {
        const no = `CM-${db.counters.cm++}`
        const order = {
          id: uid(), no, date: o.date || now.slice(0, 10), assetId: o.assetId, fault: o.fault.trim(),
          priority: o.priority ?? 'متوسطة', techId: o.techId ?? null, techName: o.techName ?? '',
          status: o.status ?? 'لم تبدأ', downTime: Number(o.downTime) || 0, cost: Number(o.cost) || 0,
          photos: sanitizePhotos(o.photos) ?? [],
          createdBy: user.name, createdAt: now,
        }
        db.cmOrders.unshift(order)
        const pics = order.photos.length ? ` — مرفق ${order.photos.length} صورة` : ''
        notify(`بلاغ عطل جديد ${no}: ${order.fault} — ${asset.name} (${PRIORITY_TXT[order.priority] || order.priority})${pics}`, `/cm?q=${encodeURIComponent(no)}`)
      }
      break
    }

    case 'deleteCm': {
      if (!has(user, 'canEditOrders')) throw new Error('غير مصرح — تعديل أوامر الصيانة')
      const t = db.cmOrders.find((x) => x.id === payload.id)
      if (!t) break
      db.cmOrders = db.cmOrders.filter((x) => x.id !== payload.id)
      notify(`حذف ${user.name} بلاغ ${t.no}`, '/cm')
      break
    }

    case 'upsertUser': {
      if (!has(user, 'canManageUsers')) throw new Error('غير مصرح — إدارة المستخدمين للمدير أو لمدير العمليات والصيانة فقط')
      const u = payload
      if (db.users.some((x) => x.email === u.email && x.id !== u.id)) throw new Error('البريد الإلكتروني مسجل مسبقاً')
      if (u.id) {
        const target = db.users.find((x) => x.id === u.id)
        if (!target) throw new Error('المستخدم غير موجود')
        if (target.role === 'admin' && (u.role !== 'admin' || u.active === false)) {
          const admins = db.users.filter((x) => x.role === 'admin' && x.active && x.id !== u.id)
          if (!admins.length) throw new Error('لا يمكن إلغاء آخر مدير للنظام')
        }
        /* لا تمسح الرقم السري القديم إذا أُرسل فارغاً — يبقى كما هو */
        const { pin, ...rest } = u
        Object.assign(target, rest)
        if (pin) target.pin = pin
        notify(`حدّث ${user.name} بيانات المستخدم ${u.name}`, '/admin')
      } else {
        db.users.push({ id: uid(), name: u.name, email: u.email, role: u.role, pin: u.pin || '0000', active: u.active !== false, permOverrides: u.permOverrides || undefined, createdAt: now })
        notify(`أضاف ${user.name} مستخدماً جديداً: ${u.name} (${u.role})`, '/admin')
      }
      break
    }

    case 'deleteUser': {
      if (!has(user, 'canManageUsers')) throw new Error('غير مصرح')
      const target = db.users.find((x) => x.id === payload.id)
      if (!target) break
      if (target.id === user.id) throw new Error('لا يمكنك حذف حسابك الحالي')
      if (target.role === 'admin' && db.users.filter((x) => x.role === 'admin' && x.active).length <= 1) throw new Error('لا يمكن حذف آخر مدير للنظام')
      db.users = db.users.filter((x) => x.id !== payload.id)
      notify(`حذف المدير المستخدم ${target.name}`, '/admin')
      break
    }

    case 'markNotificationRead':
      db.notifications.forEach((n) => {
        if (!n.readBy.includes(user.id)) n.readBy.push(user.id)
      })
      break

    default:
      throw new Error(`إجراء غير معروف: ${type}`)
  }
  saveData(db)
  return result
}

const PRIORITY_TXT = { حرجة: 'حرجة', عالية: 'عالية', متوسطة: 'متوسطة', منخفضة: 'منخفضة' }

// ===== HTTP =====
const app = express()
app.use(express.json({ limit: '25mb' }))

app.get('/api/health', (_req, res) => res.json({ ok: true, users: db.users.length, assets: db.assets.length }))

// قائمة المستخدمين لشاشة الدخول (بدون أرقام PIN)
app.get('/api/users', (_req, res) => {
  res.json(db.users.filter((u) => u.active).map(({ pin, ...u }) => u))
})

app.post('/api/login', (req, res) => {
  const { userId, pin } = req.body || {}
  const user = db.users.find((u) => u.id === userId && u.active)
  if (!user || user.pin !== pin) return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' })
  const token = uid() + uid()
  sessions.set(token, user.id)
  const { pin: _p, ...safe } = user
  res.json({ token, user: safe })
})

function auth(req) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  const userId = sessions.get(token)
  return db.users.find((u) => u.id === userId && u.active)
}

// ===== WebSocket =====
const server = createServer(app)
server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://x')
  if (url.pathname !== '/ws') return socket.destroy()
  const token = url.searchParams.get('token') || ''
  const userId = sessions.get(token)
  const user = db.users.find((u) => u.id === userId && u.active)
  if (!user) return socket.destroy()
  wss.handleUpgrade(req, socket, head, (ws) => {
    ws.userId = user.id
    wss.emit('connection', ws, req)
  })
})

wss.on('connection', (ws) => {
  ws.send(JSON.stringify({ type: 'state', db, at: Date.now() }))
  ws.on('message', (raw) => {
    let msg
    try { msg = JSON.parse(raw) } catch { return }
    if (msg.type === 'ping') { ws.send(JSON.stringify({ type: 'pong' })); return }
    const user = db.users.find((u) => u.id === ws.userId && u.active)
    if (!user) { ws.send(JSON.stringify({ type: 'error', error: 'تسجيل الدخول مطلوب', actionId: msg.actionId })); return }
    try {
      const result = handleAction(user, msg.type, msg.payload)
      ws.send(JSON.stringify({ type: 'ack', actionId: msg.actionId, result }))
      broadcast()
    } catch (e) {
      ws.send(JSON.stringify({ type: 'error', error: e.message, actionId: msg.actionId }))
    }
  })
})

// ===== تقديم واجهة المستخدم المبنية (production) =====
const DIST_DIR = join(__dirname, '..', 'dist')
if (existsSync(DIST_DIR)) {
  /* الملفات المبنية بأسماء مشفرة (assets) تُخزن سنة كاملة؛
     index.html لا يُخزن أبداً حتى يحصل الجوال على آخر نسخة فور كل تحديث */
  app.use(express.static(DIST_DIR, {
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      } else {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
      }
    },
  }))
  app.get(/^\/(?!api\/|ws).*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
    res.sendFile(join(DIST_DIR, 'index.html'))
  })
}

// ===== تذكيرات الأعمال المتأخرة — إشعار واحد يومياً لكل عملية متأخرة =====
const overdueNotified = new Map() // orderId -> 'YYYY-MM-DD'
function checkOverdueReminders() {
  const today = new Date().toISOString().slice(0, 10)
  let changed = false
  for (const o of db.pmOrders) {
    if (o.status === 'مكتملة' || !o.due || o.due >= today) continue
    if (overdueNotified.get(o.id) === today) continue
    overdueNotified.set(o.id, today)
    notify(`⏰ تذكير بعمل متأخر: ${o.no} — ${o.task} (كان مستحقاً بتاريخ ${o.due})`, `/pm?q=${encodeURIComponent(o.no)}`)
    changed = true
  }
  if (changed) broadcast()
}
setInterval(checkOverdueReminders, 60 * 60 * 1000).unref()
setTimeout(checkOverdueReminders, 15000)

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Maintenance server listening on port ${PORT} (cloud: ${CLOUD_MODE ? SUPA_BUCKET : 'off'})`)})
