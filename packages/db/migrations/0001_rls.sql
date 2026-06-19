-- InvoiceForge — Row-Level Security (blueprint §13 multi-tenancy)
-- Apply AFTER drizzle-kit generates the base table migration.
-- Set the current org for a request with:  SET app.current_org = '<uuid>';

CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Helper: read current org from session GUC.
CREATE OR REPLACE FUNCTION current_org_id() RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_org', true), '')::uuid;
$$ LANGUAGE sql STABLE;

DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'clients','invoices','estimates','expenses','templates',
    'automations','ai_conversations','audit_logs','users'
  ];
BEGIN
  FOREACH t IN ARRAY tenant_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS org_isolation ON %I;', t);
    EXECUTE format(
      'CREATE POLICY org_isolation ON %I USING (org_id = current_org_id()) WITH CHECK (org_id = current_org_id());',
      t
    );
  END LOOP;
END $$;

-- Trigram index for client name search (blueprint §4 pg_trgm search)
CREATE INDEX IF NOT EXISTS clients_name_trgm_idx ON clients USING gin (name gin_trgm_ops);
