# Roadmap

This roadmap focuses on practical next steps for turning the current MVP into a more complete SaaS product.

## Product Features

### 1. Usage and Plan Expansion

- monthly usage limits instead of lifetime free limits
- richer plan metadata
- account-level billing status in the dashboard
- self-serve downgrade and cancellation messaging

### 2. Analysis History UX

- pagination for saved analyses
- search and filter by role or score
- compare two saved analyses side by side
- pin or favorite strong applications

### 3. Export Improvements

- richer PDF export for optimized resume
- richer PDF export for cover letter
- DOCX export
- branded shareable report view

### 4. Admin Dashboard

- user counts
- plan distribution
- analysis volume trends
- AI failure rate
- billing health summary

## AI Quality Improvements

- improve prompt tuning for role-specific industries
- add optional tone selection for cover letters
- better ATS keyword normalization
- more nuanced bullet rewriting by seniority level
- optional multi-pass AI evaluation for higher-confidence scoring
- confidence indicators for weaker heuristic sections

## Observability

- structured logs for key flows
- request tracing across frontend proxy to backend
- alerting on Groq failures and Stripe webhook failures
- distributed rate-limit storage
- dashboarding for:
  - analysis throughput
  - billing upgrades
  - failed uploads
  - latency percentiles

## Security and Reliability

- Redis-backed rate limiting
- virus/malware scanning for uploaded files
- background job queue for long-running AI tasks
- retriable webhook processing with idempotency tracking
- audit log for important account and billing events

## Data Model Enhancements

- attach analyses to job titles and company names
- store billing subscription ids when subscription management expands
- soft-delete support for saved analyses
- add user preferences and profile settings

## Frontend UX Improvements

- richer dashboard summary cards
- application tracker built on saved analyses
- recent activity feed
- reusable screenshot assets for portfolio presentation
- in-app toasts and richer loading states for billing flows

## Developer Experience

- CI workflow for backend and frontend validation
- seeded demo data for local presentation
- production-like local Docker stack
- API contract tests between frontend proxy routes and backend endpoints
- Playwright smoke tests for auth, analysis, and billing entry points

## Nice-to-Have Enhancements

- multilingual resume analysis
- recruiter-facing share links
- collaborative notes on saved analyses
- interview preparation suggestions
- company-specific tailoring packs
