import { HTTPException } from 'hono/http-exception'
import { createDb, requireDatabaseUrl } from './db/client.ts'
import { readUser, type AuthUser } from './session.ts'

export function db() {
  return createDb(requireDatabaseUrl())
}

export function requireUser(cookie: string | undefined): AuthUser {
  const user = readUser(cookie)
  if (!user) {
    throw new HTTPException(401, { message: 'Please sign in.' })
  }
  return user
}

export function requireSchoolAdmin(user: AuthUser) {
  if (user.role !== 'school_admin' || !user.schoolId) {
    throw new HTTPException(403, { message: 'School admins only.' })
  }
  return user.schoolId
}

export function requireTeacher(user: AuthUser) {
  if (user.role !== 'teacher' || !user.schoolId) {
    throw new HTTPException(403, { message: 'Teachers only.' })
  }
  return user.schoolId
}

export function requireParent(user: AuthUser) {
  if (user.role !== 'parent' || !user.schoolId) {
    throw new HTTPException(403, { message: 'Parents only.' })
  }
  return user.schoolId
}

export function requireSuperAdmin(user: AuthUser) {
  if (user.role !== 'super_admin') {
    throw new HTTPException(403, { message: 'Platform owner only.' })
  }
  return user
}
