# AWP Accounting

Private accounting and production-management workspace for AWP Creative.

## Applications

- `apps/web` — Vite, React, TypeScript, Tailwind, and React Query frontend.
- `apps/backend` — Hono, Better Auth, Prisma, and SQLite API for the Mac Studio server.

The product routes directly to authentication. It does not include a public marketing or pricing site.

## Security baseline

- Email OTP authentication is enforced; the former demo-user bypass has been removed.
- `ALLOWED_EMAILS` limits access to explicitly authorized team members.
- CSRF protection remains enabled.
- CORS and Better Auth trusted origins are restricted by `FRONTEND_URL`.
- Secrets, local databases, dependencies, and generated output are excluded from Git.
- Production email delivery requires a configured Resend key and sender address.

## Local development

Copy each `.env.example` to `.env`, replace every placeholder, and then run:

```bash
cd apps/backend
npm ci
npm run prisma:generate
npx prisma db push
npm run dev
```

In a second terminal:

```bash
cd apps/web
npm ci
npm run dev
```

## Production layout

- Frontend: Vercel, rooted at `apps/web`.
- Backend: the Mac Studio, behind a stable authenticated HTTPS endpoint.
- Database: a persistent database path on the Mac with encrypted backups.

The Vercel environment variable `VITE_BACKEND_URL` must point to the production API URL. The backend variables are documented in `apps/backend/.env.example`.
