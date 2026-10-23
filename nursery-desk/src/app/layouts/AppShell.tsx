import { ROLE_NAV } from '@/app/nav'
import { useSession } from '@/app/session'
import { Logo } from '@/components/ui/Logo'
import { cn } from '@/lib/cn'
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'

export function AppShell() {
  const { user, loading, signOut } = useSession()
  const navigate = useNavigate()

  if (loading) {
    return <p className="p-6 text-muted">Loading your school…</p>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  const items = ROLE_NAV[user.role]
  const schoolTitle = user.role === 'super_admin' ? 'Nursery Desk platform' : user.school?.name
  const schoolNote =
    user.role === 'super_admin' ? 'Owner view' : 'Data visible to this school only'

  return (
    <div className="grid min-h-screen grid-cols-1 content-start md:grid-cols-[230px_1fr] md:content-stretch">
      <aside
        data-print-hide
        className="sticky top-0 flex h-auto flex-row items-center gap-1.5 overflow-x-auto border-b border-line bg-surface p-2.5 md:h-screen md:flex-col md:items-stretch md:overflow-y-auto md:border-r md:border-b-0 md:p-5 md:pt-5 md:pr-3.5 md:pb-5 md:pl-3.5"
      >
        <Logo className="hidden md:flex" />
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
            className={({ isActive }) =>
              cn(
                'flex shrink-0 items-center gap-2.5 rounded-control px-3 py-2.5 text-left font-semibold whitespace-nowrap no-underline',
                isActive ? 'bg-primary-tint text-primary' : 'text-muted',
              )
            }
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        <div className="mt-auto hidden rounded-[14px] border border-line p-3 text-[13px] text-muted md:block">
          <b className="block text-sm text-ink">{schoolTitle}</b>
          {schoolNote}
        </div>
      </aside>
      <main className="w-full max-w-[1100px] px-3.5 py-[18px] md:px-7 md:py-6">
        <div
          data-print-hide
          className="mb-[22px] flex flex-wrap items-center justify-between gap-3"
        >
          <div>
            <h1>{user.greeting}</h1>
            <div className="text-muted">{user.subtitle}</div>
          </div>
          <button
            type="button"
            className="cursor-pointer rounded-control border-0 bg-transparent px-3 py-2 font-bold text-muted"
            onClick={() => {
              void signOut().then(() => navigate('/login'))
            }}
          >
            Sign out
          </button>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
