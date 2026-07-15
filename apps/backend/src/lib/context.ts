import type { Context } from "hono";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import type { User } from "@prisma/client";
import { prisma } from "../prisma";

/** Parse + validate a JSON body against a Zod schema (throws ZodError → 400 via onError). */
export async function body<S extends z.ZodTypeAny>(
  c: Context,
  schema: S
): Promise<z.infer<S>> {
  const json = await c.req.json().catch(() => ({}));
  return schema.parse(json);
}

type SessionUser = User;

export type AppContext = {
  Variables: {
    user: SessionUser | null;
  };
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "org";

// In-process guard: on first login the webapp fires several requests at once
// (me, org, dashboard…), each calling getOrCreateOrg. Without this, they race
// and all try to INSERT the org → unique-constraint (P2002) errors. Sharing one
// promise per user collapses the burst into a single provisioning attempt.
const provisioning = new Map<string, Promise<Awaited<ReturnType<typeof createOrgForUser>>>>();

async function createOrgForUser(user: SessionUser) {
  const base = slugify(user.name || user.email.split("@")[0] || "workspace");

  // Try the friendly slug first, then fall back to random suffixes. Catching
  // P2002 makes this safe even across concurrent processes / other users.
  for (let attempt = 0; attempt < 6; attempt++) {
    // Another request (or process) may have created it in the meantime.
    const found = await prisma.organization.findFirst({ where: { ownerId: user.id } });
    if (found) return found;

    const slug = attempt === 0 ? base : `${base}-${randomBytes(3).toString("hex")}`;
    try {
      return await prisma.organization.create({
        data: {
          ownerId: user.id,
          name: user.name ? `${user.name}'s Workspace` : "My Workspace",
          slug,
          email: user.email,
        },
      });
    } catch (err) {
      const code = (err as { code?: string }).code;
      if (code !== "P2002") throw err;
      // Unique collision (our org created concurrently, or slug taken) — loop.
    }
  }

  // Exhausted retries: return whatever exists for this owner, or fail loudly.
  const fallback = await prisma.organization.findFirst({ where: { ownerId: user.id } });
  if (fallback) return fallback;
  throw new Error("Could not provision organization");
}

/**
 * Resolve the organization for the signed-in user, auto-provisioning one on
 * first access (mirrors the original signup-creates-org behavior).
 */
export async function getOrCreateOrg(user: SessionUser) {
  const existing = await prisma.organization.findFirst({
    where: { ownerId: user.id },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return existing;

  const inflight = provisioning.get(user.id);
  if (inflight) return inflight;

  const promise = createOrgForUser(user).finally(() => provisioning.delete(user.id));
  provisioning.set(user.id, promise);
  return promise;
}

/** Get the org for the current request, or throw a 401-style guard. */
export async function requireOrg(c: Context<AppContext>) {
  const user = c.get("user");
  if (!user) return null;
  return getOrCreateOrg(user);
}

export const errorJson = (c: Context, message: string, code: string, status = 400) =>
  c.json({ error: { message, code } }, status as any);

export { slugify };
