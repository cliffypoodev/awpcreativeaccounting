import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { pathToFileURL } from "node:url";
import { env } from "./env";
import { logger } from "hono/logger";
import { ZodError } from "zod";
import { auth } from "./auth";
import type { AppContext } from "./lib/context";
import { orgRouter } from "./routes/org";
import { clientsRouter } from "./routes/clients";
import { invoicesRouter } from "./routes/invoices";
import { estimatesRouter } from "./routes/estimates";
import { expensesRouter } from "./routes/expenses";
import { dashboardRouter } from "./routes/dashboard";
import { meRouter } from "./routes/me";
import { aiRouter } from "./routes/ai";
import { tagsRouter } from "./routes/tags";
import { projectsRouter } from "./routes/projects";
import { recurringRouter } from "./routes/recurring";
import { projectCostsRouter } from "./routes/project-costs";
import { profitabilityRouter } from "./routes/profitability";
import { deliverablesRouter } from "./routes/deliverables";
import { costsRouter } from "./routes/costs";

const app = new Hono<AppContext>();

// CORS middleware - validates origin against allowlist
const allowed = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

app.use(
  "*",
  cors({
    origin: (origin) =>
      origin && (origin === env.FRONTEND_URL || allowed.some((re) => re.test(origin)))
        ? origin
        : null,
    credentials: true,
  })
);

app.use("*", logger());

// Auth middleware — populates user/session for all routes
app.use("*", async (c, next) => {
  if (c.req.path === "/health" || c.req.path.startsWith("/api/auth/")) {
    c.set("user", null);
    c.set("session", null);
    await next();
    return;
  }

  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ?? null);
  c.set("session", session?.session ?? null);
  await next();
});

// Centralized error handling → { error: { message, code } }
app.onError((err, c) => {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const path = first?.path.join(".");
    return c.json(
      { error: { message: `${path ? path + ": " : ""}${first?.message ?? "Invalid input"}`, code: "validation_error" } },
      400
    );
  }
  console.error("[error]", err);
  return c.json({ error: { message: "Internal server error", code: "internal" } }, 500);
});

// Health check
app.get("/health", (c) => c.json({ status: "ok" }));

// Better Auth handler
app.on(["GET", "POST"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// App routes (all org-scoped, require auth)
app.route("/api/me", meRouter);
app.route("/api/org", orgRouter);
app.route("/api/clients", clientsRouter);
app.route("/api/invoices", invoicesRouter);
app.route("/api/estimates", estimatesRouter);
app.route("/api/expenses", expensesRouter);
app.route("/api/dashboard", dashboardRouter);
app.route("/api/ai", aiRouter);
app.route("/api/tags", tagsRouter);
app.route("/api/projects/:projectId/costs", projectCostsRouter);
app.route("/api/projects", projectsRouter);
app.route("/api/recurring", recurringRouter);
app.route("/api/profitability", profitabilityRouter);
app.route("/api/deliverables", deliverablesRouter);
app.route("/api/costs", costsRouter);

const port = Number(env.PORT);

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  serve({ fetch: app.fetch, port }, () => {
    console.info(`AWP Accounting API listening on http://localhost:${port}`);
  });
}

export default app;
export { app };
