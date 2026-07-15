import { Hono } from "hono";
import { prisma } from "../prisma";
import { orgUpdateInput, type OrgRow } from "../types";
import { requireOrg, body, type AppContext } from "../lib/context";

const orgRouter = new Hono<AppContext>();

const toRow = (o: any): OrgRow => ({
  id: o.id,
  name: o.name,
  slug: o.slug,
  email: o.email,
  phone: o.phone,
  website: o.website,
  taxId: o.taxId,
  brandColor: o.brandColor,
  defaultCurrency: o.defaultCurrency,
  defaultTaxRate: o.defaultTaxRate,
  defaultPaymentTerms: o.defaultPaymentTerms,
  defaultNotes: o.defaultNotes,
  defaultTerms: o.defaultTerms,
  taxSetAsidePercent: o.taxSetAsidePercent,
  leadCaptureKey: o.leadCaptureKey,
});

orgRouter.get("/", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  return c.json({ data: toRow(org) });
});

orgRouter.patch("/", async (c) => {
  const org = await requireOrg(c);
  if (!org) return c.body(null, 401);
  const input = await body(c, orgUpdateInput);
  const updated = await prisma.organization.update({
    where: { id: org.id },
    data: { ...input, email: input.email || null },
  });
  return c.json({ data: toRow(updated) });
});

export { orgRouter };
