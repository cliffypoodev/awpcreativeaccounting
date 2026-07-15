# AWP Accounting

Private accounting and production-management workspace for AWP Creative.

## Applications

- `apps/web` — Vite, React, TypeScript, Tailwind, and React Query frontend.
- `apps/backend` — Hono, Prisma, and SQLite API for the Mac Studio server.

The product opens directly into the private single-user workspace. It does not include sign-in, a public marketing site, or a pricing site.

## Security baseline

- The API binds to `127.0.0.1` by default and provisions one owner from `SINGLE_USER_NAME` and `SINGLE_USER_EMAIL`.
- `SINGLE_USER_EMAIL` is the stable owner identity. Set it before entering real data and do not change it later.
- CORS is restricted by `FRONTEND_URL`.
- Secrets, local databases, dependencies, and generated output are excluded from Git.
- Because there is no application sign-in, the backend must stay on a private network or behind an access-controlled tunnel/reverse proxy. Do not expose its port directly to the public internet.

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
- Backend: the Mac Studio, reachable only through a private or access-controlled HTTPS endpoint.
- Database: a persistent database path on the Mac with encrypted backups.

The Vercel environment variable `VITE_BACKEND_URL` must point to the production API URL. The backend variables are documented in `apps/backend/.env.example`.
