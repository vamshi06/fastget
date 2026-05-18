# Fastget

Rapid order fulfillment system built with Next.js.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Google Sheets (MVP database)

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # Run ESLint
npm run typecheck    # Type check
```

## Project Structure

```
src/
├── app/             # Next.js App Router
│   ├── layout.tsx   # Root layout
│   ├── page.tsx     # Home page
│   └── api/         # API routes
├── components/      # React components
└── lib/            # Utilities and helpers
```

## gstack Skills

Available gstack skills in this project:
- `/office-hours` - Product planning
- `/plan-ceo-review` - Strategic review
- `/plan-eng-review` - Architecture review
- `/ship` - Create PRs
- `/qa` - Test the application
- `/cso` - Security audit
- `/review` - Code review

## Database Strategy

**Current:** Neon Postgres (Production)
**Legacy:** Google Sheets via Apps Script (Deprecated - Not in use)

All orders are stored in Neon Postgres. The database layer lives in `src/lib/db.ts`.

### Neon Setup
- **Database:** PostgreSQL 17.8 on AWS ap-southeast-1
- **Schema:** `orders` table with 17 columns
- **Connection:** @neondatabase/serverless SDK
- **Environment:** `fastget_DATABASE_URL` in .env.local and Vercel
