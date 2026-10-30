import { hash } from 'bcryptjs'
import { config } from 'dotenv'
import { eq, sql } from 'drizzle-orm'
import { createDb } from './client.ts'
import { LEARNING_AREAS, lastSchoolDays, type AttendanceStatus } from '../../src/lib/attendance.ts'
import {
  ANNOUNCE_DIWALI,
  ANNOUNCE_HOLIDAY,
  ANNOUNCE_RAINBOW,
  CLASS_NURSERY_B,
  DEMO_PASSWORD,
  ENQUIRY_ANIKA,
  ENQUIRY_ARJUN,
  ENQUIRY_AYAAN,
  ENQUIRY_KABIR,
  ENQUIRY_MIRA,
  ENQUIRY_RIYA,
  ENQUIRY_SARA,
  ENQUIRY_TARA,
  ENQUIRY_VIHAAN,
  FEE_ANNUAL,
  FEE_BOOKS,
  FEE_RAINBOW,
  FEE_SPORTS,
  FEE_TRANSPORT,
  INV_AARAV,
  INV_AARAV_SPORTS,
  INV_DIYA,
  INV_ISHAAN,
  INV_MEERA,
  INV_RAINBOW,
  INV_ZOYA,
  ITEM_AARAV_ADM,
  ITEM_AARAV_MON,
  ITEM_AARAV_SPORTS,
  ITEM_DIYA_MON,
  ITEM_ISHAAN_MON,
  ITEM_MEERA_MON,
  ITEM_RAINBOW_MON,
  ITEM_ZOYA_MON,
  PAY_AARAV,
  PAY_MEERA,
  PAY_RAINBOW,
  PAYITEM_AARAV_ADM,
  PAYITEM_AARAV_MON,
  PAYITEM_MEERA,
  PAYITEM_RAINBOW,
  GUARDIAN_ANITA_T,
  GUARDIAN_IMRAN,
  GUARDIAN_KAVITHA_IYER,
  GUARDIAN_LAKSHMI,
  GUARDIAN_RAHUL,
  PLAN_CAMPUS,
  PLAN_GROWTH,
  PLAN_STARTER,
  SCHOOL_RAINBOW,
  SCHOOL_SPROUTS,
  STUDENT_AARAV,
  STUDENT_DIYA,
  STUDENT_ISHAAN,
  STUDENT_MEERA,
  STUDENT_NOAH,
  STUDENT_RAINBOW,
  STUDENT_ZOYA,
  TERM_RAINBOW_1,
  TERM_SPROUTS_1,
  TERM_SPROUTS_2,
  UPDATE_CIRCLE,
  UPDATE_LUNCH,
  UPDATE_PAINT,
  UPDATE_STORY,
  USER_ANITA,
  USER_KAVITHA,
  USER_OWNER,
  USER_PRIYA,
  USER_RAHUL,
  YEAR_RAINBOW,
  YEAR_SPROUTS,
} from './ids.ts'
import {
  academicYears,
  announcements,
  assessmentTerms,
  assessments,
  attendance,
  classes,
  dailyUpdates,
  enquiries,
  enquiryNotes,
  feeTypes,
  guardians,
  invoiceItems,
  invoices,
  paymentItems,
  payments,
  plans,
  profiles,
  progressRemarks,
  schoolSequences,
  schools,
  studentGuardians,
  students,
} from './schema.ts'

config({ path: '.env.local' })

const url = process.env.DATABASE_URL
if (!url) {
  throw new Error('DATABASE_URL is missing. Run neon env pull.')
}

const db = createDb(url)
const passwordHash = await hash(DEMO_PASSWORD, 10)

await db
  .insert(plans)
  .values([
    {
      id: PLAN_STARTER,
      name: 'Starter',
      pricePaise: 349900,
      childLimit: 100,
      features: ['Attendance', 'Admissions', 'Announcements'],
    },
    {
      id: PLAN_GROWTH,
      name: 'Growth',
      pricePaise: 549900,
      childLimit: 250,
      features: ['Fees', 'Receipts'],
    },
    {
      id: PLAN_CAMPUS,
      name: 'Campus',
      pricePaise: 999900,
      childLimit: null,
      features: ['Parent portal', 'Reports', 'Unlimited children'],
    },
  ])
  .onConflictDoNothing()

await db
  .insert(schools)
  .values([
    {
      id: SCHOOL_SPROUTS,
      name: 'Little Sprouts Preschool',
      address: '12 Gandhi Road, Anna Nagar, Chennai 600040',
      phone: '+91 44 2345 6789',
      email: 'office@littlesprouts.example',
      planId: PLAN_GROWTH,
      status: 'active',
      renewsOn: new Date('2026-12-12'),
      admissionFeePaise: 1000000,
    },
    {
      id: SCHOOL_RAINBOW,
      name: 'Rainbow Kids',
      address: '88 MG Road, Bengaluru 560001',
      phone: '+91 80 2222 1100',
      email: 'hello@rainbowkids.example',
      planId: PLAN_STARTER,
      status: 'trial',
      trialEndsAt: new Date('2026-10-30'),
      admissionFeePaise: 800000,
    },
  ])
  .onConflictDoNothing()

await db
  .insert(profiles)
  .values([
    {
      id: USER_PRIYA,
      schoolId: SCHOOL_SPROUTS,
      role: 'school_admin',
      fullName: 'Priya',
      phone: '+91 98410 10001',
      email: 'priya@littlesprouts.example',
      passwordHash,
    },
    {
      id: USER_ANITA,
      schoolId: SCHOOL_SPROUTS,
      role: 'teacher',
      fullName: 'Ms. Anita',
      phone: '+91 98410 10002',
      email: 'anita@littlesprouts.example',
      passwordHash,
    },
    {
      id: USER_RAHUL,
      schoolId: SCHOOL_SPROUTS,
      role: 'parent',
      fullName: 'Rahul',
      phone: '+91 98410 10003',
      email: 'rahul@littlesprouts.example',
      passwordHash,
    },
    {
      id: USER_OWNER,
      schoolId: null,
      role: 'super_admin',
      fullName: 'Platform owner',
      email: 'owner@nurserydesk.example',
      passwordHash,
    },
    {
      id: USER_KAVITHA,
      schoolId: SCHOOL_RAINBOW,
      role: 'school_admin',
      fullName: 'Kavitha Rao',
      email: 'kavitha@rainbowkids.example',
      passwordHash,
    },
  ])
  .onConflictDoNothing()

await db
  .insert(academicYears)
  .values([
    {
      id: YEAR_SPROUTS,
      schoolId: SCHOOL_SPROUTS,
      label: '2026–27',
      startsOn: new Date('2026-06-01'),
      endsOn: new Date('2027-04-30'),
      isCurrent: true,
    },
    {
      id: YEAR_RAINBOW,
      schoolId: SCHOOL_RAINBOW,
      label: '2026–27',
      startsOn: new Date('2026-06-01'),
      endsOn: new Date('2027-04-30'),
      isCurrent: true,
    },
  ])
  .onConflictDoNothing()

await db
  .insert(classes)
  .values([
    {
      schoolId: SCHOOL_SPROUTS,
      academicYearId: YEAR_SPROUTS,
      name: 'Playgroup',
      ageRange: '2–3 years',
      capacity: 40,
      monthlyFeePaise: 520000,
    },
    {
      schoolId: SCHOOL_SPROUTS,
      academicYearId: YEAR_SPROUTS,
      name: 'Nursery A',
      ageRange: '3–4 years',
      capacity: 30,
      monthlyFeePaise: 650000,
    },
    {
      id: CLASS_NURSERY_B,
      schoolId: SCHOOL_SPROUTS,
      academicYearId: YEAR_SPROUTS,
      name: 'Nursery B',
      ageRange: '3–4 years',
      capacity: 30,
      teacherId: USER_ANITA,
      monthlyFeePaise: 650000,
    },
    {
      schoolId: SCHOOL_SPROUTS,
      academicYearId: YEAR_SPROUTS,
      name: 'LKG',
      ageRange: '4–5 years',
      capacity: 60,
      monthlyFeePaise: 720000,
    },
    {
      schoolId: SCHOOL_SPROUTS,
      academicYearId: YEAR_SPROUTS,
      name: 'UKG',
      ageRange: '5–6 years',
      capacity: 50,
      monthlyFeePaise: 780000,
    },
    {
      schoolId: SCHOOL_RAINBOW,
      academicYearId: YEAR_RAINBOW,
      name: 'Nursery',
      ageRange: '3–4 years',
      capacity: 100,
      monthlyFeePaise: 650000,
    },
  ])
  .onConflictDoNothing()

await db.update(schools).set({ admissionPrefix: 'LS' }).where(eq(schools.id, SCHOOL_SPROUTS))
await db.update(schools).set({ admissionPrefix: 'RK' }).where(eq(schools.id, SCHOOL_RAINBOW))

const sproutClasses = await db.select().from(classes).where(eq(classes.schoolId, SCHOOL_SPROUTS))
const rainbowClasses = await db.select().from(classes).where(eq(classes.schoolId, SCHOOL_RAINBOW))
const classByName = new Map(sproutClasses.map((row) => [row.name, row]))
const playgroup = classByName.get('Playgroup')
const lkg = classByName.get('LKG')
const rainbowNursery = rainbowClasses[0]

if (!playgroup || !lkg || !rainbowNursery) {
  throw new Error('Seed classes missing')
}

const monthlyFees: Record<string, number> = {
  Playgroup: 520000,
  'Nursery A': 650000,
  'Nursery B': 650000,
  LKG: 720000,
  UKG: 780000,
  Nursery: 650000,
}
for (const row of [...sproutClasses, ...rainbowClasses]) {
  const fee = monthlyFees[row.name]
  if (fee) {
    await db.update(classes).set({ monthlyFeePaise: fee }).where(eq(classes.id, row.id))
  }
}

await db
  .insert(students)
  .values([
    {
      id: STUDENT_AARAV,
      schoolId: SCHOOL_SPROUTS,
      admissionNo: 'LS-26-0041',
      firstName: 'Aarav',
      lastName: 'Menon',
      dob: new Date('2022-04-12'),
      gender: 'Boy',
      classId: CLASS_NURSERY_B,
      rollNo: 1,
      status: 'enrolled',
      admittedOn: new Date('2026-06-10'),
    },
    {
      id: STUDENT_ZOYA,
      schoolId: SCHOOL_SPROUTS,
      admissionNo: 'LS-26-0042',
      firstName: 'Zoya',
      lastName: 'Khan',
      dob: new Date('2022-08-03'),
      gender: 'Girl',
      classId: CLASS_NURSERY_B,
      rollNo: 2,
      status: 'documents_pending',
      admittedOn: new Date('2026-06-12'),
    },
    {
      id: STUDENT_ISHAAN,
      schoolId: SCHOOL_SPROUTS,
      admissionNo: 'LS-26-0043',
      firstName: 'Ishaan',
      lastName: 'Rao',
      dob: new Date('2022-01-19'),
      gender: 'Boy',
      classId: CLASS_NURSERY_B,
      rollNo: 3,
      status: 'enrolled',
      admittedOn: new Date('2026-06-14'),
    },
    {
      id: STUDENT_MEERA,
      schoolId: SCHOOL_SPROUTS,
      admissionNo: 'LS-26-0044',
      firstName: 'Meera',
      lastName: 'Iyer',
      dob: new Date('2021-11-02'),
      gender: 'Girl',
      classId: lkg.id,
      rollNo: 1,
      status: 'enrolled',
      admittedOn: new Date('2026-06-08'),
    },
    {
      id: STUDENT_NOAH,
      schoolId: SCHOOL_SPROUTS,
      admissionNo: 'LS-26-0045',
      firstName: 'Noah',
      lastName: 'Thomas',
      dob: new Date('2023-09-21'),
      gender: 'Boy',
      classId: playgroup.id,
      rollNo: 1,
      status: 'documents_pending',
      admittedOn: new Date('2026-06-20'),
    },
    {
      id: STUDENT_RAINBOW,
      schoolId: SCHOOL_RAINBOW,
      admissionNo: 'RK-26-0001',
      firstName: 'Dev',
      lastName: 'Sharma',
      gender: 'Boy',
      classId: rainbowNursery.id,
      rollNo: 1,
      status: 'enrolled',
      admittedOn: new Date('2026-06-01'),
    },
  ])
  .onConflictDoNothing()

const nurseryBRolls = await db
  .select({ rollNo: students.rollNo, admissionNo: students.admissionNo })
  .from(students)
  .where(eq(students.classId, CLASS_NURSERY_B))
const nextNurseryBRoll = Math.max(0, ...nurseryBRolls.map((row) => row.rollNo ?? 0)) + 1

await db
  .insert(students)
  .values({
    id: STUDENT_DIYA,
    schoolId: SCHOOL_SPROUTS,
    admissionNo: 'LS-26-0048',
    firstName: 'Diya',
    lastName: 'Nair',
    dob: new Date('2022-05-28'),
    gender: 'Girl',
    classId: CLASS_NURSERY_B,
    rollNo: nextNurseryBRoll,
    status: 'enrolled',
    admittedOn: new Date('2026-07-01'),
  })
  .onConflictDoNothing()

await db
  .insert(guardians)
  .values([
    {
      id: GUARDIAN_RAHUL,
      schoolId: SCHOOL_SPROUTS,
      profileId: USER_RAHUL,
      fullName: 'Rahul',
      phone: '+91 98410 10003',
      email: 'rahul@littlesprouts.example',
      relationship: 'Father',
    },
    {
      id: GUARDIAN_IMRAN,
      schoolId: SCHOOL_SPROUTS,
      fullName: 'Imran Khan',
      phone: '+91 98410 66042',
      relationship: 'Father',
    },
    {
      id: GUARDIAN_KAVITHA_IYER,
      schoolId: SCHOOL_SPROUTS,
      fullName: 'Kavitha Rao',
      phone: '+91 98400 77310',
      relationship: 'Mother',
    },
    {
      id: GUARDIAN_LAKSHMI,
      schoolId: SCHOOL_SPROUTS,
      fullName: 'Lakshmi Iyer',
      phone: '+91 98940 30215',
      relationship: 'Mother',
    },
    {
      id: GUARDIAN_ANITA_T,
      schoolId: SCHOOL_SPROUTS,
      fullName: 'Anita Thomas',
      phone: '+91 90030 22418',
      relationship: 'Mother',
    },
  ])
  .onConflictDoNothing()

await db
  .insert(studentGuardians)
  .values([
    { schoolId: SCHOOL_SPROUTS, studentId: STUDENT_AARAV, guardianId: GUARDIAN_RAHUL },
    { schoolId: SCHOOL_SPROUTS, studentId: STUDENT_ZOYA, guardianId: GUARDIAN_IMRAN },
    { schoolId: SCHOOL_SPROUTS, studentId: STUDENT_ISHAAN, guardianId: GUARDIAN_KAVITHA_IYER },
    { schoolId: SCHOOL_SPROUTS, studentId: STUDENT_MEERA, guardianId: GUARDIAN_LAKSHMI },
    { schoolId: SCHOOL_SPROUTS, studentId: STUDENT_NOAH, guardianId: GUARDIAN_ANITA_T },
  ])
  .onConflictDoNothing()

const startOfToday = new Date()
startOfToday.setHours(9, 0, 0, 0)
const tomorrow = new Date(startOfToday)
tomorrow.setDate(tomorrow.getDate() + 1)
const visitOne = new Date(startOfToday)
visitOne.setDate(visitOne.getDate() + 4)
const visitTwo = new Date(startOfToday)
visitTwo.setDate(visitTwo.getDate() + 5)

await db
  .insert(enquiries)
  .values([
    {
      id: ENQUIRY_RIYA,
      schoolId: SCHOOL_SPROUTS,
      childName: 'Riya Patel',
      parentName: 'Neha Patel',
      phone: '+91 98410 11223',
      classInterest: 'Nursery B',
      source: 'Phone',
      status: 'New',
      nextFollowUpAt: startOfToday,
    },
    {
      id: ENQUIRY_ARJUN,
      schoolId: SCHOOL_SPROUTS,
      childName: 'Arjun Nair',
      parentName: 'Suresh Nair',
      phone: '+91 98840 55671',
      classInterest: 'LKG',
      source: 'Website',
      status: 'Follow-up',
      nextFollowUpAt: startOfToday,
    },
    {
      id: ENQUIRY_SARA,
      schoolId: SCHOOL_SPROUTS,
      childName: 'Sara Joseph',
      parentName: 'Mary Joseph',
      phone: '+91 90030 22418',
      classInterest: 'Nursery B',
      source: 'Walk-in',
      status: 'Visit booked',
      nextFollowUpAt: visitOne,
    },
    {
      id: ENQUIRY_VIHAAN,
      schoolId: SCHOOL_SPROUTS,
      childName: 'Vihaan Rao',
      parentName: 'Kavitha Rao',
      phone: '+91 98400 77310',
      classInterest: 'LKG',
      source: 'Referral',
      status: 'Follow-up',
      nextFollowUpAt: tomorrow,
    },
    {
      id: ENQUIRY_MIRA,
      schoolId: SCHOOL_SPROUTS,
      childName: 'Mira Das',
      parentName: 'Anita Das',
      phone: '+91 99620 41187',
      classInterest: 'Playgroup',
      source: 'Instagram',
      status: 'New',
      nextFollowUpAt: startOfToday,
    },
    {
      id: ENQUIRY_AYAAN,
      schoolId: SCHOOL_SPROUTS,
      childName: 'Ayaan Khan',
      parentName: 'Imran Khan',
      phone: '+91 98410 66042',
      classInterest: 'UKG',
      source: 'Website',
      status: 'Visit booked',
      nextFollowUpAt: visitTwo,
    },
    {
      id: ENQUIRY_TARA,
      schoolId: SCHOOL_SPROUTS,
      childName: 'Tara Menon',
      parentName: 'Lakshmi Menon',
      phone: '+91 98940 30215',
      classInterest: 'UKG',
      source: 'Referral',
      status: 'Converted',
    },
    {
      id: ENQUIRY_KABIR,
      schoolId: SCHOOL_SPROUTS,
      childName: 'Kabir Shah',
      parentName: 'Pooja Shah',
      phone: '+91 97910 88364',
      classInterest: 'Nursery B',
      source: 'Phone',
      status: 'Lost',
      lostReason: 'Chose a school closer to home.',
    },
    {
      id: ENQUIRY_ANIKA,
      schoolId: SCHOOL_RAINBOW,
      childName: 'Anika Reddy',
      parentName: 'Sneha Reddy',
      phone: '+91 80 5555 0101',
      classInterest: 'Nursery',
      source: 'Website',
      status: 'New',
      nextFollowUpAt: startOfToday,
    },
  ])
  .onConflictDoNothing()

await db
  .insert(enquiryNotes)
  .values([
    {
      schoolId: SCHOOL_SPROUTS,
      enquiryId: ENQUIRY_RIYA,
      authorId: USER_PRIYA,
      note: 'Asked about Nursery fees and timings. Call back with fee sheet.',
    },
    {
      schoolId: SCHOOL_SPROUTS,
      enquiryId: ENQUIRY_ARJUN,
      authorId: USER_PRIYA,
      note: 'Sent brochure on WhatsApp. Parent will discuss with family.',
    },
  ])
  .onConflictDoNothing()

if (sproutClasses.some((row) => row.schoolId === SCHOOL_RAINBOW)) {
  throw new Error('Seed isolation failed')
}

await db
  .insert(assessmentTerms)
  .values([
    {
      id: TERM_SPROUTS_1,
      schoolId: SCHOOL_SPROUTS,
      academicYearId: YEAR_SPROUTS,
      label: 'Term 1',
      startsOn: new Date('2026-06-01'),
      endsOn: new Date('2026-07-31'),
      isCurrent: false,
    },
    {
      id: TERM_SPROUTS_2,
      schoolId: SCHOOL_SPROUTS,
      academicYearId: YEAR_SPROUTS,
      label: 'Term 2 (Aug–Dec 2026)',
      startsOn: new Date('2026-08-01'),
      endsOn: new Date('2026-12-31'),
      isCurrent: true,
    },
    {
      id: TERM_RAINBOW_1,
      schoolId: SCHOOL_RAINBOW,
      academicYearId: YEAR_RAINBOW,
      label: 'Term 1',
      startsOn: new Date('2026-06-01'),
      endsOn: new Date('2026-12-31'),
      isCurrent: true,
    },
  ])
  .onConflictDoNothing()

function statusesFor(days: number, presentCount: number, today: AttendanceStatus): AttendanceStatus[] {
  const out: AttendanceStatus[] = Array.from({ length: days }, () => 'absent')
  for (let i = 0; i < presentCount && i < days; i += 1) {
    out[i] = 'present'
  }
  if (presentCount > 3) out[3] = 'late'
  out[days - 1] = today
  const score = (status: AttendanceStatus) => (status === 'absent' ? 0 : 1)
  let current = out.reduce((sum, status) => sum + score(status), 0)
  for (let i = 0; i < days - 1 && current !== presentCount; i += 1) {
    const status = out[i]
    if (status == null) continue
    if (current < presentCount && status === 'absent') {
      out[i] = 'present'
      current += 1
    } else if (current > presentCount && status !== 'absent') {
      out[i] = 'absent'
      current -= 1
    }
  }
  return out
}

const registerDays = lastSchoolDays(20)
const attendanceSeed: Array<{
  studentId: string
  schoolId: string
  classId: string
  present: number
  today: AttendanceStatus
  markedBy: string
}> = [
  { studentId: STUDENT_AARAV, schoolId: SCHOOL_SPROUTS, classId: CLASS_NURSERY_B, present: 19, today: 'present', markedBy: USER_ANITA },
  { studentId: STUDENT_ZOYA, schoolId: SCHOOL_SPROUTS, classId: CLASS_NURSERY_B, present: 14, today: 'absent', markedBy: USER_ANITA },
  { studentId: STUDENT_ISHAAN, schoolId: SCHOOL_SPROUTS, classId: CLASS_NURSERY_B, present: 20, today: 'present', markedBy: USER_ANITA },
  { studentId: STUDENT_DIYA, schoolId: SCHOOL_SPROUTS, classId: CLASS_NURSERY_B, present: 12, today: 'absent', markedBy: USER_ANITA },
  { studentId: STUDENT_MEERA, schoolId: SCHOOL_SPROUTS, classId: lkg.id, present: 17, today: 'late', markedBy: USER_PRIYA },
  { studentId: STUDENT_NOAH, schoolId: SCHOOL_SPROUTS, classId: playgroup.id, present: 18, today: 'present', markedBy: USER_PRIYA },
  { studentId: STUDENT_RAINBOW, schoolId: SCHOOL_RAINBOW, classId: rainbowNursery.id, present: 20, today: 'present', markedBy: USER_KAVITHA },
]

const [riya] = await db.select().from(students).where(eq(students.admissionNo, 'LS-26-0046')).limit(1)
if (riya?.classId) {
  attendanceSeed.push({
    studentId: riya.id,
    schoolId: SCHOOL_SPROUTS,
    classId: riya.classId,
    present: 18,
    today: 'present',
    markedBy: USER_ANITA,
  })
}

await db
  .insert(attendance)
  .values(
    attendanceSeed.flatMap((item) => {
      const statuses = statusesFor(registerDays.length, item.present, item.today)
      return registerDays.map((date, index) => ({
        schoolId: item.schoolId,
        studentId: item.studentId,
        classId: item.classId,
        date,
        status: statuses[index] ?? 'present',
        markedBy: item.markedBy,
      }))
    }),
  )
  .onConflictDoNothing({ target: [attendance.studentId, attendance.date] })

const today = new Date()
const at = (hours: number, minutes: number) =>
  new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes)

await db
  .insert(dailyUpdates)
  .values([
    {
      id: UPDATE_CIRCLE,
      schoolId: SCHOOL_SPROUTS,
      classId: CLASS_NURSERY_B,
      authorId: USER_ANITA,
      body: 'Circle time — songs and weather chart',
      createdAt: at(9, 0),
    },
    {
      id: UPDATE_STORY,
      schoolId: SCHOOL_SPROUTS,
      classId: CLASS_NURSERY_B,
      authorId: USER_ANITA,
      body: 'Story hour — The Very Hungry Caterpillar',
      createdAt: at(10, 0),
    },
    {
      id: UPDATE_PAINT,
      schoolId: SCHOOL_SPROUTS,
      classId: CLASS_NURSERY_B,
      authorId: USER_ANITA,
      body: 'Finger painting — colour mixing: red + yellow',
      createdAt: at(11, 0),
    },
    {
      id: UPDATE_LUNCH,
      schoolId: SCHOOL_SPROUTS,
      classId: CLASS_NURSERY_B,
      authorId: USER_ANITA,
      body: 'Lunch and rest',
      createdAt: at(12, 0),
    },
  ])
  .onConflictDoNothing()

await db
  .insert(announcements)
  .values([
    {
      id: ANNOUNCE_DIWALI,
      schoolId: SCHOOL_SPROUTS,
      title: 'Diwali show, 6 Nov',
      body: 'Costumes: yellow or orange.',
      audience: 'all',
    },
    {
      id: ANNOUNCE_HOLIDAY,
      schoolId: SCHOOL_SPROUTS,
      title: 'School closed 14 Nov',
      body: 'Diwali holiday. School reopens on 17 Nov.',
      audience: 'all',
    },
    {
      id: ANNOUNCE_RAINBOW,
      schoolId: SCHOOL_RAINBOW,
      title: 'Sports day practice',
      body: 'Please send a water bottle on Friday.',
      audience: 'all',
    },
  ])
  .onConflictDoNothing()

const progressSeed: Array<{
  studentId: string
  current: number[]
  previous: number[]
  remark: string
}> = [
  {
    studentId: STUDENT_AARAV,
    current: [3, 3, 2, 4, 3],
    previous: [2, 3, 2, 3, 3],
    remark: 'Counts to 20 with confidence and loves story time. Practise holding a pencil at home.',
  },
  {
    studentId: STUDENT_ZOYA,
    current: [2, 2, 3, 3, 4],
    previous: [2, 2, 2, 3, 3],
    remark: 'Great with colours and shapes. Needs encouragement to speak up in circle time.',
  },
  {
    studentId: STUDENT_ISHAAN,
    current: [4, 3, 3, 2, 3],
    previous: [3, 3, 3, 2, 3],
    remark: 'Kind and helpful to friends. Finds sharing turns difficult, we are working on it.',
  },
  {
    studentId: STUDENT_DIYA,
    current: [1, 2, 2, 2, 3],
    previous: [1, 1, 2, 2, 2],
    remark: 'Still building confidence. Extra support with early language and counting is planned.',
  },
]

await db
  .insert(assessments)
  .values(
    progressSeed.flatMap((item) =>
      LEARNING_AREAS.flatMap((area, index) => [
        {
          schoolId: SCHOOL_SPROUTS,
          studentId: item.studentId,
          termId: TERM_SPROUTS_2,
          area,
          level: item.current[index] ?? 2,
          assessedBy: USER_ANITA,
        },
        {
          schoolId: SCHOOL_SPROUTS,
          studentId: item.studentId,
          termId: TERM_SPROUTS_1,
          area,
          level: item.previous[index] ?? 2,
          assessedBy: USER_ANITA,
        },
      ]),
    ),
  )
  .onConflictDoNothing({ target: [assessments.studentId, assessments.termId, assessments.area] })

await db
  .insert(progressRemarks)
  .values(
    progressSeed.map((item) => ({
      schoolId: SCHOOL_SPROUTS,
      studentId: item.studentId,
      termId: TERM_SPROUTS_2,
      remark: item.remark,
    })),
  )
  .onConflictDoNothing({ target: [progressRemarks.studentId, progressRemarks.termId] })

await db
  .insert(feeTypes)
  .values([
    {
      id: FEE_SPORTS,
      schoolId: SCHOOL_SPROUTS,
      name: 'Sports day',
      amountPaise: 80000,
      appliesToClassIds: [],
      isMandatory: false,
      dueOn: '2026-12-20',
      recurring: 'none',
    },
    {
      id: FEE_ANNUAL,
      schoolId: SCHOOL_SPROUTS,
      name: 'Annual day',
      amountPaise: 150000,
      appliesToClassIds: [],
      isMandatory: true,
      dueOn: '2026-12-06',
      recurring: 'none',
    },
    {
      id: FEE_BOOKS,
      schoolId: SCHOOL_SPROUTS,
      name: 'Books',
      amountPaise: 200000,
      appliesToClassIds: [],
      isMandatory: false,
      dueOn: '2026-11-15',
      recurring: 'none',
    },
    {
      id: FEE_TRANSPORT,
      schoolId: SCHOOL_SPROUTS,
      name: 'Transport',
      amountPaise: 250000,
      appliesToClassIds: [],
      isMandatory: false,
      dueOn: '2026-11-05',
      recurring: 'monthly',
    },
    {
      id: FEE_RAINBOW,
      schoolId: SCHOOL_RAINBOW,
      name: 'Sports day',
      amountPaise: 80000,
      appliesToClassIds: [],
      isMandatory: false,
      dueOn: '2026-12-20',
      recurring: 'none',
    },
  ])
  .onConflictDoNothing()

await db
  .insert(invoices)
  .values([
    {
      id: INV_AARAV,
      schoolId: SCHOOL_SPROUTS,
      studentId: STUDENT_AARAV,
      number: 'INV-2610-0001',
      issuedOn: '2026-10-01',
      dueOn: '2026-10-05',
      status: 'due',
      totalPaise: 1650000,
      kind: 'admission',
      period: '2026-10',
    },
    {
      id: INV_ZOYA,
      schoolId: SCHOOL_SPROUTS,
      studentId: STUDENT_ZOYA,
      number: 'INV-2610-0002',
      issuedOn: '2026-10-01',
      dueOn: '2026-11-05',
      status: 'due',
      totalPaise: 650000,
      kind: 'monthly',
      period: '2026-10',
    },
    {
      id: INV_ISHAAN,
      schoolId: SCHOOL_SPROUTS,
      studentId: STUDENT_ISHAAN,
      number: 'INV-2610-0003',
      issuedOn: '2026-09-01',
      dueOn: '2026-09-05',
      status: 'due',
      totalPaise: 650000,
      kind: 'monthly',
      period: '2026-10',
    },
    {
      id: INV_MEERA,
      schoolId: SCHOOL_SPROUTS,
      studentId: STUDENT_MEERA,
      number: 'INV-2610-0004',
      issuedOn: '2026-10-01',
      dueOn: '2026-10-05',
      status: 'due',
      totalPaise: 720000,
      kind: 'monthly',
      period: '2026-10',
    },
    {
      id: INV_DIYA,
      schoolId: SCHOOL_SPROUTS,
      studentId: STUDENT_DIYA,
      number: 'INV-2610-0005',
      issuedOn: '2026-10-01',
      dueOn: '2026-10-05',
      status: 'due',
      totalPaise: 650000,
      kind: 'monthly',
      period: '2026-10',
    },
    {
      id: INV_AARAV_SPORTS,
      schoolId: SCHOOL_SPROUTS,
      studentId: STUDENT_AARAV,
      number: 'INV-2610-0006',
      issuedOn: '2026-10-10',
      dueOn: '2026-12-20',
      status: 'due',
      totalPaise: 80000,
      kind: 'other',
      period: null,
    },
    {
      id: INV_RAINBOW,
      schoolId: SCHOOL_RAINBOW,
      studentId: STUDENT_RAINBOW,
      number: 'INV-2610-0001',
      issuedOn: '2026-10-01',
      dueOn: '2026-10-05',
      status: 'due',
      totalPaise: 650000,
      kind: 'monthly',
      period: '2026-10',
    },
  ])
  .onConflictDoNothing()

await db
  .insert(invoiceItems)
  .values([
    {
      id: ITEM_AARAV_ADM,
      schoolId: SCHOOL_SPROUTS,
      invoiceId: INV_AARAV,
      studentId: STUDENT_AARAV,
      description: 'One-time admission fee',
      amountPaise: 1000000,
      kind: 'admission',
    },
    {
      id: ITEM_AARAV_MON,
      schoolId: SCHOOL_SPROUTS,
      invoiceId: INV_AARAV,
      studentId: STUDENT_AARAV,
      description: 'Monthly fee · October',
      amountPaise: 650000,
      kind: 'monthly',
      period: '2026-10',
    },
    {
      id: ITEM_ZOYA_MON,
      schoolId: SCHOOL_SPROUTS,
      invoiceId: INV_ZOYA,
      studentId: STUDENT_ZOYA,
      description: 'Monthly fee · October',
      amountPaise: 650000,
      kind: 'monthly',
      period: '2026-10',
    },
    {
      id: ITEM_ISHAAN_MON,
      schoolId: SCHOOL_SPROUTS,
      invoiceId: INV_ISHAAN,
      studentId: STUDENT_ISHAAN,
      description: 'Monthly fee · October',
      amountPaise: 650000,
      kind: 'monthly',
      period: '2026-10',
    },
    {
      id: ITEM_MEERA_MON,
      schoolId: SCHOOL_SPROUTS,
      invoiceId: INV_MEERA,
      studentId: STUDENT_MEERA,
      description: 'Monthly fee · October',
      amountPaise: 720000,
      kind: 'monthly',
      period: '2026-10',
    },
    {
      id: ITEM_DIYA_MON,
      schoolId: SCHOOL_SPROUTS,
      invoiceId: INV_DIYA,
      studentId: STUDENT_DIYA,
      description: 'Monthly fee · October',
      amountPaise: 650000,
      kind: 'monthly',
      period: '2026-10',
    },
    {
      id: ITEM_AARAV_SPORTS,
      schoolId: SCHOOL_SPROUTS,
      invoiceId: INV_AARAV_SPORTS,
      studentId: STUDENT_AARAV,
      feeTypeId: FEE_SPORTS,
      description: 'Sports day',
      amountPaise: 80000,
      kind: 'other',
    },
    {
      id: ITEM_RAINBOW_MON,
      schoolId: SCHOOL_RAINBOW,
      invoiceId: INV_RAINBOW,
      studentId: STUDENT_RAINBOW,
      description: 'Monthly fee · October',
      amountPaise: 650000,
      kind: 'monthly',
      period: '2026-10',
    },
  ])
  .onConflictDoNothing()

await db
  .insert(payments)
  .values([
    {
      id: PAY_AARAV,
      schoolId: SCHOOL_SPROUTS,
      studentId: STUDENT_AARAV,
      receiptNo: 'RC-2610-0001',
      paidOn: '2026-10-03',
      method: 'UPI',
      totalPaise: 1650000,
      receivedBy: USER_PRIYA,
    },
    {
      id: PAY_MEERA,
      schoolId: SCHOOL_SPROUTS,
      studentId: STUDENT_MEERA,
      receiptNo: 'RC-2610-0002',
      paidOn: '2026-10-04',
      method: 'Cash',
      totalPaise: 720000,
      receivedBy: USER_PRIYA,
    },
    {
      id: PAY_RAINBOW,
      schoolId: SCHOOL_RAINBOW,
      studentId: STUDENT_RAINBOW,
      receiptNo: 'RC-2610-0001',
      paidOn: '2026-10-02',
      method: 'UPI',
      totalPaise: 650000,
      receivedBy: USER_KAVITHA,
    },
  ])
  .onConflictDoNothing()

await db
  .insert(paymentItems)
  .values([
    {
      id: PAYITEM_AARAV_ADM,
      schoolId: SCHOOL_SPROUTS,
      paymentId: PAY_AARAV,
      invoiceItemId: ITEM_AARAV_ADM,
      amountPaise: 1000000,
    },
    {
      id: PAYITEM_AARAV_MON,
      schoolId: SCHOOL_SPROUTS,
      paymentId: PAY_AARAV,
      invoiceItemId: ITEM_AARAV_MON,
      amountPaise: 650000,
    },
    {
      id: PAYITEM_MEERA,
      schoolId: SCHOOL_SPROUTS,
      paymentId: PAY_MEERA,
      invoiceItemId: ITEM_MEERA_MON,
      amountPaise: 720000,
    },
    {
      id: PAYITEM_RAINBOW,
      schoolId: SCHOOL_RAINBOW,
      paymentId: PAY_RAINBOW,
      invoiceItemId: ITEM_RAINBOW_MON,
      amountPaise: 650000,
    },
  ])
  .onConflictDoNothing()

await db
  .insert(schoolSequences)
  .values([
    { schoolId: SCHOOL_SPROUTS, kind: 'invoice', period: 'invoice-2610', nextValue: 20 },
    { schoolId: SCHOOL_SPROUTS, kind: 'receipt', period: 'receipt-2610', nextValue: 10 },
    { schoolId: SCHOOL_RAINBOW, kind: 'invoice', period: 'invoice-2610', nextValue: 5 },
    { schoolId: SCHOOL_RAINBOW, kind: 'receipt', period: 'receipt-2610', nextValue: 5 },
  ])
  .onConflictDoNothing()

for (const invoiceId of [INV_AARAV, INV_ZOYA, INV_ISHAAN, INV_MEERA, INV_DIYA, INV_AARAV_SPORTS, INV_RAINBOW]) {
  await db.execute(sql`select refresh_invoice_status(${invoiceId}::uuid)`)
}

const sproutStudents = await db.select().from(students).where(eq(students.schoolId, SCHOOL_SPROUTS))
const rainbowStudents = await db.select().from(students).where(eq(students.schoolId, SCHOOL_RAINBOW))
if (sproutStudents.some((row) => row.schoolId === SCHOOL_RAINBOW)) {
  throw new Error('Student seed isolation failed')
}

const otherAttendance = await db.select({ id: attendance.id }).from(attendance).where(eq(attendance.schoolId, SCHOOL_RAINBOW))
if (otherAttendance.length === 0) {
  throw new Error('Rainbow attendance seed missing')
}

const otherInvoices = await db.select({ id: invoices.id }).from(invoices).where(eq(invoices.schoolId, SCHOOL_RAINBOW))
if (otherInvoices.length === 0) {
  throw new Error('Rainbow invoice seed missing')
}

console.log(
  `Seeded plans, 2 schools, users, classes, ${sproutStudents.length + rainbowStudents.length} students, attendance, progress, and fees.`,
)
