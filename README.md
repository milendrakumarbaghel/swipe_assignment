# AI Interview Assistant

Full-stack interview assistant that guides candidates through a timed AI-led interview while giving interviewers a live dashboard.

## Prerequisites

- Node.js 18+
- PostgreSQL database (local or remote)

## Backend setup

```bash
cd backend
cp .env.example .env # update DATABASE_URL and PORT if needed
npm install
npm run prisma:generate
npm run prisma:migrate    # requires DATABASE_URL to be reachable
npm run prisma:seed
npm run dev
```

The API runs on `http://localhost:4000`. Key endpoints:

- `POST /api/resume` – upload resume file (field `resume`)
- `POST /api/interviews` – start an interview session
- `POST /api/interviews/:id/answers` – submit an answer
- `POST /api/interviews/:id/finish` – finalize session
- `GET /api/interviews/:id` – fetch session details
- `GET /api/candidates` – list candidates (supports `search`, `sortField`, `sortOrder`)
- `GET /api/candidates/:id` – candidate detail with transcripts

### Backend tests

```bash
cd backend
npm test
```

## Frontend setup

```bash
cd frontend
cp .env.example .env # optional: set VITE_API_URL
npm install
npm run dev
```

The Vite dev server proxies `/api` and `/uploads` to the backend. Build for production with `npm run build`.

## Persistence

- Interview progress, timers, and current tab are stored via Redux Toolkit + redux-persist (localStorage).
- Backend persists candidates, sessions, questions, answers, and chat logs through PostgreSQL + Prisma.

## Welcome back flow

When a session is active or paused, reloading the page surfaces a welcome-back modal that lets the candidate resume or discard their previous interview state.

## Tech stack

- **Frontend:** React, Vite, Ant Design, Redux Toolkit, redux-persist, axios, dayjs
- **Backend:** Node.js, Express, Prisma, PostgreSQL, Multer, pdf-parse, mammoth, pino

## Scripts overview

| Location | Command | Description |
| --- | --- | --- |
| backend | `npm run dev` | Start Express server with nodemon |
| backend | `npm test` | Run Node test suite |
| backend | `npm run prisma:migrate` | Apply Prisma migrations |
| backend | `npm run prisma:seed` | Seed question templates |
| frontend | `npm run dev` | Start Vite dev server |
| frontend | `npm run build` | Build production bundle |
| frontend | `npm run lint` | Run ESLint |

## Optional enhancements

- Swap deterministic questions for live AI generation via an LLM provider.
- Add authentication for interviewer dashboards.
- Introduce WebSocket updates for real-time dashboard refresh instead of polling.
