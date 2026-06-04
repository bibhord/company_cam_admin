-- Service catalog: per-org category + service rows that drive the public
-- "Services" section on portfolios and (Phase 2) the booking flow.
-- Templates live in code (lib/service-templates.ts), not in this schema.

CREATE TABLE service_categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name        text NOT NULL,
  sort_order  int  NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX service_categories_org_idx ON service_categories(org_id, sort_order);

CREATE TABLE services (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_id   uuid REFERENCES service_categories(id) ON DELETE SET NULL,
  name          text NOT NULL,
  description   text,
  duration_min  int  NOT NULL DEFAULT 30,
  price_cents   int,                       -- NULL = "quote on request"
  price_type    text NOT NULL DEFAULT 'fixed' CHECK (price_type IN ('fixed','from')),
  is_active     bool NOT NULL DEFAULT true,
  sort_order    int  NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX services_org_idx ON services(org_id, sort_order);
CREATE INDEX services_category_idx ON services(category_id);

ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE services           ENABLE ROW LEVEL SECURITY;

-- Authenticated org members can read + manage their own org's catalog.
CREATE POLICY service_categories_org_access ON service_categories
  FOR ALL USING (org_id = (SELECT org_id FROM _v_me))
  WITH CHECK (org_id = (SELECT org_id FROM _v_me));

CREATE POLICY services_org_access ON services
  FOR ALL USING (org_id = (SELECT org_id FROM _v_me))
  WITH CHECK (org_id = (SELECT org_id FROM _v_me));

-- Public read so the portfolio site (no auth) can list services for a
-- published org. Only active services count.
CREATE POLICY service_categories_public_read ON service_categories
  FOR SELECT TO anon
  USING (
    EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = service_categories.org_id AND o.portfolio_published = true
    )
  );

CREATE POLICY services_public_read ON services
  FOR SELECT TO anon
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM organizations o
      WHERE o.id = services.org_id AND o.portfolio_published = true
    )
  );
