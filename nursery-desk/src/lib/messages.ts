import { formatDayMonth } from './dates.ts'
import { formatINR } from './money.ts'

export const MESSAGE_KINDS = ['announcement', 'holiday', 'alert'] as const
export type MessageKind = (typeof MESSAGE_KINDS)[number]
export const REMINDER_TONES = ['friendly', 'overdue'] as const
export type ReminderTone = (typeof REMINDER_TONES)[number]

export const MESSAGE_KIND_LABEL: Record<MessageKind, string> = {
  announcement: 'Announcement',
  holiday: 'Holiday',
  alert: 'Alert',
}

export function isMessageKind(value: string): value is MessageKind {
  return (MESSAGE_KINDS as readonly string[]).includes(value)
}

export function messageKind(title: string, body: string): MessageKind {
  const text = `${title} ${body}`.toLowerCase()
  if (text.includes('closed') || text.includes('holiday')) return 'holiday'
  if (
    text.includes('fee') ||
    text.includes('overdue') ||
    text.includes('absent') ||
    text.includes('reminder') ||
    text.includes('alert')
  ) {
    return 'alert'
  }
  return 'announcement'
}

export function messageKindLabel(kind: MessageKind): string {
  return MESSAGE_KIND_LABEL[kind]
}

export function firstNameOf(fullName: string, fallback = 'Parent'): string {
  return fullName.trim().split(/\s+/).filter(Boolean)[0] ?? fallback
}

export function familyLabel(lastName: string | null, parentName: string): string {
  const surname = lastName?.trim() || parentName.trim().split(/\s+/).filter(Boolean).at(-1) || 'Family'
  return `${surname} family`
}

export const COMPOSE_TYPES = ['announcement', 'circular', 'instruction', 'payment'] as const
export type ComposeType = (typeof COMPOSE_TYPES)[number]

export const COMPOSE_TYPE_LABEL: Record<ComposeType, string> = {
  announcement: 'Announcement',
  circular: 'Circular',
  instruction: 'Instruction',
  payment: 'Payment alert',
}

export const COMPOSE_TEMPLATES: Record<ComposeType, { title: string; body: string }> = {
  announcement: {
    title: 'Annual Day on 20 Dec',
    body: 'Dear {parent}, we are happy to share that the Annual Day will be held on 20 Dec at 5 pm. Please join us to cheer for {child}. Regards, {school}',
  },
  circular: {
    title: 'School circular',
    body: 'Dear {parent}, please read this circular about {child}’s class. Details are in the parent app. Regards, {school}',
  },
  instruction: {
    title: 'Diwali show on 6 Nov',
    body: 'Dear {parent}, please send {child} in yellow or orange clothes on 6 Nov for the Diwali show, with a water bottle and a spare set of clothes. Thank you, {school}',
  },
  payment: {
    title: 'Fee reminder',
    body: 'Dear {parent}, a gentle reminder that {child}’s fee is due. Pay in the Nursery Desk app or at the school office. Thank you, {school}',
  },
}

export const MERGE_TAGS = ['parent', 'child', 'school'] as const
export type MergeTag = (typeof MERGE_TAGS)[number]

export function isComposeType(value: string): value is ComposeType {
  return (COMPOSE_TYPES as readonly string[]).includes(value)
}

export function applyMergeTags(
  template: string,
  values: { parent: string; child: string; school: string },
): string {
  return template
    .replaceAll('{parent}', values.parent)
    .replaceAll('{child}', values.child)
    .replaceAll('{school}', values.school)
}

export function smsPartCount(text: string): number {
  const n = text.trim().length
  if (n === 0) return 0
  if (n <= 160) return 1
  return Math.ceil(n / 153)
}

export function reminderPreview(input: {
  tone: ReminderTone
  parentFirst: string
  childFirst: string
  amountPaise: number
  dueOn: string | null
  schoolName: string
}): string {
  const amount = formatINR(input.amountPaise)
  const school = input.schoolName.trim() || 'your school'
  if (input.tone === 'overdue') {
    return `Dear ${input.parentFirst}, ${input.childFirst}’s fee of ${amount} is overdue. Please pay in the Nursery Desk app or at the school office today. Thank you, ${school}.`
  }
  const due = input.dueOn ? formatDayMonth(input.dueOn) : 'soon'
  return `Dear ${input.parentFirst}, a gentle reminder that ${input.childFirst}’s fee of ${amount} is due on ${due}. Pay in the Nursery Desk app or at the school office. Thank you, ${school}.`
}
