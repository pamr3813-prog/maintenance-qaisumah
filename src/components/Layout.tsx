import { NavLink, Outlet, useNavigate } from 'react-router'
import {
  LayoutDashboard,
  Boxes,
  Building2,
  RefreshCw,
  Wrench,
  MessagesSquare,
  Languages,
  LogOut,
  Bell,
  Users,
  WifiOff,
  Menu,
  X,
  ArrowRight,
} from 'lucide-react'
import { useState } from 'react'
import { roleLabel, useStore, APP_VERSION } from '@/lib/db'
import { PrintHeader } from '@/components/Print'
import { useLang } from '@/lib/i18n'
import { fmtDateTime } from '@/lib/format'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const NAV = [
  { to: '/', key: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/depts', key: 'nav.depts', icon: Building2 },
  { to: '/assets', key: 'nav.assets', icon: Boxes },
  { to: '/pm', key: 'nav.pm', icon: RefreshCw },
  { to: '/cm', key: 'nav.cm', icon: Wrench },
  { to: '/chat', key: 'nav.chat', icon: MessagesSquare },
] as const

export default function Layout() {
  const { t, lang, setLang } = useLang()
  const { currentUser, logout, online, myUnread, db, send, can } = useStore()
  const navigate = useNavigate()
  const [notifOpen, setNotifOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)

  const canManageUsers = can('canManageUsers')
  const navItems = NAV

  function signOut() {
    logout()
    navigate('/login', { replace: true })
  }

  async function openNotifications() {
    setNotifOpen(true)
    if (myUnread > 0 && currentUser) {
      try {
        await send('markNotificationRead', {})
      } catch {
        /* تجاهل */
      }
    }
  }

  return (
    <div className="min-h-screen bg-muted/30">
      {/* الشريط الجانبي — ثابت على الشاشات الكبيرة، درج منزلق على الجوال */}
      <aside
        className={`fixed inset-y-0 start-0 z-50 flex w-64 flex-col bg-[#17365d] text-white transition-transform duration-200 print:hidden md:z-40 md:w-60 ${
          navOpen ? 'translate-x-0' : 'md:translate-x-0 max-md:-translate-x-full max-md:rtl:translate-x-full'
        }`}
      >
        <button
          onClick={() => setNavOpen(false)}
          className="absolute end-2 top-2 rounded-md p-1 text-white/60 hover:bg-white/10 md:hidden"
          aria-label="close"
        >
          <X className="size-4" />
        </button>
        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <img src="/logos/qaisumah-airport.png" alt="Qaisumah Airport" className="size-9 object-contain" />
              <div>
                <div className="text-xs font-bold leading-tight">{lang === 'ar' ? 'مطار القيصومة' : 'Qaisumah Airport'}</div>
                <div className="text-[10px] font-semibold text-[#9fc3e8]">{t('app.title')}</div>
              </div>
            </div>
            <div className="text-center">
              <img src="/logos/al-majal.png" alt="MAG — Al Majal Al Arabi" className="mx-auto h-7 w-auto object-contain" />
              <div className="text-[10px] font-semibold text-[#9fc3e8]">
                {lang === 'ar' ? 'المجال العربي' : 'Al Majal Al Arabi'}
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map(({ to, key, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => setNavOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-[#2e75b6] font-bold text-white shadow' : 'text-[#cfe0f5] hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="size-4 shrink-0" />
              {t(key)}
            </NavLink>
          ))}
          {canManageUsers && (
            <NavLink
              to="/admin"
              onClick={() => setNavOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'bg-[#2e75b6] font-bold text-white shadow' : 'text-[#cfe0f5] hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Users className="size-4 shrink-0" />
              {t('ad.title')}
            </NavLink>
          )}
        </nav>

        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-[#cfe0f5] hover:bg-white/10 hover:text-white"
          >
            <LogOut className="size-4 shrink-0 text-[#ffd966]" />
            {t('auth.logout')}
          </button>
        </div>
        <div className="border-t border-white/10 p-3 text-xs text-[#9fc3e8]">
          {t('app.footer')}
          <span className="mt-1 block text-[10px] text-white/50">
            {t('app.version')} {APP_VERSION}
          </span>
        </div>
      </aside>

      {/* خلفية معتمة تغلق الدرج عند اللمس على الجوال */}
      {navOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setNavOpen(false)} />
      )}

      {/* المحتوى */}
      <div className="flex min-h-screen flex-col ms-0 md:ms-60 print:ms-0">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#102a49] bg-[#17365d] px-3 py-2.5 text-white md:px-6 md:py-3 print:hidden">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white md:hidden" onClick={() => setNavOpen(true)} aria-label="menu">
              <Menu className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(-1)}
              aria-label={t('common.back')}
              title={t('common.back')}
              className="border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
            >
              <ArrowRight className="size-4 rtl:rotate-180" />
            </Button>
            {!online && (
              <Badge variant="destructive" className="gap-1">
                <WifiOff className="size-3" /> {t('auth.offline')}
              </Badge>
            )}
            <span className="hidden text-sm text-[#9fc3e8] md:inline">{t('role.hint')}</span>
          </div>

          <div className="flex min-w-0 items-center gap-2">
            {/* الإشعارات */}
            <Popover open={notifOpen} onOpenChange={setNotifOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="relative shrink-0 border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white" onClick={openNotifications}>
                  <Bell className="size-4" />
                  {myUnread > 0 && (
                    <span className="absolute -top-1 -end-1 flex size-4 items-center justify-center rounded-full bg-[#ffd966] text-[10px] font-bold text-[#17365d]">
                      {myUnread > 9 ? '9+' : myUnread}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="border-b px-4 py-2 text-sm font-bold">{t('nt.title')}</div>
                <div className="max-h-80 overflow-y-auto">
                  {db.notifications.length === 0 && (
                    <p className="p-4 text-sm text-muted-foreground">{t('nt.empty')}</p>
                  )}
                  {db.notifications.slice(0, 30).map((n) => (
                    <div key={n.id} className="border-b px-4 py-2 text-sm last:border-0">
                      <p>{n.text}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{fmtDateTime(n.at)}</p>
                    </div>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* اللغة — أيقونة فقط على الجوال */}
            <button
              onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
              className="flex shrink-0 items-center gap-1.5 rounded-md border border-white/20 px-2 py-1.5 text-sm font-medium hover:bg-white/10 sm:px-3"
            >
              <Languages className="size-4" />
              <span className="hidden sm:inline">{t('lang.switch')}</span>
            </button>

            {/* المستخدم الحالي — الاسم مخفي على الجوال حتى لا يدفع زر الخروج خارج الشاشة */}
            {currentUser && (
              <div className="flex shrink-0 items-center gap-1 rounded-md border border-white/20 px-1.5 py-1.5 md:gap-2 md:px-3">
                <div className="hidden min-w-0 text-end leading-tight md:block">
                  <div className="max-w-[8.5rem] truncate text-sm font-semibold md:max-w-none">{currentUser.name}</div>
                  <div className="truncate text-[11px] text-[#9fc3e8]">{roleLabel(currentUser.role, lang)}</div>
                </div>
                <Button variant="ghost" size="icon" onClick={signOut} title={t('auth.logout')} aria-label={t('auth.logout')} className="text-white hover:bg-white/10 hover:text-white">
                  <LogOut className="size-4 text-[#ffd966]" />
                </Button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-3 md:p-6">
          <PrintHeader />
          <Outlet />
        </main>
      </div>
    </div>
  )
}
