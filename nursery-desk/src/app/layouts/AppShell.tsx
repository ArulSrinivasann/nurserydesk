import { isNavGroup, ROLE_NAV, type NavLeaf } from '@/app/nav'
import { useSession } from '@/app/session'
import { Logo } from '@/components/ui/Logo'
import { NavIcon } from '@/components/ui/NavIcon'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import { useQuery } from '@tanstack/react-query'
import { NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom'

function sideLinkClass(isActive: boolean, nested = false) {
  return cn(
    'flex shrink-0 items-center gap-2.5 rounded-control px-3 py-2.5 text-left text-[16px] font-semibold whitespace-nowrap no-underline',
    nested && 'md:py-2 md:pl-4 md:text-[15px]',
    isActive ? 'bg-nav-active-bg text-nav-active' : 'text-muted',
  )
}

function SideLink({
  item,
  nested = false,
  badge,
}: {
  item: NavLeaf
  nested?: boolean
  badge?: number
}) {
  return (
    <NavLink to={item.to} end className={({ isActive }) => sideLinkClass(isActive, nested)}>
      <NavIcon name={item.icon} />
      {item.label}
      {badge && badge > 0 ? (
        <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-nav-active px-1 text-[11px] font-extrabold text-white">
          {badge}
        </span>
      ) : null}
    </NavLink>
  )
}

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
  const unreadQuery = useQuery({
    queryKey: ['demo-requests'],
    queryFn: () => api<{ unread: number }>('/api/demo-requests'),
    enabled: user.role === 'super_admin',
    refetchInterval: 30_000,
  })
  const unread = unreadQuery.data?.unread ?? 0

  return (
    <div className="grid min-h-screen grid-cols-1 content-start md:grid-cols-[230px_1fr] md:content-stretch">
      <aside
        data-print-hide
        className="sticky top-0 flex h-auto flex-row items-center gap-1.5 overflow-x-auto border-b border-line bg-surface p-2.5 md:h-screen md:flex-col md:items-stretch md:overflow-y-auto md:border-r md:border-b-0 md:p-5 md:pt-5 md:pr-3.5 md:pb-5 md:pl-3.5"
      >
        <Logo className="hidden px-0 md:flex" />
        {items.map((item) =>
          isNavGroup(item) ? (
            <div
              key={item.label}
              className="flex shrink-0 flex-row items-center gap-1 md:mt-3 md:flex-col md:items-stretch md:gap-0.5"
            >
              <p className="m-0 hidden items-center gap-2 px-3 py-1 text-[11px] font-extrabold tracking-[0.08em] text-muted uppercase md:flex">
                <NavIcon name={item.icon} className="h-4 w-4" />
                {item.label}
              </p>
              {item.children.map((child) => (
                <SideLink key={child.to} item={child} nested />
              ))}
            </div>
          ) : (
            <SideLink
              key={item.to}
              item={item}
              badge={item.to === '/platform/demos' ? unread : 0}
            />
          ),
        )}
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
