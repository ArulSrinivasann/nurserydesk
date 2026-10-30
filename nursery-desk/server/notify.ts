import { and, eq, inArray } from 'drizzle-orm'
import { guardians, profiles, studentGuardians, students } from './db/schema.ts'
import { db } from './http.ts'

export type NotifyKind = 'absence' | 'receipt' | 'announcement' | 'demo_request'

export type NotifyRecipient = {
  name: string
  email: string | null
  phone: string | null
}

export type NotifyEvent = {
  kind: NotifyKind
  schoolId: string | null
  to: NotifyRecipient
  subject: string
  body: string
}

export interface NotificationProvider {
  send(event: NotifyEvent): Promise<void>
}

export class LogNotificationProvider implements NotificationProvider {
  async send(event: NotifyEvent) {
    const target = event.to.email || event.to.phone || event.to.name
    console.log(`[notify:${event.kind}] ${target} · ${event.subject}`)
  }
}

export function notificationProvider(): NotificationProvider {
  return new LogNotificationProvider()
}

const notify = notificationProvider()

export async function guardiansForStudents(schoolId: string, studentIds: string[]) {
  if (studentIds.length === 0) return []
  return db()
    .select({
      studentId: studentGuardians.studentId,
      name: guardians.fullName,
      email: guardians.email,
      phone: guardians.phone,
      firstName: students.firstName,
    })
    .from(studentGuardians)
    .innerJoin(guardians, eq(studentGuardians.guardianId, guardians.id))
    .innerJoin(students, eq(studentGuardians.studentId, students.id))
    .where(and(eq(studentGuardians.schoolId, schoolId), inArray(studentGuardians.studentId, studentIds)))
}

export async function notifyAbsences(schoolId: string, studentIds: string[], dateLabel: string) {
  const rows = await guardiansForStudents(schoolId, studentIds)
  await Promise.all(
    rows.map((row) =>
      notify.send({
        kind: 'absence',
        schoolId,
        to: { name: row.name, email: row.email, phone: row.phone },
        subject: `${row.firstName} was marked absent`,
        body: `${row.firstName} was marked absent on ${dateLabel}.`,
      }),
    ),
  )
}

export async function notifyReceipt(input: {
  schoolId: string
  studentId: string
  receiptNo: string
  amountLabel: string
}) {
  const rows = await guardiansForStudents(input.schoolId, [input.studentId])
  await Promise.all(
    rows.map((row) =>
      notify.send({
        kind: 'receipt',
        schoolId: input.schoolId,
        to: { name: row.name, email: row.email, phone: row.phone },
        subject: `Fee receipt ${input.receiptNo}`,
        body: `Payment of ${input.amountLabel} was received. Receipt ${input.receiptNo} is ready.`,
      }),
    ),
  )
}

export async function notifyDemoRequest(input: {
  schoolName: string
  contactName: string
  email: string
  phone: string
}) {
  const owners = await db()
    .select({
      fullName: profiles.fullName,
      email: profiles.email,
      phone: profiles.phone,
    })
    .from(profiles)
    .where(eq(profiles.role, 'super_admin'))
  await Promise.all(
    owners.map((owner) =>
      notify.send({
        kind: 'demo_request',
        schoolId: null,
        to: { name: owner.fullName, email: owner.email, phone: owner.phone },
        subject: `Demo request: ${input.schoolName}`,
        body: `${input.contactName} (${input.email}, ${input.phone}) asked for a Nursery Desk demo for ${input.schoolName}.`,
      }),
    ),
  )
}

export async function notifyAnnouncement(schoolId: string, studentIds: string[], title: string, body: string) {
  const rows = await guardiansForStudents(schoolId, studentIds)
  const seen = new Set<string>()
  await Promise.all(
    rows
      .filter((row) => {
        const key = row.email || row.phone || row.name
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map((row) =>
        notify.send({
          kind: 'announcement',
          schoolId,
          to: { name: row.name, email: row.email, phone: row.phone },
          subject: title,
          body,
        }),
      ),
  )
}
