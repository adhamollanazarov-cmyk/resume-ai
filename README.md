# AI Resume Analyzer

An AI-powered resume analysis SaaS built with FastAPI, Next.js, PostgreSQL, Groq, GitHub Auth, and Stripe. Users can upload a PDF resume, compare it to a job description, receive structured AI recommendations, save successful analyses, manage plan access, and upgrade to Pro through Stripe Checkout.

The current codebase is positioned as a polished MVP with real authentication, protected dashboard flows, usage limits, Stripe upgrade paths, and production-oriented security controls.

## Live Demo

Replace these placeholders with your real deployment URLs before sharing the project publicly:

- Frontend: [https://your-vercel-app.vercel.app](https://your-vercel-app.vercel.app)
- Backend API: [https://your-railway-app.up.railway.app](https://your-railway-app.up.railway.app)
- API docs: [https://your-railway-app.up.railway.app/docs](https://your-railway-app.up.railway.app/docs)

## Project Summary

This application helps job seekers tailor a resume to a specific role. It accepts a PDF resume and job description, extracts resume text, sends the content to Groq for structured analysis, stores successful results in PostgreSQL, and presents the result in a calm SaaS-style dashboard with account, billing, and saved-analysis flows.

## Tech Stack

### Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS
- NextAuth/Auth.js with GitHub OAuth

### Backend

- FastAPI
- SQLAlchemy 2.x async
- PostgreSQL
- Alembic
- Groq Python SDK
- Stripe Python SDK
- Prometheus-compatible metrics

### Deployment

- Vercel for the frontend
- Railway for the FastAPI backend and PostgreSQL

## Core Features

- PDF resume upload with server-side validation
- Job description analysis against resume content
- Structured AI output:
  - match score
  - score reasoning
  - missing skills
  - keyword gaps
  - resume improvements
  - rewritten bullets
  - optimized resume
  - cover letter
  - risk flags
- Anonymous analysis support
- GitHub sign-in with protected dashboard
- Free vs Pro plan handling
- Usage limit enforcement for signed-in free users
- Saved analysis history for authenticated users
- Protected saved-analysis detail pages
- Stripe Checkout upgrade flow
- Stripe Billing Portal for Pro users
- Prometheus-style operational metrics

## Product Flows

### Auth

- Users sign in with GitHub via NextAuth/Auth.js.
- The frontend syncs the signed-in user into PostgreSQL through an internal backend endpoint.
- That backend route is `POST /api/auth/sync-user`, and the deployed Railway API docs should show it.
- The dashboard and saved-analysis detail pages are protected server-side.

### Resume Analysis

- The user uploads a PDF and pastes a job description.
- The frontend sends the request through a local proxy route.
- If the user is signed in, the proxy attaches trusted internal headers so the backend can associate the analysis with that user.
- The backend validates the file, extracts text, calls Groq, and stores successful results.

### Plans and Usage Limits

- Anonymous users can still analyze without login.
- Signed-in free users can complete 3 successful analyses total.
- Signed-in Pro users are unlimited.
- If a signed-in free user reaches the limit, the backend blocks the request before calling Groq and returns:

```json
{ "detail": "Free analysis limit reached. Upgrade to Pro to continue." }
```

### Billing

- Signed-in users can start a Stripe Checkout upgrade session.
- Stripe webhooks mark the user as `pro` after successful payment and restore `free` if the Stripe subscription is deleted.
- Pro users with a stored Stripe customer id can open the Stripe Billing Portal from the dashboard.

## Architecture Overview

### Frontend

- Landing page with analyzer workspace
- Login page
- Protected dashboard
- Protected saved-analysis detail page
- Local proxy routes for:
  - analyze
  - Stripe checkout session creation
  - Stripe billing portal session creation

### Backend

- FastAPI app with:
  - health endpoint
  - analyze endpoint
  - public history endpoints
  - user-scoped account history endpoints
  - auth sync endpoint
  - Stripe billing endpoints
  - metrics endpoint

### Data Layer

- PostgreSQL via SQLAlchemy async
- Alembic migrations
- `users` table for identity, plan, and Stripe customer/subscription mapping
- `analyses` table for saved successful analysis results

See [docs/ARCHITECTURE.md](<C:\Users\LENOVO\Documents\New project\docs\ARCHITECTURE.md>) for the deeper architecture walkthrough.

## Auth, Stripe, and Usage Limits

### Authentication

- GitHub login is handled in NextAuth/Auth.js.
- The backend trusts user identity only through internal server-to-server requests protected by `INTERNAL_API_SECRET`.
- Browser clients never call the privileged auth sync or billing endpoints directly.

### Stripe

- Checkout upgrades authenticated users to Pro.
- Webhooks are signature-verified before plan updates.
- Billing Portal access is available only to authenticated users with a stored `stripe_customer_id`.

### Usage Limits

- Limit logic is based on `user.plan` and `user.analysis_count`.
- Free users are blocked at 3 successful analyses total.
- Pro users are not blocked.
- Anonymous users remain supported for now.

## Security Notes

- CORS is explicitly restricted to configured frontend origins.
- PDF uploads are validated by filename/content type and PDF magic bytes.
- PDF size is capped.
- Job descriptions are length-limited.
- `/api/cv/analyze` is rate-limited by IP.
- Stripe secrets stay backend-only.
- Stripe webhooks require signature verification.
- Dashboard and saved-analysis pages are protected.
- User-scoped history endpoints enforce ownership and return `404` for non-owned records.
- Resume content is not exposed through metrics and should not be logged raw.

See [docs/SECURITY.md](<C:\Users\LENOVO\Documents\New project\docs\SECURITY.md>) for the security walkthrough.

## Screenshots

Recommended screenshots to add before sharing the project with clients:

1. Landing page with analyzer workspace
2. Analysis result view with score breakdown and recommendations
3. Protected dashboard with plan and recent analyses
4. Saved analysis detail page
5. Upgrade flow entry point

Suggested file locations:

- `docs/screenshots/landing.png`
- `docs/screenshots/analysis-result.png`
- `docs/screenshots/dashboard.png`
- `docs/screenshots/analysis-detail.png`
- `docs/screenshots/upgrade-cta.png`

## Project Structure

```text
.
|-- app/
|   |-- config.py
|   |-- db.py
|   |-- main.py
|   |-- metrics.py
|   |-- models.py
|   |-- repositories/
|   |   |-- analysis_repository.py
|   |   `-- user_repository.py
|   |-- schemas.py
|   |-- security.py
|   `-- services/
|       |-- ai_service.py
|       |-- pdf_parser.py
|       `-- stripe_service.py
|-- alembic/
|   `-- versions/
|       |-- 20260429_0001_create_analyses_table.py
|       |-- 20260501_0002_add_users_table.py
|       |-- 20260501_0003_add_analysis_user_id.py
|       |-- 20260501_0004_add_users_stripe_customer_id.py
|       `-- 20260501_0005_add_users_stripe_subscription_id.py
|-- docs/
|   |-- ARCHITECTURE.md
|   |-- ROADMAP.md
|   `-- SECURITY.md
|-- frontend/
|   |-- app/
|   |   |-- api/
|   |   |-- dashboard/
|   |   `-- login/
|   |-- auth.ts
|   |-- lib/
|   `-- types/
|-- scripts/
|-- tests/
|-- requirements.txt
`-- .env.example
```

## Local Setup

### 1. Backend

Install dependencies:

```bash
pip install -r requirements.txt
```

Copy env:

```bash
copy .env.example .env
```

Run the API:

```bash
uvicorn app.main:app --reload
```

### 2. Frontend

Install dependencies:

```bash
cd frontend
npm install
```

Copy env:

```bash
copy .env.example .env.local
```

Run the app:

```bash
npm run dev
```

### Local URLs

- Backend: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- Backend docs: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Frontend: [http://localhost:3000](http://localhost:3000)

## Environment Variables

### Backend

```text
APP_NAME=AI Resume & Cover Letter Generator
APP_VERSION=0.1.0
APP_ENV=development
FRONTEND_URL=http://localhost:3000
FRONTEND_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
ALLOW_VERCEL_PREVIEW_ORIGINS=false
INTERNAL_API_SECRET=change-me
USE_MOCK_AI=false
GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRO_PRICE_ID=
APP_FRONTEND_URL=http://localhost:3000
MAX_RESUME_CHARS=12000
MAX_JOB_DESCRIPTION_CHARS=6000
MAX_PDF_SIZE_MB=5
FREE_ANALYSIS_LIMIT=3
RATE_LIMIT_ANALYZE=5/minute
AI_TIMEOUT_SECONDS=25
METRICS_TOKEN=
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/resume_ai
```

### Frontend

```text
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
NEXT_PUBLIC_DEMO_AUTH=false
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
AUTH_SECRET=
AUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
INTERNAL_API_SECRET=change-me
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

### Demo auth mode

For development or client demos, you can temporarily bypass GitHub sign-in in the frontend only:

```text
NEXT_PUBLIC_DEMO_AUTH=true
```

When enabled:

- `/login` shows `Continue in demo mode`
- `/dashboard` uses a mock demo user
- backend auth, Stripe, and billing logic stay unchanged

Set it back to `false` to restore normal GitHub-only login behavior.

## Deployment Notes

### Vercel

- Deploy the Next.js frontend.
- Set the Vercel project Root Directory to `frontend`.
- Set:
  - `NEXT_PUBLIC_API_URL`
  - `GITHUB_CLIENT_ID`
  - `GITHUB_CLIENT_SECRET`
  - `AUTH_SECRET`
  - `NEXTAUTH_SECRET`
  - `AUTH_URL`
  - `NEXTAUTH_URL`
  - `INTERNAL_API_SECRET`
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

Important for Auth.js on Vercel:

- `AUTH_URL` and `NEXTAUTH_URL` should both be set to the real deployed frontend origin, for example:

```text
AUTH_URL=https://your-vercel-app.vercel.app
NEXTAUTH_URL=https://your-vercel-app.vercel.app
```

- If the Vercel Root Directory is not `frontend`, App Router API routes such as:
  - `/api/auth/[...nextauth]`
  - `/api/stripe/create-checkout`
  - `/api/stripe/portal`
  may not exist in the deployed app, even though they work locally.

### Railway

- Deploy the FastAPI backend.
- Provision PostgreSQL.
- Set:
  - `DATABASE_URL`
  - `FRONTEND_URL`
  - `FRONTEND_ORIGINS`
  - `INTERNAL_API_SECRET`
  - `GROQ_API_KEY`
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`
  - `STRIPE_PRO_PRICE_ID`
  - `APP_FRONTEND_URL`

After deployment, verify the Railway API docs include:

- `POST /api/auth/sync-user`
- `POST /api/cv/analyze`
- `GET /api/account/analyses`

### GitHub OAuth

Create a GitHub OAuth app and add these callback URLs:

```text
http://localhost:3000/api/auth/callback/github
https://resume-ai-hazel-two.vercel.app/api/auth/callback/github
```

For production on Vercel, the GitHub OAuth callback URL must be:

```text
https://resume-ai-hazel-two.vercel.app/api/auth/callback/github
```

Recommended auth env values on Vercel:

```text
AUTH_URL=https://resume-ai-hazel-two.vercel.app
NEXTAUTH_URL=https://resume-ai-hazel-two.vercel.app
AUTH_SECRET=<same strong random secret as NEXTAUTH_SECRET>
NEXTAUTH_SECRET=<same strong random secret as AUTH_SECRET>
GITHUB_CLIENT_ID=<your GitHub OAuth app client id>
GITHUB_CLIENT_SECRET=<your GitHub OAuth app client secret>
NEXT_PUBLIC_API_URL=<your Railway backend URL>
INTERNAL_API_SECRET=<same secret used by Railway>
```

The frontend auth layer now supports both `AUTH_*` and `NEXTAUTH_*` naming styles, so production does not depend on only one convention being set.

### Testing GitHub login after deploy

1. Confirm Railway is deployed with the same `INTERNAL_API_SECRET` as Vercel.
2. Open the backend docs and verify `POST /api/auth/sync-user` is present.
3. Confirm the GitHub OAuth callback URL is:

```text
https://resume-ai-hazel-two.vercel.app/api/auth/callback/github
```

4. Visit:

```text
https://resume-ai-hazel-two.vercel.app/api/auth/signin/github
```

5. Complete GitHub sign-in and verify you land on `/dashboard`.

If GitHub OAuth succeeds but backend sync is temporarily unavailable, the login session still completes and the dashboard falls back to a free-plan session until sync is available again.

### Stripe

Use the Stripe CLI locally:

```bash
stripe listen --forward-to http://127.0.0.1:8000/api/stripe/webhook
```

Stripe flow in this codebase:

- The frontend `Upgrade to Pro` button calls the local Next.js route at `/api/stripe/create-checkout`
- That route requires a valid Auth.js session, then forwards the request to FastAPI with the trusted internal user headers
- FastAPI creates a hosted Stripe Checkout Session using `STRIPE_PRO_PRICE_ID`
- Stripe sends webhook events to the Railway backend at `/api/stripe/webhook`
- `checkout.session.completed` upgrades the matched user to `plan="pro"` and stores both `stripe_customer_id` and `stripe_subscription_id`
- `customer.subscription.deleted` downgrades the user back to `plan="free"` and clears the stored subscription id
- Pro users can open Stripe Billing Portal through the local Next.js route at `/api/stripe/portal`

## Database Migrations

Apply migrations:

```bash
alembic upgrade head
```

Create a new migration:

```bash
alembic revision --autogenerate -m "describe your change"
```

Check current migration status:

```bash
alembic current
alembic history
```

On Railway:

```bash
railway run alembic upgrade head
```

## Testing

Backend:

```bash
pytest
```

Frontend:

```bash
cd frontend
npm run build
npm run typecheck
```

Smoke test:

```bash
API_BASE_URL=https://your-railway-app.up.railway.app FRONTEND_ORIGIN=https://your-vercel-app.vercel.app python scripts/smoke_test.py
```

## Additional Docs

- [Architecture](<C:\Users\LENOVO\Documents\New project\docs\ARCHITECTURE.md>)
- [Security](<C:\Users\LENOVO\Documents\New project\docs\SECURITY.md>)
- [Roadmap](<C:\Users\LENOVO\Documents\New project\docs\ROADMAP.md>)
