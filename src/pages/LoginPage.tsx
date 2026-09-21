import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchUsers, roleLabel, useStore, type User } from '@/lib/db'
import { SearchableSelect } from '@/components/SearchableSelect'
import { useLang } from '@/lib/i18n'

export default function LoginPage() {
  const { t, lang } = useLang()
  const { login, currentUser } = useStore()
  const navigate = useNavigate()
  const [users, setUsers] = useState<Omit<User, 'pin'>[]>([])
  const [userId, setUserId] = useState('')
  const [pin, setPin] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchUsers().then(setUsers).catch(() => toast.error(t('auth.offline')))
  }, [t])

  useEffect(() => {
    if (currentUser) navigate('/', { replace: true })
  }, [currentUser, navigate])

  async function submit() {
    if (!userId || !pin) return
    setBusy(true)
    try {
      await login(userId, pin)
      navigate('/', { replace: true })
    } catch {
      toast.error(t('auth.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-lg">
        {/* الشعاران */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="text-center">
            <img src="/logos/qaisumah-airport.png" alt="Qaisumah Airport" className="mx-auto size-16 object-contain" />
            <div className="mt-1 text-[11px] font-bold">{lang === 'ar' ? 'مطار القيصومة' : 'Qaisumah Airport'}</div>
          </div>
          <div className="text-center">
            <img src="/logos/al-majal.png" alt="MAG — Al Majal Al Arabi" className="mx-auto h-9 w-auto object-contain" />
            <div className="text-[11px] font-semibold text-muted-foreground">
              {lang === 'ar' ? 'المجال العربي' : 'Al Majal Al Arabi'}
            </div>
          </div>
        </div>

        <h1 className="mb-1 text-center text-xl font-bold">{t('app.title')}</h1>
        <p className="mb-6 text-center text-xs text-muted-foreground">{t('auth.subtitle')}</p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t('auth.user')}</Label>
            <SearchableSelect
              options={users.map((u) => {
                // المسمى حسب لغة الواجهة: عربي في العربية، وإنجليزي كبير (SITE MANAGER) في الإنجليزية
                const rl = roleLabel(u.role, lang)
                // لا تكرار: أظهر المسمى فقط إذا لم يكن جزءاً من اسم المستخدم أصلاً
                const parts = [u.name]
                if (!u.name.toLowerCase().includes(rl.toLowerCase())) parts.push(rl)
                return { value: u.id, label: parts.join(' — ') }
              })}
              value={userId}
              onChange={setUserId}
              placeholder="—"
            />
          </div>
          <div className="space-y-1.5">
            <Label>{t('auth.pin')}</Label>
            <Input
              type="password"
              inputMode="numeric"
              className="text-center tracking-[0.5em]"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
            />
          </div>
          <Button className="w-full" size="lg" onClick={submit} disabled={busy || !userId || !pin}>
            {busy ? t('auth.connecting') : t('auth.login')}
          </Button>
        </div>
      </div>
    </div>
  )
}
