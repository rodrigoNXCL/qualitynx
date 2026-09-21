CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(120) NOT NULL,
  company VARCHAR(255) NOT NULL,
  role VARCHAR(120) NOT NULL DEFAULT '',
  whatsapp VARCHAR(30) NOT NULL,
  fruit_type VARCHAR(120) NOT NULL DEFAULT '',
  company_type VARCHAR(50) NOT NULL DEFAULT '',
  problem TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_company_type ON leads(company_type);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE POLICY "leads_public_insert"
  ON leads
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "leads_super_admin_select"
  ON leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM users
      WHERE users.auth_id = auth.uid()
        AND users.role = 'SUPER_ADMIN'
        AND users.is_active = true
    )
  );
