import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrg, useUpdateOrg } from "@/lib/queries";
import { PageHeader } from "@/components/app/ui-bits";
import { COMMON_CURRENCIES, type OrgUpdateInput } from "@/lib/shared";
import { errMsg } from "@/lib/format";
import { toast } from "sonner";

export default function Settings() {
  const { data: org, isLoading } = useOrg();
  const update = useUpdateOrg();

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    website: "",
    taxId: "",
    brandColor: "#34302a",
    defaultCurrency: "USD",
    defaultTaxRate: "0",
    defaultPaymentTerms: "30",
    defaultNotes: "",
    defaultTerms: "",
    taxSetAsidePercent: "25",
  });

  useEffect(() => {
    if (org) {
      setForm({
        name: org.name,
        email: org.email ?? "",
        phone: org.phone ?? "",
        website: org.website ?? "",
        taxId: org.taxId ?? "",
        brandColor: org.brandColor,
        defaultCurrency: org.defaultCurrency,
        defaultTaxRate: String(org.defaultTaxRate),
        defaultPaymentTerms: String(org.defaultPaymentTerms),
        defaultNotes: org.defaultNotes ?? "",
        defaultTerms: org.defaultTerms ?? "",
        taxSetAsidePercent: String(org.taxSetAsidePercent ?? 25),
      });
    }
  }, [org]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const input: OrgUpdateInput = {
      name: form.name.trim(),
      email: form.email || null,
      phone: form.phone || null,
      website: form.website || null,
      taxId: form.taxId || null,
      brandColor: form.brandColor,
      defaultCurrency: form.defaultCurrency,
      defaultTaxRate: parseFloat(form.defaultTaxRate) || 0,
      defaultPaymentTerms: parseInt(form.defaultPaymentTerms) || 30,
      defaultNotes: form.defaultNotes || null,
      defaultTerms: form.defaultTerms || null,
      taxSetAsidePercent: parseFloat(form.taxSetAsidePercent) || 25,
    };
    update.mutate(input, {
      onSuccess: () => toast.success("Settings saved."),
      onError: (err) => toast.error(errMsg(err)),
    });
  };

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-xl bg-secondary/60" />;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Settings" subtitle="Your business details and invoice defaults." />

      <form onSubmit={save} className="space-y-6">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-display text-lg font-semibold">Business</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="s-name">Business name</Label>
              <Input id="s-name" value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-email">Email</Label>
              <Input id="s-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-phone">Phone</Label>
              <Input id="s-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-website">Website</Label>
              <Input id="s-website" value={form.website} onChange={(e) => set("website", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-taxid">Tax ID</Label>
              <Input id="s-taxid" value={form.taxId} onChange={(e) => set("taxId", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-color">Brand color</Label>
              <div className="flex items-center gap-2">
                <input
                  id="s-color"
                  type="color"
                  value={form.brandColor}
                  onChange={(e) => set("brandColor", e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-md border border-input bg-transparent"
                />
                <Input value={form.brandColor} onChange={(e) => set("brandColor", e.target.value)} />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-4 font-display text-lg font-semibold">Invoice defaults</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Default currency</Label>
              <Select value={form.defaultCurrency} onValueChange={(v) => set("defaultCurrency", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMON_CURRENCIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.code} — {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-terms-days">Payment terms (days)</Label>
              <Input
                id="s-terms-days"
                type="number"
                min={0}
                value={form.defaultPaymentTerms}
                onChange={(e) => set("defaultPaymentTerms", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="s-tax">Default tax rate (%)</Label>
              <Input
                id="s-tax"
                type="number"
                min={0}
                step="any"
                value={form.defaultTaxRate}
                onChange={(e) => set("defaultTaxRate", e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="s-notes">Default notes</Label>
              <Textarea
                id="s-notes"
                rows={2}
                value={form.defaultNotes}
                onChange={(e) => set("defaultNotes", e.target.value)}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="s-terms">Default terms</Label>
              <Textarea
                id="s-terms"
                rows={2}
                value={form.defaultTerms}
                onChange={(e) => set("defaultTerms", e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="mb-1 font-display text-lg font-semibold">Tax &amp; profitability</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Used to estimate your tax obligation from collected revenue.
          </p>
          <div className="max-w-xs">
            <Label htmlFor="s-tax-aside">Tax set-aside rate (%)</Label>
            <Input
              id="s-tax-aside"
              type="number"
              min={0}
              max={100}
              step="any"
              value={form.taxSetAsidePercent}
              onChange={(e) => set("taxSetAsidePercent", e.target.value)}
            />
            <p className="mt-1.5 text-xs text-muted-foreground">
              e.g. 25 means 25% of every paid invoice is reserved for taxes.
            </p>
          </div>
        </section>

        <div className="flex justify-end">
          <Button type="submit" disabled={update.isPending} className="gap-1">
            {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {update.isPending ? "Saving…" : "Save settings"}
          </Button>
        </div>
      </form>
    </div>
  );
}
