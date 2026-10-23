# Nursery Desk

Multi-school kindergarten management SaaS. School A never sees School B’s data.

The app lives in [`nursery-desk`](./nursery-desk). Phases 0–5 are in this repo (setup through the parent portal). Phase 6 (platform owner billing) is not built yet.

## Run

```bash
cd nursery-desk
npm install
cp .env.example .env.local
# fill DATABASE_URL, DATABASE_URL_UNPOOLED, SESSION_SECRET
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:5173/login](http://localhost:5173/login).

Demo password for every seeded user: `NurseryDesk1!`

| Role | Email |
|---|---|
| School admin | priya@littlesprouts.example |
| Teacher | anita@littlesprouts.example |
| Parent | rahul@littlesprouts.example |
| Platform owner | owner@nurserydesk.example |
| Rainbow Kids admin (isolation) | kavitha@rainbowkids.example |
