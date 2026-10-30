import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

export const plans = pgTable('plans', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  pricePaise: integer('price_paise').notNull(),
  childLimit: integer('child_limit'),
  features: jsonb('features').$type<string[]>().notNull().default([]),
})

export const schools = pgTable('schools', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  address: text('address'),
  phone: text('phone'),
  email: text('email'),
  logoUrl: text('logo_url'),
  planId: uuid('plan_id')
    .notNull()
    .references(() => plans.id),
  status: text('status').notNull().default('trial'),
  trialEndsAt: timestamp('trial_ends_at', { withTimezone: true }),
  renewsOn: date('renews_on', { mode: 'date' }),
  admissionFeePaise: integer('admission_fee_paise').notNull().default(1000000),
  admissionPrefix: text('admission_prefix'),
})

export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id').references(() => schools.id),
  role: text('role').notNull(),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
})

export const academicYears = pgTable('academic_years', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id')
    .notNull()
    .references(() => schools.id),
  label: text('label').notNull(),
  startsOn: date('starts_on', { mode: 'date' }).notNull(),
  endsOn: date('ends_on', { mode: 'date' }).notNull(),
  isCurrent: boolean('is_current').notNull().default(false),
})

export const classes = pgTable('classes', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id')
    .notNull()
    .references(() => schools.id),
  academicYearId: uuid('academic_year_id')
    .notNull()
    .references(() => academicYears.id),
  name: text('name').notNull(),
  ageRange: text('age_range'),
  capacity: integer('capacity').notNull(),
  teacherId: uuid('teacher_id').references(() => profiles.id),
  monthlyFeePaise: integer('monthly_fee_paise').notNull().default(650000),
})

export const students = pgTable('students', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id')
    .notNull()
    .references(() => schools.id),
  admissionNo: text('admission_no').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name'),
  dob: date('dob', { mode: 'date' }),
  gender: text('gender').notNull(),
  medicalNotes: text('medical_notes'),
  classId: uuid('class_id').references(() => classes.id),
  rollNo: integer('roll_no'),
  status: text('status').notNull().default('applied'),
  photoUrl: text('photo_url'),
  admittedOn: date('admitted_on', { mode: 'date' }),
  discountKind: text('discount_kind').notNull().default('none'),
})

export const guardians = pgTable('guardians', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id')
    .notNull()
    .references(() => schools.id),
  profileId: uuid('profile_id').references(() => profiles.id),
  fullName: text('full_name').notNull(),
  phone: text('phone'),
  email: text('email'),
  relationship: text('relationship'),
  address: text('address'),
  emergencyContact: text('emergency_contact'),
})

export const studentGuardians = pgTable('student_guardians', {
  schoolId: uuid('school_id')
    .notNull()
    .references(() => schools.id),
  studentId: uuid('student_id')
    .notNull()
    .references(() => students.id),
  guardianId: uuid('guardian_id')
    .notNull()
    .references(() => guardians.id),
})

export const studentDocuments = pgTable('student_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id')
    .notNull()
    .references(() => schools.id),
  studentId: uuid('student_id')
    .notNull()
    .references(() => students.id),
  kind: text('kind').notNull(),
  filePath: text('file_path').notNull(),
  fileName: text('file_name').notNull(),
  contentType: text('content_type').notNull().default('application/octet-stream'),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
})

export const enquiries = pgTable('enquiries', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id')
    .notNull()
    .references(() => schools.id),
  childName: text('child_name').notNull(),
  parentName: text('parent_name').notNull(),
  phone: text('phone').notNull(),
  classInterest: text('class_interest'),
  source: text('source').notNull(),
  status: text('status').notNull().default('New'),
  nextFollowUpAt: timestamp('next_follow_up_at', { withTimezone: true }),
  lostReason: text('lost_reason'),
  convertedStudentId: uuid('converted_student_id').references(() => students.id),
})

export const enquiryNotes = pgTable('enquiry_notes', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id')
    .notNull()
    .references(() => schools.id),
  enquiryId: uuid('enquiry_id')
    .notNull()
    .references(() => enquiries.id),
  authorId: uuid('author_id').references(() => profiles.id),
  note: text('note').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const attendance = pgTable(
  'attendance',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    classId: uuid('class_id')
      .notNull()
      .references(() => classes.id),
    date: date('date', { mode: 'string' }).notNull(),
    status: text('status').notNull(),
    markedBy: uuid('marked_by').references(() => profiles.id),
  },
  (table) => [unique('attendance_student_date').on(table.studentId, table.date)],
)

export const dailyUpdates = pgTable('daily_updates', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id')
    .notNull()
    .references(() => schools.id),
  classId: uuid('class_id')
    .notNull()
    .references(() => classes.id),
  authorId: uuid('author_id').references(() => profiles.id),
  body: text('body').notNull(),
  photoPaths: text('photo_paths').array().notNull().default([]),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const announcements = pgTable('announcements', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id')
    .notNull()
    .references(() => schools.id),
  title: text('title').notNull(),
  body: text('body').notNull(),
  audience: text('audience').notNull().default('all'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const assessmentTerms = pgTable('assessment_terms', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id')
    .notNull()
    .references(() => schools.id),
  academicYearId: uuid('academic_year_id')
    .notNull()
    .references(() => academicYears.id),
  label: text('label').notNull(),
  startsOn: date('starts_on', { mode: 'date' }).notNull(),
  endsOn: date('ends_on', { mode: 'date' }).notNull(),
  isCurrent: boolean('is_current').notNull().default(false),
})

export const assessments = pgTable(
  'assessments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    termId: uuid('term_id')
      .notNull()
      .references(() => assessmentTerms.id),
    area: text('area').notNull(),
    level: smallint('level').notNull(),
    assessedBy: uuid('assessed_by').references(() => profiles.id),
  },
  (table) => [unique('assessments_student_term_area').on(table.studentId, table.termId, table.area)],
)

export const progressRemarks = pgTable(
  'progress_remarks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    termId: uuid('term_id')
      .notNull()
      .references(() => assessmentTerms.id),
    remark: text('remark').notNull(),
  },
  (table) => [unique('progress_remarks_student_term').on(table.studentId, table.termId)],
)

export const schoolSequences = pgTable(
  'school_sequences',
  {
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id),
    kind: text('kind').notNull(),
    period: text('period').notNull(),
    nextValue: integer('next_value').notNull(),
  },
  (table) => [unique('school_sequences_pk').on(table.schoolId, table.kind, table.period)],
)

export const feeTypes = pgTable('fee_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id')
    .notNull()
    .references(() => schools.id),
  name: text('name').notNull(),
  amountPaise: integer('amount_paise').notNull(),
  appliesToClassIds: uuid('applies_to_class_ids').array().notNull().default([]),
  isMandatory: boolean('is_mandatory').notNull().default(false),
  dueOn: date('due_on', { mode: 'string' }),
  recurring: text('recurring').notNull().default('none'),
})

export const invoices = pgTable(
  'invoices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    number: text('number').notNull(),
    issuedOn: date('issued_on', { mode: 'string' }).notNull(),
    dueOn: date('due_on', { mode: 'string' }).notNull(),
    status: text('status').notNull().default('due'),
    totalPaise: integer('total_paise').notNull(),
    kind: text('kind').notNull(),
    period: text('period'),
  },
  (table) => [unique('invoices_school_number').on(table.schoolId, table.number)],
)

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id')
    .notNull()
    .references(() => schools.id),
  invoiceId: uuid('invoice_id')
    .notNull()
    .references(() => invoices.id),
  studentId: uuid('student_id')
    .notNull()
    .references(() => students.id),
  feeTypeId: uuid('fee_type_id').references(() => feeTypes.id),
  description: text('description').notNull(),
  amountPaise: integer('amount_paise').notNull(),
  discountPaise: integer('discount_paise').notNull().default(0),
  kind: text('kind').notNull(),
  period: text('period'),
})

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    schoolId: uuid('school_id')
      .notNull()
      .references(() => schools.id),
    studentId: uuid('student_id')
      .notNull()
      .references(() => students.id),
    receiptNo: text('receipt_no').notNull(),
    paidOn: date('paid_on', { mode: 'string' }).notNull(),
    method: text('method').notNull(),
    reference: text('reference'),
    totalPaise: integer('total_paise').notNull(),
    receivedBy: uuid('received_by').references(() => profiles.id),
  },
  (table) => [unique('payments_school_receipt').on(table.schoolId, table.receiptNo)],
)

export const paymentItems = pgTable('payment_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolId: uuid('school_id')
    .notNull()
    .references(() => schools.id),
  paymentId: uuid('payment_id')
    .notNull()
    .references(() => payments.id),
  invoiceItemId: uuid('invoice_item_id')
    .notNull()
    .references(() => invoiceItems.id),
  amountPaise: integer('amount_paise').notNull(),
})

export const demoRequests = pgTable('demo_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  schoolName: text('school_name').notNull(),
  contactName: text('contact_name').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  note: text('note'),
  status: text('status').notNull().default('new'),
  convertedSchoolId: uuid('converted_school_id').references(() => schools.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})
