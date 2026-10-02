-- ============ Treatment plans & visits ============
CREATE TABLE public.treatment_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.users(id),
  procedure_template_id uuid,
  treatment_type_id uuid REFERENCES public.treatment_types(id) ON DELETE SET NULL,
  treatment_category text,
  diagnosis text,
  diagnosis_ar text,
  total_planned_visits integer DEFAULT 1,
  completed_visits integer DEFAULT 0,
  status text DEFAULT 'active',
  start_date date DEFAULT CURRENT_DATE,
  completion_date date,
  total_cost numeric DEFAULT 0,
  paid_amount numeric DEFAULT 0,
  tooth_numbers text[] DEFAULT ARRAY[]::text[],
  notes text,
  payment_locked boolean DEFAULT false,
  locked_by uuid REFERENCES public.users(id),
  locked_at timestamptz,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatment_plans TO authenticated;
GRANT ALL ON public.treatment_plans TO service_role;
ALTER TABLE public.treatment_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic access treatment_plans" ON public.treatment_plans FOR ALL TO authenticated
  USING (public.is_super_admin() OR clinic_id = public.current_user_clinic_id())
  WITH CHECK (public.is_super_admin() OR clinic_id = public.current_user_clinic_id());

CREATE TABLE public.treatment_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  treatment_plan_id uuid NOT NULL REFERENCES public.treatment_plans(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.users(id),
  visit_number integer DEFAULT 1,
  visit_date date DEFAULT CURRENT_DATE,
  visit_type text,
  procedure_performed text,
  procedure_performed_ar text,
  clinical_data jsonb DEFAULT '{}'::jsonb,
  tooth_numbers text[] DEFAULT ARRAY[]::text[],
  duration_minutes integer DEFAULT 30,
  complications text,
  next_visit_notes text,
  visit_cost numeric DEFAULT 0,
  payment_received numeric DEFAULT 0,
  status text DEFAULT 'scheduled',
  prescription_id uuid REFERENCES public.prescriptions(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  payment_collected_by uuid REFERENCES public.users(id),
  payment_collected_at timestamptz,
  payment_locked boolean DEFAULT false,
  locked_by uuid REFERENCES public.users(id),
  locked_at timestamptz,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatment_visits TO authenticated;
GRANT ALL ON public.treatment_visits TO service_role;
ALTER TABLE public.treatment_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic access treatment_visits" ON public.treatment_visits FOR ALL TO authenticated
  USING (public.is_super_admin() OR clinic_id = public.current_user_clinic_id())
  WITH CHECK (public.is_super_admin() OR clinic_id = public.current_user_clinic_id());

-- ============ Procedure templates ============
CREATE TABLE public.procedure_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  treatment_type_id uuid REFERENCES public.treatment_types(id) ON DELETE SET NULL,
  treatment_category text,
  template_name text NOT NULL,
  template_name_ar text,
  typical_visits integer DEFAULT 1,
  visit_workflow jsonb DEFAULT '[]'::jsonb,
  clinical_fields jsonb DEFAULT '{}'::jsonb,
  is_system_template boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.procedure_templates TO authenticated;
GRANT ALL ON public.procedure_templates TO service_role;
ALTER TABLE public.procedure_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read procedure_templates" ON public.procedure_templates FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage procedure_templates" ON public.procedure_templates FOR ALL TO authenticated
  USING (public.is_super_admin() OR clinic_id = public.current_user_clinic_id())
  WITH CHECK (public.is_super_admin() OR clinic_id = public.current_user_clinic_id());
ALTER TABLE public.treatment_plans
  ADD CONSTRAINT treatment_plans_procedure_template_id_fkey
  FOREIGN KEY (procedure_template_id) REFERENCES public.procedure_templates(id) ON DELETE SET NULL;

-- ============ Medications library ============
CREATE TABLE public.medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text,
  generic_name text,
  dosage_form text,
  strength text,
  common_dosages jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.medications TO authenticated;
GRANT ALL ON public.medications TO service_role;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read medications" ON public.medications FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage medications" ON public.medications FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- ============ Document templates ============
CREATE TABLE public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  template_type text NOT NULL,
  template_name text,
  template_name_ar text,
  logo_url text,
  header_text text,
  footer_text text,
  header_image_url text,
  footer_image_url text,
  font_family text DEFAULT 'Arial',
  font_size integer DEFAULT 12,
  paper_size text DEFAULT 'A4',
  color_scheme text DEFAULT 'default',
  primary_color text DEFAULT '#2563eb',
  show_clinic_info boolean DEFAULT true,
  show_doctor_info boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_templates TO authenticated;
GRANT ALL ON public.document_templates TO service_role;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic access document_templates" ON public.document_templates FOR ALL TO authenticated
  USING (public.is_super_admin() OR clinic_id = public.current_user_clinic_id())
  WITH CHECK (public.is_super_admin() OR clinic_id = public.current_user_clinic_id());

-- ============ Global template library ============
CREATE TABLE public.template_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name text NOT NULL,
  template_name_ar text,
  template_type text NOT NULL,
  category text DEFAULT 'general',
  description text,
  description_ar text,
  thumbnail_url text,
  html_template text,
  css_template text,
  template_variables jsonb DEFAULT '{}'::jsonb,
  preview_data jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_library TO authenticated;
GRANT ALL ON public.template_library TO service_role;
ALTER TABLE public.template_library ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read template_library" ON public.template_library FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage template_library" ON public.template_library FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- ============ Subscription plans ============
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  display_name text NOT NULL,
  display_name_ar text,
  description text,
  description_ar text,
  price_monthly numeric DEFAULT 0,
  price_yearly numeric DEFAULT 0,
  max_dentists integer DEFAULT 1,
  max_staff integer DEFAULT 5,
  max_patients integer DEFAULT 100,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_plans TO authenticated;
GRANT ALL ON public.subscription_plans TO service_role;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read subscription_plans" ON public.subscription_plans FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage subscription_plans" ON public.subscription_plans FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TABLE public.subscription_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  feature_key text NOT NULL,
  feature_name text NOT NULL,
  feature_name_ar text,
  feature_value boolean DEFAULT true,
  description text,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.subscription_features TO authenticated;
GRANT ALL ON public.subscription_features TO service_role;
ALTER TABLE public.subscription_features ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read subscription_features" ON public.subscription_features FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage subscription_features" ON public.subscription_features FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TABLE public.clinic_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text DEFAULT 'active',
  start_date date DEFAULT CURRENT_DATE,
  end_date date,
  auto_renew boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_subscriptions TO authenticated;
GRANT ALL ON public.clinic_subscriptions TO service_role;
ALTER TABLE public.clinic_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read clinic_subscriptions" ON public.clinic_subscriptions FOR SELECT TO authenticated
  USING (public.is_super_admin() OR clinic_id = public.current_user_clinic_id());
CREATE POLICY "manage clinic_subscriptions" ON public.clinic_subscriptions FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- ============ Currencies ============
CREATE TABLE public.currencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  symbol text NOT NULL,
  decimal_digits integer DEFAULT 2,
  exchange_rate_to_usd numeric DEFAULT 1,
  is_active boolean DEFAULT true,
  is_custom boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.currencies TO authenticated;
GRANT ALL ON public.currencies TO service_role;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read currencies" ON public.currencies FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage currencies" ON public.currencies FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TABLE public.clinic_currency_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL UNIQUE REFERENCES public.clinics(id) ON DELETE CASCADE,
  currency_id uuid NOT NULL REFERENCES public.currencies(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_currency_settings TO authenticated;
GRANT ALL ON public.clinic_currency_settings TO service_role;
ALTER TABLE public.clinic_currency_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read clinic_currency_settings" ON public.clinic_currency_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage clinic_currency_settings" ON public.clinic_currency_settings FOR ALL TO authenticated
  USING (public.is_super_admin() OR clinic_id = public.current_user_clinic_id())
  WITH CHECK (public.is_super_admin() OR clinic_id = public.current_user_clinic_id());

INSERT INTO public.currencies (code, name, symbol, decimal_digits, exchange_rate_to_usd) VALUES
  ('USD','US Dollar','$',2,1),
  ('IQD','Iraqi Dinar','د.ع',0,1310),
  ('EUR','Euro','€',2,0.92);

-- ============ WhatsApp ============
CREATE TABLE public.whatsapp_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL UNIQUE REFERENCES public.clinics(id) ON DELETE CASCADE,
  phone_number text DEFAULT '',
  enabled boolean DEFAULT false,
  appointment_reminders_enabled boolean DEFAULT true,
  invoice_notifications_enabled boolean DEFAULT true,
  prescription_notifications_enabled boolean DEFAULT true,
  payment_reminders_enabled boolean DEFAULT true,
  reminder_hours_before integer DEFAULT 24,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_settings TO authenticated;
GRANT ALL ON public.whatsapp_settings TO service_role;
ALTER TABLE public.whatsapp_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic access whatsapp_settings" ON public.whatsapp_settings FOR ALL TO authenticated
  USING (public.is_super_admin() OR clinic_id = public.current_user_clinic_id())
  WITH CHECK (public.is_super_admin() OR clinic_id = public.current_user_clinic_id());

CREATE TABLE public.whatsapp_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  patient_phone text NOT NULL,
  message_content text NOT NULL,
  whatsapp_link text,
  status text DEFAULT 'pending',
  sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_reminders TO authenticated;
GRANT ALL ON public.whatsapp_reminders TO service_role;
ALTER TABLE public.whatsapp_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic access whatsapp_reminders" ON public.whatsapp_reminders FOR ALL TO authenticated
  USING (public.is_super_admin() OR clinic_id = public.current_user_clinic_id())
  WITH CHECK (public.is_super_admin() OR clinic_id = public.current_user_clinic_id());

-- ============ Payment transactions ============
CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  visit_id uuid REFERENCES public.treatment_visits(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text DEFAULT 'cash',
  reference text,
  notes text,
  collected_by uuid REFERENCES public.users(id),
  collected_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic access payment_transactions" ON public.payment_transactions FOR ALL TO authenticated
  USING (public.is_super_admin() OR clinic_id = public.current_user_clinic_id())
  WITH CHECK (public.is_super_admin() OR clinic_id = public.current_user_clinic_id());

-- ============ Commissions ============
CREATE TABLE public.commission_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  treatment_type_id uuid REFERENCES public.treatment_types(id) ON DELETE CASCADE,
  commission_type text DEFAULT 'percentage',
  commission_rate numeric DEFAULT 0,
  fixed_amount numeric DEFAULT 0,
  applies_to_all boolean DEFAULT true,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_rules TO authenticated;
GRANT ALL ON public.commission_rules TO service_role;
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic access commission_rules" ON public.commission_rules FOR ALL TO authenticated
  USING (public.is_super_admin() OR clinic_id = public.current_user_clinic_id())
  WITH CHECK (public.is_super_admin() OR clinic_id = public.current_user_clinic_id());

CREATE TABLE public.commission_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  calculation_period_start date NOT NULL,
  calculation_period_end date NOT NULL,
  total_treatments integer DEFAULT 0,
  total_revenue numeric DEFAULT 0,
  total_commission numeric DEFAULT 0,
  status text DEFAULT 'pending',
  notes text,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_calculations TO authenticated;
GRANT ALL ON public.commission_calculations TO service_role;
ALTER TABLE public.commission_calculations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic access commission_calculations" ON public.commission_calculations FOR ALL TO authenticated
  USING (public.is_super_admin() OR clinic_id = public.current_user_clinic_id())
  WITH CHECK (public.is_super_admin() OR clinic_id = public.current_user_clinic_id());

CREATE TABLE public.commission_calculation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calculation_id uuid NOT NULL REFERENCES public.commission_calculations(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  treatment_visit_id uuid REFERENCES public.treatment_visits(id) ON DELETE SET NULL,
  treatment_type_id uuid REFERENCES public.treatment_types(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  treatment_date date,
  treatment_amount numeric DEFAULT 0,
  commission_type text DEFAULT 'percentage',
  commission_rate numeric DEFAULT 0,
  commission_amount numeric DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commission_calculation_items TO authenticated;
GRANT ALL ON public.commission_calculation_items TO service_role;
ALTER TABLE public.commission_calculation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic access commission_calculation_items" ON public.commission_calculation_items FOR ALL TO authenticated
  USING (public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.commission_calculations c
    WHERE c.id = calculation_id AND c.clinic_id = public.current_user_clinic_id()))
  WITH CHECK (public.is_super_admin() OR EXISTS (
    SELECT 1 FROM public.commission_calculations c
    WHERE c.id = calculation_id AND c.clinic_id = public.current_user_clinic_id()));

-- ============ Database backups ============
CREATE TABLE public.database_backups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  backup_name text NOT NULL,
  backup_type text DEFAULT 'manual',
  file_size bigint DEFAULT 0,
  file_url text,
  tables_included text[] DEFAULT ARRAY[]::text[],
  records_count integer DEFAULT 0,
  status text DEFAULT 'completed',
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.database_backups TO authenticated;
GRANT ALL ON public.database_backups TO service_role;
ALTER TABLE public.database_backups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manage database_backups" ON public.database_backups FOR ALL TO authenticated
  USING (public.is_super_admin() OR clinic_id = public.current_user_clinic_id())
  WITH CHECK (public.is_super_admin() OR clinic_id = public.current_user_clinic_id());

-- ============ Coming soon settings ============
CREATE TABLE public.coming_soon_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean DEFAULT false,
  title text DEFAULT 'Coming Soon',
  description text DEFAULT 'We are working on something amazing',
  contact_email text,
  contact_phone text,
  custom_html text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
GRANT SELECT ON public.coming_soon_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coming_soon_settings TO authenticated;
GRANT ALL ON public.coming_soon_settings TO service_role;
ALTER TABLE public.coming_soon_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read coming_soon_settings" ON public.coming_soon_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "manage coming_soon_settings" ON public.coming_soon_settings FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

INSERT INTO public.coming_soon_settings (is_enabled, title, description, contact_email, contact_phone, custom_html)
VALUES (false, 'Coming Soon', 'We are working on something amazing', 'info@dentalmanager.com', '+1 (234) 567-890', '');

-- ============ updated_at triggers ============
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['treatment_plans','treatment_visits','procedure_templates','medications','document_templates','template_library','clinic_subscriptions','currencies','clinic_currency_settings','whatsapp_settings','whatsapp_reminders','commission_rules','commission_calculations','coming_soon_settings']
  LOOP
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t);
  END LOOP;
END $$;