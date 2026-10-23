# Nursery Desk

Multi-school kindergarten management SaaS. This repo is at **Phase 2+**: Neon Postgres, email login, school setup, enquiries, admissions, students, and the school dashboard.

## Run

```bash
cd nursery-desk
npm install
neon deploy
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:5173/login](http://localhost:5173/login).

Demo password for every user: `NurseryDesk1!`

| Role | Email |
|---|---|
| School admin | priya@littlesprouts.example |
| Teacher | anita@littlesprouts.example |
| Parent | rahul@littlesprouts.example |
| Platform owner | owner@nurserydesk.example |
| Rainbow Kids admin (isolation) | kavitha@rainbowkids.example |

## What is built

- Neon Lakebase Postgres (pooled `DATABASE_URL`, direct `DATABASE_URL_UNPOOLED` for migrations)
- `/api` on the Vite server — the browser never sees the database URL
- Email login with httpOnly session cookie
- School profile, academic years, classes, monthly fee and admission prefix
- Enquiries with follow-up notes, visits, and convert to admission
- Admissions pipeline board and five-step enrolment wizard
- Class-wise students with roll and admission numbers
- Document uploads stored on the server under `uploads/` (not in the browser)
- School dashboard with live enrolment, class strength and recent admissions
- Isolation check: a school admin only receives their own classes, students and enquiries

## What is still mocked / later

- Attendance % and fee status on the students table (Phase 3 and 4)
- Invoices are shown as a first-invoice summary in the wizard only (Phase 4)
- Daily operations and progress (Phase 3)
- Fees, payments and receipts (Phase 4)
- Parent payments (Phase 5)
- Billing automation (Phase 6)
