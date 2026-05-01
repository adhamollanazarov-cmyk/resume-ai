# AI Resume & Cover Letter Generator Frontend

Next.js frontend for the FastAPI resume analysis backend.

## Setup

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
copy .env.example .env.local
```

The backend must be running on:

```text
http://127.0.0.1:8000
```

For Vercel deployment:

- set the project Root Directory to `frontend`
- set:
  - `NEXT_PUBLIC_API_URL`
  - `GITHUB_CLIENT_ID`
  - `GITHUB_CLIENT_SECRET`
  - `AUTH_SECRET`
  - `AUTH_URL`
  - `INTERNAL_API_SECRET`

Example:

```text
AUTH_URL=https://your-vercel-app.vercel.app
```

If the Root Directory is not `frontend`, routes like `/api/auth/[...nextauth]` will not be included in the deployment.

## Run

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```
