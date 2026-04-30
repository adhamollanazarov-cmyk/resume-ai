# AI Resume & Cover Letter Generator

FastAPI backend and Next.js frontend for resume parsing and AI-powered resume analysis.

This version accepts a resume PDF and a job description, extracts raw text from the PDF with PyPDF2, can generate an OpenAI-powered analysis, and can optionally persist successful analyses to PostgreSQL.

## Project Structure

```text
.
|-- app/
|   |-- __init__.py
|   |-- config.py
|   |-- db.py
|   |-- main.py
|   |-- models.py
|   |-- repositories/
|   |   |-- __init__.py
|   |   `-- analysis_repository.py
|   |-- schemas.py
|   `-- services/
|       |-- __init__.py
|       |-- ai_service.py
|       `-- pdf_parser.py
|-- alembic/
|   |-- env.py
|   `-- versions/
|       `-- 20260429_0001_create_analyses_table.py
|-- alembic.ini
|-- frontend/
|   |-- app/
|   |-- lib/
|   |-- package.json
|   |-- tailwind.config.ts
|   `-- README.md
|-- tests/
|   |-- test_ai_service.py
|   |-- test_analyze.py
|   `-- test_health.py
|-- requirements.txt
|-- .env.example
`-- README.md
```

## Setup

Create and activate a virtual environment, then install dependencies:

```bash
pip install -r requirements.txt
```

Copy the example environment file if you want local overrides:

```bash
copy .env.example .env
```

The application reads settings from `.env` using `pydantic-settings`.

To enable AI analysis, set `OPENAI_API_KEY` in `.env`. The model defaults to `OPENAI_MODEL=gpt-4o-mini`. Input text sent to OpenAI is trimmed with `MAX_RESUME_CHARS` and `MAX_JOB_CHARS`.

For local development without OpenAI, you can enable:

```text
USE_MOCK_AI=true
```

Uploaded PDFs are limited by:

```text
MAX_PDF_SIZE_MB=5
```

To enable PostgreSQL persistence, set:

```text
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/resume_ai
```

If `DATABASE_URL` is not configured, the API still works and simply skips database persistence.

## Run

Run the backend:

```bash
uvicorn app.main:app --reload
```

The API will be available at:

```text
http://127.0.0.1:8000
```

Interactive API docs:

```text
http://127.0.0.1:8000/docs
```

Health check:

```text
http://127.0.0.1:8000/health
```

Run the frontend:

```bash
cd frontend
npm install
npm run dev
```

The frontend expects the backend at:

```text
http://127.0.0.1:8000
```

You can configure this with `frontend/.env.local`:

```text
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

## Endpoint

### POST `/api/cv/analyze`

Accepts multipart form data:

- `pdf`: PDF resume file
- `job_description`: target job description text

Example request:

```bash
curl -X POST "http://127.0.0.1:8000/api/cv/analyze" \
  -F "pdf=@resume.pdf;type=application/pdf" \
  -F "job_description=Senior Python backend role with FastAPI experience"
```

Example response:

```json
{
  "resume_text_preview": "Jane Doe\nBackend Engineer\n...",
  "job_description": "Senior Python backend role with FastAPI experience",
  "analysis": {
    "match_score": 82,
    "score_reasoning": "The resume shows strong backend development experience, but several target platform keywords are missing.",
    "missing_skills": ["Docker", "AWS"],
    "keyword_gaps": ["microservices", "CI/CD"],
    "resume_improvements": [
      "Add measurable backend performance results",
      "Mention API testing and deployment workflows"
    ],
    "rewritten_bullets": [
      "Built and maintained FastAPI services for internal business tools",
      "Improved API response times by optimizing database queries",
      "Collaborated with product teams to deliver backend features on schedule",
      "Strengthened API reliability through clearer validation and error handling"
    ],
    "optimized_resume": "PROFESSIONAL SUMMARY\n- Backend engineer with Python and FastAPI experience.\n...",
    "cover_letter": "Dear Hiring Manager,\n\nI am excited to apply for the role...\n\nThank you for your consideration.",
    "risk_flags": ["Cloud deployment experience is not clearly shown."]
  },
  "status": "OK"
}
```

## Validation

- Non-PDF uploads return `400 Bad Request`.
- Empty job descriptions return `400 Bad Request`.
- Invalid, empty, or unreadable PDFs return `422 Unprocessable Entity`.
- If OpenAI is unavailable or not configured, the API still returns a successful response with `analysis: null`.
- If PostgreSQL is unavailable or save fails, the API still returns a successful response.

## Database Migrations

Create a new migration:

```bash
alembic revision --autogenerate -m "create analyses table"
```

Apply migrations:

```bash
alembic upgrade head
```

## Tests

Run the test suite with:

```bash
pytest
```
