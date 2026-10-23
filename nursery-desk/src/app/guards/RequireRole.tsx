import { useSession } from '@/app/session'
import { ROLE_HOME, type Role } from '@/types/roles'
import { Navigate, Outlet } from 'react-router-dom'

type Props = {
  roles: Role[]
}

export function RequireRole({ roles }: Props) {
  const { user, loading } = useSession()

  if (loading) {
    return <p className="text-muted">Loading your school…</p>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!roles.includes(user.role)) {
    return <Navigate to={ROLE_HOME[user.role]} replace />
  }

  return <Outlet />
}
