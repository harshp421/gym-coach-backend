# Gym Coach — Backend

Express 5 + TypeScript + Postgres API for the gym-coach app. Authenticates users via cookie-session, generates rule-based workout plans, runs AI-generated diet plans through Groq, and serves an exercise catalog plus chat coach.

## Quick start

```bash
# 1. Install deps
npm install

# 2. Copy and fill in environment
cp .env.example .env
# edit .env — at minimum: GYM_POSTGRES_URI, GYM_JWT_SECRET, SMTP_*

# 3. Apply migrations (idempotent)
npm run migrate

# 4. Seed the exercise catalog (~880 rows, once)
npm run seed:exercises

# 5. (Optional) Seed a deterministic test user
npm run seed:test-user
# Login: panthchomu@gmail.com / panthchomu

# 6. Run API + email worker side-by-side
npm run dev
```

API is now at `http://localhost:3000` (or whatever `PORT` you set). Hit `GET /health` to confirm.

## Stack

- **Express 5** running ESM via `tsx watch` in dev
- **PostgreSQL** via `pg` driver + raw SQL (no ORM)
- **Zod** for env validation + request body validation
- **bcrypt** for password hashing, **jsonwebtoken** for HS256 session JWTs in HttpOnly cookies
- **nodemailer** for SMTP-backed email; queued through a Postgres-backed worker (`mail_queue`)
- **Groq** (OpenAI-compatible API) for the AI coach and diet plan generator
- **Upstash Redis** (optional) for distributed cache + rate limiting; in-process fallback otherwise
- **Cloudinary** (frontend-direct upload) for chat photo attachments — no backend touch
- **Swagger UI** at `/docs` in non-production environments

## Project structure

```
backend/
├── migration/                    # versioned SQL files + seed scripts
│   ├── migrate.ts                # runs every .sql file in order, idempotent
│   ├── seed-exercises.ts         # populates `exercises` from data/exercises.json
│   ├── seed-test-user.ts         # deterministic test user with history
│   └── *.sql
├── data/
│   └── exercises.json            # free-exercise-db catalog (MIT)
└── src/
    ├── server.ts                 # API entrypoint
    ├── worker.ts                 # email worker entrypoint (separate process)
    ├── app.ts                    # Express app — middleware + router mounts
    ├── config/
    │   ├── env.config.ts         # zod-validated env, exits on missing required vars
    │   └── dbConnect.ts          # pg.Pool + connection helpers
    ├── middleware/
    │   ├── requireAuth.ts        # extracts user from gc_session cookie
    │   ├── requireVerifiedEmail.ts
    │   ├── rateLimit.ts          # Upstash sliding window or in-process fallback
    │   ├── validate.ts           # zod request body validator
    │   └── requestLogger.ts      # one-line access log per request
    ├── utils/
    │   ├── email/                # sender (nodemailer) + queue.service + worker
    │   ├── jwt.ts
    │   ├── password.ts
    │   ├── http-error.ts
    │   └── req-helpers.ts
    ├── features/                 # vertical slices — types, schemas, service,
    │   ├── auth/                 # controller, routes per feature
    │   ├── profile/
    │   ├── exercises/
    │   ├── workouts/
    │   ├── diet/
    │   └── coach/
    └── docs/openapi.ts           # OpenAPI 3 spec for Swagger UI
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | API + worker side-by-side via `concurrently`, both on `tsx watch` |
| `npm run dev:api` | API only |
| `npm run dev:worker` | Email worker only |
| `npm run build` | `tsc` to `dist/` |
| `npm run start` | Run compiled `dist/server.js` (production) |
| `npm run start:worker` | Run compiled `dist/worker.js` (production) |
| `npm run migrate` | Apply every `migration/*.sql` in order. Idempotent — safe to re-run. |
| `npm run seed:exercises` | Populate `exercises` table from `data/exercises.json` (~880 rows) |
| `npm run seed:test-user` | Insert a deterministic test user with profile, plan, body metrics, completed sessions |

## Environment variables

See [.env.example](./.env.example) for the full list with comments. Required:

- `GYM_POSTGRES_URI`
- `GYM_JWT_SECRET` (≥32 chars)
- `GYM_ENVIRONMENT`
- `PORT`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`

Optional (degrade gracefully):
- `GROQ_API_KEY` — missing → `/coach/*` and `/diet/plan/generate` return 503
- `GOOGLE_CLIENT_ID` — missing → `/auth/oauth` returns 501
- `UPSTASH_REDIS_REST_URL/_TOKEN` — missing → in-process cache + rate-limit fallback

## Architecture notes

### Auth
- Email/password and Google OAuth both supported
- Session JWT lives in an HttpOnly cookie (`gc_session`) — invisible to JavaScript, defends against XSS
- Email verification required before reaching the dashboard (frontend gates this)
- Password reset uses single-use tokens stored hashed in `password_reset_tokens`
- Rate-limited at 10 requests/10 minutes on credential endpoints

### Email
- nodemailer transporter pool (3 connections), keepalive
- Sends are queued in `mail_queue` (Postgres) — never inline with the request
- The **worker** process polls every 5s with `FOR UPDATE SKIP LOCKED`, retries with exponential backoff (1m → 16m), gives up after 5 attempts
- Missing SMTP env → sender falls back to `console.log` so dev doesn't need real credentials

### Database migrations
- Plain `.sql` files in `migration/`, numbered with a 4-digit prefix
- `migrate.ts` runs them in filename order
- Every statement must be idempotent (`CREATE … IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, etc.) — re-running the migrate script is a no-op if nothing changed
- Never edit a migration once it's been applied anywhere shared — add a new one

### Rate limiting
- `rateLimit("auth")` — 10 reqs/10 min, defends credential stuffing
- `rateLimit("coach")` — 20 reqs/hour, protects Groq spend
- `rateLimit("diet")` — 10 reqs/hour, same reason
- `rateLimit("api")` — 300 reqs/15 min global catch-all
- Backed by Upstash Redis sliding window; falls back to per-instance memory if Upstash isn't configured

### Connection pooling
- One `pg.Pool` for the whole app (10 max connections, 10s idle timeout)
- `withConnectionRetry()` wraps queries that touch the pool to handle Neon's aggressive idle eviction — pg drops the bad socket, retry hits a fresh one
- Pool drains on SIGTERM with a 10s force-exit timer

## API docs

Swagger UI: `http://localhost:3000/docs`  ·  raw spec: `/docs.json`

Docs are mounted automatically when `GYM_ENVIRONMENT !== "production"`. Set `GYM_DOCS_ENABLED=1` to expose in production.

## Deployment notes

- Set `GYM_ENVIRONMENT=production` — flips cookies to `Secure + SameSite=none`, enables `trust proxy`, hides Swagger
- Run **API and worker as separate processes** in production. They share the same image but different entrypoints (`npm run start` vs `npm run start:worker`). Don't run two workers without a shared rate-limiter (Upstash) or they'll fight over the rate-limit bucket.
- DB migrations should run as a one-shot before the API boots
- Cookies require HTTPS in production (`Secure` flag is set automatically)
