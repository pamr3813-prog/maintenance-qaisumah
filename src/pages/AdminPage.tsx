import { useState } from 'react'
import { Plus, Trash2, Users, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { PERMS, PERM_LABELS, ROLES, roleLabel, normalizeRole, useStore, type PermKey, type User } from '@/lib/db'
import { useLang } from '@/lib/i18n'
import type { RoleKey } from '@/types'

const PERM_KEYS = Object.keys(PERM_LABELS) as PermKey[]

type PermChoice = '' | 'allow' | 'deny'
type PermForm = Record<PermKey, PermChoice>

const emptyPermForm = (): PermForm =>
  Object.fromEntries(PERM_KEYS.map((k) => [k, ''])) as PermForm

function formToOverrides(perms: PermForm): Record<string, boolean> | undefined {
  const out: Record<string, boolean> = {}
  for (const k of PERM_KEYS) {
    if (perms[k] === 'allow') out[k] = true
    else if (perms[k] === 'deny') out[k] = false
  }
  return Object.keys(out).length ? out : undefined
}

function overridesToForm(o?: Record<string, boolean>): PermForm {
  const f = emptyPermForm()
  if (o) for (const k of PERM_KEYS) {
    if (o[k] === true) f[k] = 'allow'
    else if (o[k] === false) f[k] = 'deny'
  }
  return f
}

export default function AdminPage() {
  const { db, send, currentUser } = useStore()
  const { t, lang } = useLang()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState({ name: '', email: '', role: 'storekeeper', pin: '0000', active: true })
  const [perms, setPerms] = useState<PermForm>(emptyPermForm())
  const [q, setQ] = useState('')
  const ql = q.trim().toLowerCase()
  const filteredUsers = db.users.filter(
    (u) =>
      !ql ||
      u.name.toLowerCase().includes(ql) ||
      (u.email ?? '').toLowerCase().includes(ql) ||
      roleLabel(u.role, lang).toLowerCase().includes(ql) ||
      u.role.toLowerCase().includes(ql),
  )

  function openNew() {
    setEditing(null)
    setForm({ name: '', email: '', role: 'storekeeper', pin: '0000', active: true })
    setPerms(emptyPermForm())
    setOpen(true)
  }

  function openEdit(u: User) {
    setEditing(u)
    setForm({ name: u.name, email: u.email, role: u.role, pin: '', active: u.active })
    setPerms(overridesToForm(u.permOverrides))
    setOpen(true)
  }

  async function save() {
    const role = normalizeRole(form.role)
    if (!form.name.trim() || !form.email.trim() || !role) {
      toast.error(t('ad.err'))
      return
    }
    try {
      await send('upsertUser', {
        id: editing?.id,
        name: form.name.trim(),
        email: form.email.trim(),
        role,
        pin: form.pin, /* فارغ عند التعديل = الإبقاء على القديم */
        active: form.active,
        permOverrides: formToOverrides(perms),
      })
      toast.success(t('common.save'))
      setOpen(false)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function remove(u: User) {
    try {
      await send('deleteUser', { id: u.id })
      toast.success(t('ad.delete'))
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Users className="size-6" /> {t('ad.title')}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t('ad.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('common.search')} className="w-44 md:w-56" />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}><Plus className="me-2 size-4" /> {t('ad.add')}</Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? t('ad.edit') : t('ad.add')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>{t('ad.name')}</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>{t('ad.email')}</Label>
                <Input dir="ltr" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@company.sa" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t('ad.role')}</Label>
                  <Input
                    list="wms-role-list"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                    placeholder={t('ad.roleHint')}
                  />
                  <datalist id="wms-role-list">
                    {(Object.keys(ROLES) as RoleKey[]).map((r) => (
                      <option key={r} value={roleLabel(r, lang)} />
                    ))}
                  </datalist>
                  {form.role.trim() && !(Object.keys(ROLES) as string[]).includes(normalizeRole(form.role)) && (
                    <p className="text-xs text-amber-600">{t('ad.roleCustomNote')}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>{t('ad.pin')}</Label>
                  <Input dir="ltr" value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value })} placeholder={editing ? '•••• (اتركه فارغاً للإبقاء)' : '0000'} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="accent-primary" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                {t('ad.active')}
              </label>

              {/* تخصيص الصلاحيات — يتجاوز صلاحيات الدور */}
              <div className="rounded-md border p-3">
                <div className="mb-2 text-sm font-semibold">{t('ad.permCustom')}</div>
                <div className="space-y-2">
                  {PERM_KEYS.map((k) => {
                    const roleDefault = (PERMS[k] ?? []).includes(form.role)
                    return (
                      <div key={k} className="flex items-center justify-between gap-3">
                        <span className="text-sm">
                          {t(PERM_LABELS[k])}
                          <span className="ms-1 text-xs text-muted-foreground">
                            ({t('ad.roleDefault')}: {roleDefault ? t('ad.permAllow') : t('ad.permDeny')})
                          </span>
                        </span>
                        <select
                          className="h-8 w-32 rounded-md border bg-background px-2 text-sm"
                          value={perms[k]}
                          onChange={(e) => setPerms({ ...perms, [k]: e.target.value as PermChoice })}
                        >
                          <option value="">{t('ad.permDefault')}</option>
                          <option value="allow">{t('ad.permAllow')}</option>
                          <option value="deny">{t('ad.permDeny')}</option>
                        </select>
                      </div>
                    )
                  })}
                </div>
              </div>

              <Button className="w-full" onClick={save}>{t('ad.save')}</Button>
            </div>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('ad.name')}</TableHead>
                <TableHead>{t('ad.email')}</TableHead>
                <TableHead>{t('ad.role')}</TableHead>
                <TableHead>{t('ad.active')}</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => (
                <TableRow key={u.id} className={u.active ? '' : 'opacity-50'}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell dir="ltr" className="text-end text-sm">{u.email}</TableCell>
                  <TableCell><Badge variant="secondary">{roleLabel(u.role, lang)}</Badge>{u.permOverrides && <Badge variant="outline" className="ms-1 text-xs">{t('ad.hasCustom')}</Badge>}</TableCell>
                  <TableCell>
                    <Badge className={u.active ? 'bg-green-600' : 'bg-slate-400'}>{u.active ? '✓' : '—'}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(u)}>{t('common.save') === 'حفظ' ? 'تعديل' : 'Edit'}</Button>
                      {u.id !== currentUser?.id && (
                        <Button variant="ghost" size="icon" onClick={() => remove(u)}>
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* مصفوفة الصلاحيات */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="size-5 text-primary" />
            {t('ad.permTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('ad.role')}</TableHead>
                {PERM_KEYS.map((k) => (
                  <TableHead key={k} className="text-center text-xs">{t(PERM_LABELS[k])}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(Object.keys(ROLES) as RoleKey[]).map((r) => (
                <TableRow key={r}>
                  <TableCell className="font-medium">{roleLabel(r, lang)}</TableCell>
                  {PERM_KEYS.map((k) => (
                    <TableCell key={k} className="text-center">
                      {(PERMS[k] ?? []).includes(r) ? '✅' : '—'}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
