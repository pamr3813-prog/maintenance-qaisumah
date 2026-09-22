// إدارة مستخدمين: تحقق من صلاحية O&M superintendent ثم حذف المستخدم التجريبي
import WebSocket from 'file:///C:/Users/Lenovo%20PC/Documents/kimi/tasks/2026-09-20/10-19-53-4e523d2f/maint-app/node_modules/ws/wrapper.mjs';

const BASE = 'https://maintenance-qaisumah.onrender.com';

async function connect(email, pin) {
  const ul = await fetch(`${BASE}/api/users`);
  const users = await ul.json();
  const u = users.find((x) => x.email === email);
  if (!u) throw new Error('user not found: ' + email);
  const r = await fetch(`${BASE}/api/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: u.id, pin }) });
  const j = await r.json();
  if (!j.token) throw new Error('login failed: ' + JSON.stringify(j));
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${BASE.replace('https', 'wss')}/ws?token=${j.token}`);
    const to = setTimeout(() => { try { ws.terminate(); } catch {} reject(new Error('WS connect timeout')); }, 15000);
    const pending = new Map();
    let id = 0;
    const state = { ws, db: null, send(type, payload) { const m = { actionId: String(++id), type, payload }; return new Promise(r2 => { pending.set(m.actionId, r2); ws.send(JSON.stringify(m)); }); } };
    ws.on('open', () => { clearTimeout(to); resolve(state); });
    ws.on('message', d => { const m = JSON.parse(d); if (m.type === 'state') state.db = m.db; if (m.actionId && pending.has(m.actionId)) { pending.get(m.actionId)(m); pending.delete(m.actionId); } });
    ws.on('error', (e) => { clearTimeout(to); reject(new Error('WS error: ' + e.message)); });
  });
}

const sup = await connect('om@qaisumah-airport.sa', '5555');
// 1) تحقق أن مدير العمليات والصيانة يستطيع إدارة المستخدمين الآن
const probe = await sup.send('upsertUser', { name: 'فحص مؤقت', nameEn: 'Probe', email: 'probe-del@x.sa', role: 'viewer', pin: '9999' });
console.log('O&M superintendent upsertUser =>', probe.type === 'ack' ? 'SUCCESS (الصلاحية مفعّلة)' : 'FAIL: ' + JSON.stringify(probe));
// انتظر وصول بث الحالة الأول
await new Promise(r => { const iv = setInterval(() => { if (sup.db) { clearInterval(iv); r(); } }, 100); setTimeout(() => { clearInterval(iv); r(); }, 5000); });
const users = sup.db?.users || [];
const testUser = users.find((u) => u.email === 'test@x.sa');
const probeUser = users.find((u) => u.email === 'probe-del@x.sa');
console.log('users count:', users.length, '| test@x.sa present?', !!testUser, '| probe present?', !!probeUser);
for (const u of [testUser, probeUser].filter(Boolean)) {
  const del = await sup.send('deleteUser', { id: u.id });
  console.log(`delete ${u.email} =>`, del.type === 'ack' ? 'DELETED' : JSON.stringify(del));
}
sup.ws.close();
process.exit(0);
