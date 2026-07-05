-- ==========================================
-- Supabase Schema för Kalkylprogrammet
-- ==========================================

-- 1. Företag / Organisation (Data Space)
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    org_nr TEXT,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    ort TEXT,
    lan TEXT,
    land TEXT DEFAULT 'Sverige',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Profiler / Användare
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id),
    email TEXT,
    full_name TEXT,
    phone TEXT,
    title TEXT,
    role TEXT CHECK (role IN ('admin', 'manager', 'user', 'viewer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Mappar (Folders)
CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Projekt
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    folder_id TEXT REFERENCES folders(id) ON DELETE SET NULL,
    nr TEXT,
    name TEXT NOT NULL,
    client TEXT,
    client_org_nr TEXT,
    client_contact TEXT,
    client_email TEXT,
    client_phone TEXT,
    ort TEXT,
    lan TEXT,
    land TEXT DEFAULT 'Sverige',
    status TEXT,
    contract_type TEXT,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Material (Företagsspecifikt eller globalt)
CREATE TABLE IF NOT EXISTS materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    cat TEXT NOT NULL,
    name TEXT NOT NULL,
    unit TEXT,
    price NUMERIC NOT NULL,
    spill NUMERIC DEFAULT 0,
    konto TEXT,
    lev TEXT,
    note TEXT,
    price_history JSONB DEFAULT '[]',
    co2_per_unit NUMERIC,
    co2_source TEXT,
    lca_indicators JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Arbetsmoment (Företagsspecifikt eller globalt)
CREATE TABLE IF NOT EXISTS arbetsmoments (
    id SERIAL PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    cat TEXT NOT NULL,
    name TEXT NOT NULL,
    tid NUMERIC NOT NULL,
    unit TEXT,
    sv NUMERIC DEFAULT 1.0,
    note TEXT,
    time_history JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Kalkylens Byggdelar (Kopplad till Projekt)
-- Eftersom projekt och byggdelar för tillfället sparas som stora JSON blobbar
-- kan man antingen behålla JSON för just kalkylträdet (pga avancerad state-hantering)
-- eller normalisera. En hybrid approch är ofta bäst från början.
CREATE TABLE IF NOT EXISTS project_byggdelar (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id TEXT,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Offerter (Anbud / Inköp)
CREATE TABLE IF NOT EXISTS leverantor_offert (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    project_id TEXT,
    anbud_id UUID NULL,
    leverantor TEXT,
    typ TEXT CHECK (typ IN ('ue', 'leverantor')),
    valuta TEXT DEFAULT 'SEK',
    status TEXT DEFAULT 'inkommen',
    poster JSONB,
    fast_tillagg NUMERIC DEFAULT 0,
    giltig_till DATE NULL,
    "not" TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leverantor_offert_project_id ON leverantor_offert(project_id);
CREATE INDEX IF NOT EXISTS idx_leverantor_offert_anbud_id ON leverantor_offert(anbud_id);

ALTER TABLE IF EXISTS leverantor_offert DROP CONSTRAINT IF EXISTS leverantor_offert_project_id_fkey;
ALTER TABLE IF EXISTS project_byggdelar DROP CONSTRAINT IF EXISTS project_byggdelar_project_id_fkey;

-- 9. Byggdel Recept (Receptbibliotek)
CREATE TABLE IF NOT EXISTS byggdel_recept (
    id UUID PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    kod TEXT,
    namn TEXT,
    enhet TEXT,
    byggdel_type TEXT,
    byggdelsgrupp TEXT,
    data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Projekt Utfall (EAC)
CREATE TABLE IF NOT EXISTS projekt_utfall (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL,
    line_key TEXT NOT NULL,
    ac NUMERIC,
    fardiggrad NUMERIC,
    manuell_eac NUMERIC,
    noterat_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, line_key)
);

-- 11. App State (Key-Value Store)
CREATE TABLE IF NOT EXISTS public.app_state (
    id TEXT PRIMARY KEY,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_state_company ON public.app_state(company_id);

CREATE OR REPLACE FUNCTION public.set_app_state_company_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.company_id IS NULL THEN
    NEW.company_id := (SELECT company_id FROM profiles WHERE id = auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_app_state_company_id_trigger ON public.app_state;
CREATE TRIGGER set_app_state_company_id_trigger
BEFORE INSERT OR UPDATE ON public.app_state
FOR EACH ROW
EXECUTE FUNCTION public.set_app_state_company_id();

DELETE FROM public.app_state WHERE id = 'global_users';

-- 9. Row Level Security (RLS) policies
-- Slå på RLS för varje tabell
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE arbetsmoments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_byggdelar ENABLE ROW LEVEL SECURITY;
ALTER TABLE leverantor_offert ENABLE ROW LEVEL SECURITY;
ALTER TABLE byggdel_recept ENABLE ROW LEVEL SECURITY;
ALTER TABLE projekt_utfall ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_state ENABLE ROW LEVEL SECURITY;

-- Här är det viktigt att skriva policys så att man bara ser sitt eget företags data:
CREATE POLICY "Se sitt eget företags data" ON companies
    FOR ALL USING (id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Se projekt baserat på company" ON projects
    FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Se offerter baserat på company" ON leverantor_offert
    FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Se recept baserat på company" ON byggdel_recept
    FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Se utfall baserat på company" ON projekt_utfall
    FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "materials per company" ON materials
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "arbetsmoments per company" ON arbetsmoments
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "folders per company" ON folders
  FOR ALL USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "project_byggdelar per company" ON project_byggdelar
  FOR ALL USING (project_id IN (
    SELECT id FROM projects WHERE company_id IN
      (SELECT company_id FROM profiles WHERE id = auth.uid())))
  WITH CHECK (project_id IN (
    SELECT id FROM projects WHERE company_id IN
      (SELECT company_id FROM profiles WHERE id = auth.uid())));

CREATE POLICY "profiles egen rad" ON profiles
  FOR SELECT USING (id = auth.uid()
    OR company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- App State policy (Enbart för det egna företaget)
DROP POLICY IF EXISTS "Enable all for all users" ON public.app_state;
DROP POLICY IF EXISTS "app_state egna företaget" ON public.app_state;

CREATE POLICY "app_state egna företaget"
  ON public.app_state
  FOR ALL
  USING (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())
  );


-- 12. Admin Invoices
CREATE TABLE IF NOT EXISTS public.admin_invoices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data        JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.admin_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_invoices endast admin"
  ON public.admin_invoices FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Osv. Beroende på exakt hur strikt vi vill ha det.

-- 1. Plattformsadmin-flagga (skild från företagsrollen)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_platform_admin IS
  'TRUE = global plattformsadmin med åtkomst till admin-portalen över ALLA företag. Skild från company-rollen.';

-- 2. Hjälpfunktion. SECURITY DEFINER kringgår RLS och undviker rekursion.
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT is_platform_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_platform_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated;

-- 3. RLS-override: plattformsadmin ser/ändrar ALLT i de tabeller portalen styr.
--    Permissiva policys OR:as ihop med de befintliga "per company"-policyerna.
DROP POLICY IF EXISTS "Plattformsadmin full access companies" ON public.companies;
CREATE POLICY "Plattformsadmin full access companies" ON public.companies
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Plattformsadmin full access profiles" ON public.profiles;
CREATE POLICY "Plattformsadmin full access profiles" ON public.profiles
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Plattformsadmin full access app_state" ON public.app_state;
CREATE POLICY "Plattformsadmin full access app_state" ON public.app_state
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Plattformsadmin full access materials" ON public.materials;
CREATE POLICY "Plattformsadmin full access materials" ON public.materials
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

DROP POLICY IF EXISTS "Plattformsadmin full access arbetsmoments" ON public.arbetsmoments;
CREATE POLICY "Plattformsadmin full access arbetsmoments" ON public.arbetsmoments
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- 4. Utse din egen användare till plattformsadmin (byt ut e-posten).
UPDATE public.profiles
SET is_platform_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'MToumia@gmail.com');

NOTIFY pgrst, 'reload schema';

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id          TEXT PRIMARY KEY,            -- 'free' | 'standard' | 'pro'
  name        TEXT NOT NULL,
  price_month NUMERIC NOT NULL DEFAULT 0,  -- kr/mån exkl. moms
  max_seats   INTEGER,                     -- NULL = obegränsat
  features    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id      TEXT NOT NULL REFERENCES public.subscription_plans(id),
  status       TEXT NOT NULL DEFAULT 'active'
               CHECK (status IN ('trial','active','past_due','canceled')),
  seats        INTEGER NOT NULL DEFAULT 1,
  period_start DATE NOT NULL DEFAULT CURRENT_DATE,
  period_end   DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (company_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON public.subscriptions(company_id);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions      ENABLE ROW LEVEL SECURITY;

-- Plattformsadmin styr planer & prenumerationer fullt.
CREATE POLICY "Plattformsadmin full access plans" ON public.subscription_plans
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "Plattformsadmin full access subscriptions" ON public.subscriptions
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- Företag får LÄSA sin egen prenumeration (för att kunna spärra funktioner i appen).
CREATE POLICY "Företag läser egen prenumeration" ON public.subscriptions
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Alla läser planer" ON public.subscription_plans
  FOR SELECT USING (true);

-- Seed:a basplaner.
INSERT INTO public.subscription_plans (id, name, price_month, max_seats, features) VALUES
  ('free',     'Gratis',   0,    2,    '{"bim": false, "export": false}'),
  ('standard', 'Standard', 990,  10,   '{"bim": false, "export": true}'),
  ('pro',      'Pro',      2490, NULL, '{"bim": true,  "export": true}')
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';

CREATE TABLE IF NOT EXISTS public.invoices (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  invoice_nr    TEXT NOT NULL UNIQUE,
  status        TEXT NOT NULL DEFAULT 'utkast'
                CHECK (status IN ('utkast','skickad','betald','forfallen','krediterad')),
  issue_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date      DATE,
  currency      TEXT NOT NULL DEFAULT 'SEK',
  vat_rate      NUMERIC NOT NULL DEFAULT 0.25,      -- 25 %
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.invoice_lines (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  qty         NUMERIC NOT NULL DEFAULT 1,
  unit_price  NUMERIC NOT NULL DEFAULT 0,           -- exkl. moms
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_invoices_company ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_lines_invoice ON public.invoice_lines(invoice_id);

-- Vy med summor (netto, moms, brutto) så UI slipper räkna.
CREATE OR REPLACE VIEW public.invoice_totals AS
SELECT
  i.id,
  i.company_id,
  i.invoice_nr,
  i.status,
  i.issue_date,
  i.due_date,
  i.currency,
  i.vat_rate,
  COALESCE(SUM(l.qty * l.unit_price), 0)                       AS net_amount,
  COALESCE(SUM(l.qty * l.unit_price), 0) * i.vat_rate          AS vat_amount,
  COALESCE(SUM(l.qty * l.unit_price), 0) * (1 + i.vat_rate)    AS gross_amount
FROM public.invoices i
LEFT JOIN public.invoice_lines l ON l.invoice_id = i.id
GROUP BY i.id, i.company_id, i.invoice_nr, i.status, i.issue_date, i.due_date, i.currency, i.vat_rate;

ALTER TABLE public.invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plattformsadmin full access invoices" ON public.invoices
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "Plattformsadmin full access invoice_lines" ON public.invoice_lines
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());

-- Företag får läsa sina egna fakturor.
CREATE POLICY "Företag läser egna fakturor" ON public.invoices
  FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Företag läser egna fakturarader" ON public.invoice_lines
  FOR SELECT USING (invoice_id IN (
    SELECT id FROM public.invoices
    WHERE company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid())));

NOTIFY pgrst, 'reload schema';

CREATE TABLE IF NOT EXISTS public.global_defaults (
  id         TEXT PRIMARY KEY,             -- 'materials' | 'arbetsmoments' | 'categories'
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);

ALTER TABLE public.global_defaults ENABLE ROW LEVEL SECURITY;

-- Endast plattformsadmin skriver; alla inloggade får läsa (behövs vid onboarding/seedning).
CREATE POLICY "Plattformsadmin skriver global_defaults" ON public.global_defaults
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "Inloggade läser global_defaults" ON public.global_defaults
  FOR SELECT TO authenticated USING (true);

-- Seedningsfunktion: kopierar globala defaults till ett företags app_state-blobbar
-- OM de inte redan finns (skriver inte över ett företags egna ändringar).
CREATE OR REPLACE FUNCTION public.seed_company_defaults(target_company UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  mats JSONB;
  arbs JSONB;
  cats JSONB;
BEGIN
  SELECT data INTO mats FROM public.global_defaults WHERE id = 'materials';
  SELECT data INTO arbs FROM public.global_defaults WHERE id = 'arbetsmoments';
  SELECT data INTO cats FROM public.global_defaults WHERE id = 'categories';

  IF mats IS NOT NULL THEN
    INSERT INTO public.app_state (id, company_id, data)
    VALUES ('materials_' || target_company, target_company, mats)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF arbs IS NOT NULL THEN
    INSERT INTO public.app_state (id, company_id, data)
    VALUES ('arbetsmoments_' || target_company, target_company, arbs)
    ON CONFLICT (id) DO NOTHING;
  END IF;

  IF cats IS NOT NULL THEN
    INSERT INTO public.app_state (id, company_id, data)
    VALUES ('custom_categories_' || target_company, target_company, cats)
    ON CONFLICT (id) DO NOTHING;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.seed_company_defaults(UUID) FROM public;
GRANT EXECUTE ON FUNCTION public.seed_company_defaults(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';

CREATE TABLE IF NOT EXISTS public.platform_settings (
  id          INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- singleton-rad
  default_vat NUMERIC NOT NULL DEFAULT 0.25,
  default_currency TEXT NOT NULL DEFAULT 'SEK',
  default_margin   NUMERIC NOT NULL DEFAULT 0.15,
  feature_flags    JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.platform_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plattformsadmin skriver platform_settings" ON public.platform_settings
  FOR ALL USING (public.is_platform_admin()) WITH CHECK (public.is_platform_admin());
CREATE POLICY "Inloggade läser platform_settings" ON public.platform_settings
  FOR SELECT TO authenticated USING (true);

NOTIFY pgrst, 'reload schema';

CREATE TABLE IF NOT EXISTS public.audit_log (
  id         BIGSERIAL PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  user_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  event      TEXT NOT NULL,                 -- 'login','project_created','calc_saved',...
  meta       JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_company ON public.audit_log(company_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Plattformsadmin läser audit_log" ON public.audit_log
  FOR SELECT USING (public.is_platform_admin());
CREATE POLICY "Inloggade skriver egna audit-rader" ON public.audit_log
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Aggregerad statistik för portalen (plattformsadmin-only via funktionens gate).
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result JSONB;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Endast plattformsadmin';
  END IF;

  SELECT jsonb_build_object(
    'companies',      (SELECT COUNT(*) FROM companies),
    'users',          (SELECT COUNT(*) FROM profiles),
    'projects',       (SELECT COUNT(*) FROM projects),
    'active_subs',    (SELECT COUNT(*) FROM subscriptions WHERE status = 'active'),
    'mrr',            (SELECT COALESCE(SUM(p.price_month),0)
                         FROM subscriptions s JOIN subscription_plans p ON p.id = s.plan_id
                         WHERE s.status = 'active'),
    'by_plan',        (SELECT jsonb_object_agg(plan_id, c)
                         FROM (SELECT plan_id, COUNT(*) c FROM subscriptions GROUP BY plan_id) t),
    'invoices_unpaid',(SELECT COUNT(*) FROM invoices WHERE status IN ('skickad','forfallen')),
    'revenue_paid',   (SELECT COALESCE(SUM(gross_amount),0) FROM invoice_totals WHERE status = 'betald')
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_platform_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO authenticated;

-- 15. Trigger som låser role och company_id vid självuppdatering
CREATE OR REPLACE FUNCTION public.lock_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    NEW.role       := OLD.role;
    NEW.company_id := OLD.company_id;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_profile_privileged_fields ON public.profiles;
CREATE TRIGGER trg_lock_profile_privileged_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.lock_profile_privileged_fields();

-- 16. UPDATE-policy för egen rad
DROP POLICY IF EXISTS "profiles update egen rad" ON public.profiles;
CREATE POLICY "profiles update egen rad" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

NOTIFY pgrst, 'reload schema';

-- 17. Add phone and title
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS title TEXT;
