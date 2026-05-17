# Contributing & Local Setup

This document explains how to run Forge locally and common contributor steps.

Prerequisites

- Node.js 18+ (Node 20 recommended)
- pnpm (or npm/yarn)
- A Postgres instance if you want to run with a database (or use SQLite for local testing)

Quickstart

1. Clone the repository and install dependencies:

```bash
pnpm install
```

2. Copy the environment example and set values:

```bash
cp .env.example .env
# Edit .env to add real secrets (DATABASE_URL, GOOGLE_API_KEY, etc.)
```

3. Run the development server:

```bash
pnpm dev
# or
npm run dev
```

4. Open http://localhost:3000

Prisma (database)

- To run Prisma migrations or seed data (if applicable):

```bash
pnpm prisma migrate dev
pnpm prisma db seed
```

Notes & Guidance

- Use the `.env.example` as a template for required variables.
- Keep secrets out of git; use your host's secret manager for production.
- Running tests:

```bash
pnpm test
```

- Formatting & linting:

```bash
pnpm lint
```

Want me to add a GitHub Actions workflow for linting/type-check/tests next?