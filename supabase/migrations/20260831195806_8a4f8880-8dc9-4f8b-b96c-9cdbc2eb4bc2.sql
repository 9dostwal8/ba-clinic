CREATE TABLE IF NOT EXISTS app_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number text NOT NULL,
  description text,
  is_current boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS app_restore_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  backup_data jsonb NOT NULL,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE app_restore_points ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS drug_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  name_ar text,
  description text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE drug_categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS drug_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text,
  category_id uuid REFERENCES drug_categories(id),
  generic_name text,
  brand_names text[],
  dosage_forms text[],
  common_dosages text[],
  indications text,
  contraindications text,
  side_effects text,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE drug_library ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS invoice_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  html_content text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS template_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  template_type text NOT NULL,
  preview_url text,
  content text NOT NULL,
  is_premium boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE template_library ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view all clinics" ON clinics FOR SELECT TO authenticated USING (is_super_admin());
CREATE POLICY "Users can view their own clinic" ON clinics FOR SELECT TO authenticated USING (id = current_user_clinic_id());
CREATE POLICY "Super admins can insert clinics" ON clinics FOR INSERT TO authenticated WITH CHECK (is_super_admin());
CREATE POLICY "Super admins can update clinics" ON clinics FOR UPDATE TO authenticated USING (is_super_admin());

CREATE POLICY "Users can view users in their clinic" ON users FOR SELECT TO authenticated USING (is_super_admin() OR clinic_id = current_user_clinic_id());
CREATE POLICY "Clinic admins can insert users in their clinic" ON users FOR INSERT TO authenticated WITH CHECK (is_super_admin() OR (is_clinic_admin() AND clinic_id = current_user_clinic_id()));
CREATE POLICY "Clinic admins can update users in their clinic" ON users FOR UPDATE TO authenticated USING (is_super_admin() OR (is_clinic_admin() AND clinic_id = current_user_clinic_id()));
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can view patients in their clinic" ON patients FOR SELECT TO authenticated USING (clinic_id = current_user_clinic_id());
CREATE POLICY "Users can insert patients in their clinic" ON patients FOR INSERT TO authenticated WITH CHECK (clinic_id = current_user_clinic_id());
CREATE POLICY "Users can update patients in their clinic" ON patients FOR UPDATE TO authenticated USING (clinic_id = current_user_clinic_id());
CREATE POLICY "Users can delete patients in their clinic" ON patients FOR DELETE TO authenticated USING (clinic_id = current_user_clinic_id());

CREATE POLICY "Users can view appointments in their clinic" ON appointments FOR SELECT TO authenticated USING (clinic_id = current_user_clinic_id());
CREATE POLICY "Users can insert appointments in their clinic" ON appointments FOR INSERT TO authenticated WITH CHECK (clinic_id = current_user_clinic_id());
CREATE POLICY "Users can update appointments in their clinic" ON appointments FOR UPDATE TO authenticated USING (clinic_id = current_user_clinic_id());
CREATE POLICY "Users can delete appointments in their clinic" ON appointments FOR DELETE TO authenticated USING (clinic_id = current_user_clinic_id());

CREATE POLICY "Users can view treatment types in their clinic" ON treatment_types FOR SELECT TO authenticated USING (clinic_id = current_user_clinic_id());
CREATE POLICY "Clinic admins can insert treatment types" ON treatment_types FOR INSERT TO authenticated WITH CHECK (is_clinic_admin() AND clinic_id = current_user_clinic_id());
CREATE POLICY "Clinic admins can update treatment types" ON treatment_types FOR UPDATE TO authenticated USING (is_clinic_admin() AND clinic_id = current_user_clinic_id());

CREATE POLICY "Users can view treatments in their clinic" ON treatments FOR SELECT TO authenticated USING (clinic_id = current_user_clinic_id());
CREATE POLICY "Doctors can insert treatments in their clinic" ON treatments FOR INSERT TO authenticated WITH CHECK (clinic_id = current_user_clinic_id());
CREATE POLICY "Doctors can update treatments in their clinic" ON treatments FOR UPDATE TO authenticated USING (clinic_id = current_user_clinic_id());

CREATE POLICY "Users can view invoices in their clinic" ON invoices FOR SELECT TO authenticated USING (clinic_id = current_user_clinic_id());
CREATE POLICY "Users can insert invoices in their clinic" ON invoices FOR INSERT TO authenticated WITH CHECK (clinic_id = current_user_clinic_id());
CREATE POLICY "Users can update invoices in their clinic" ON invoices FOR UPDATE TO authenticated USING (clinic_id = current_user_clinic_id());
CREATE POLICY "Users can delete invoices in their clinic" ON invoices FOR DELETE TO authenticated USING (clinic_id = current_user_clinic_id());

CREATE POLICY "Users can view inventory in their clinic" ON inventory_items FOR SELECT TO authenticated USING (clinic_id = current_user_clinic_id());
CREATE POLICY "Users can insert inventory in their clinic" ON inventory_items FOR INSERT TO authenticated WITH CHECK (clinic_id = current_user_clinic_id());
CREATE POLICY "Users can update inventory in their clinic" ON inventory_items FOR UPDATE TO authenticated USING (clinic_id = current_user_clinic_id());

CREATE POLICY "Users can view purchases in their clinic" ON purchases FOR SELECT TO authenticated USING (clinic_id = current_user_clinic_id());
CREATE POLICY "Users can insert purchases in their clinic" ON purchases FOR INSERT TO authenticated WITH CHECK (clinic_id = current_user_clinic_id());

CREATE POLICY "Users can view expenses in their clinic" ON expenses FOR SELECT TO authenticated USING (clinic_id = current_user_clinic_id());
CREATE POLICY "Clinic admins can insert expenses" ON expenses FOR INSERT TO authenticated WITH CHECK (is_clinic_admin() AND clinic_id = current_user_clinic_id());
CREATE POLICY "Clinic admins can update expenses" ON expenses FOR UPDATE TO authenticated USING (is_clinic_admin() AND clinic_id = current_user_clinic_id());

CREATE POLICY "Clinic admins can view staff salaries" ON staff_salaries FOR SELECT TO authenticated USING (is_clinic_admin() AND clinic_id = current_user_clinic_id());
CREATE POLICY "Clinic admins can insert staff salaries" ON staff_salaries FOR INSERT TO authenticated WITH CHECK (is_clinic_admin() AND clinic_id = current_user_clinic_id());

CREATE POLICY "Users can view prescriptions in their clinic" ON prescriptions FOR SELECT TO authenticated USING (clinic_id = current_user_clinic_id());
CREATE POLICY "Doctors can insert prescriptions" ON prescriptions FOR INSERT TO authenticated WITH CHECK (clinic_id = current_user_clinic_id());
CREATE POLICY "Doctors can update prescriptions" ON prescriptions FOR UPDATE TO authenticated USING (clinic_id = current_user_clinic_id());

CREATE POLICY "Users can view prescription items" ON prescription_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM prescriptions p WHERE p.id = prescription_items.prescription_id AND p.clinic_id = current_user_clinic_id()));
CREATE POLICY "Doctors can insert prescription items" ON prescription_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM prescriptions p WHERE p.id = prescription_items.prescription_id AND p.clinic_id = current_user_clinic_id()));

CREATE POLICY "Anyone can view translation keys" ON translation_keys FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view translations" ON translations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins can insert translations" ON translations FOR INSERT TO authenticated WITH CHECK (is_super_admin());
CREATE POLICY "Super admins can update translations" ON translations FOR UPDATE TO authenticated USING (is_super_admin());

CREATE POLICY "Users can view language settings for their clinic" ON language_settings FOR SELECT TO authenticated USING (clinic_id = current_user_clinic_id());
CREATE POLICY "Clinic admins can update language settings" ON language_settings FOR UPDATE TO authenticated USING (is_clinic_admin() AND clinic_id = current_user_clinic_id());

CREATE POLICY "Users can view permissions in their clinic" ON staff_permissions FOR SELECT TO authenticated USING (clinic_id = current_user_clinic_id());
CREATE POLICY "Clinic admins can manage permissions" ON staff_permissions FOR ALL TO authenticated USING (is_clinic_admin() AND clinic_id = current_user_clinic_id());

CREATE POLICY "Users can view templates in their clinic" ON prescription_templates FOR SELECT TO authenticated USING (clinic_id = current_user_clinic_id());
CREATE POLICY "Clinic admins can manage templates" ON prescription_templates FOR ALL TO authenticated USING (is_clinic_admin() AND clinic_id = current_user_clinic_id());

CREATE POLICY "Users can view document templates in their clinic" ON document_templates FOR SELECT TO authenticated USING (clinic_id = current_user_clinic_id());
CREATE POLICY "Clinic admins can manage document templates" ON document_templates FOR ALL TO authenticated USING (is_clinic_admin() AND clinic_id = current_user_clinic_id());

CREATE POLICY "Anyone can view template presets" ON template_presets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view settings in their clinic" ON notification_settings FOR SELECT TO authenticated USING (clinic_id = current_user_clinic_id());
CREATE POLICY "Clinic admins can update notification settings" ON notification_settings FOR ALL TO authenticated USING (is_clinic_admin() AND clinic_id = current_user_clinic_id());
CREATE POLICY "Users can view notification templates in their clinic" ON notification_templates FOR SELECT TO authenticated USING (clinic_id = current_user_clinic_id() OR clinic_id IS NULL);
CREATE POLICY "Users can view notification logs in their clinic" ON notification_logs FOR SELECT TO authenticated USING (clinic_id = current_user_clinic_id());

CREATE POLICY "Users can view settings for their clinic" ON clinic_settings FOR SELECT TO authenticated USING (clinic_id = current_user_clinic_id());
CREATE POLICY "Clinic admins can update settings" ON clinic_settings FOR ALL TO authenticated USING (is_clinic_admin() AND clinic_id = current_user_clinic_id());

CREATE POLICY "Anyone can view drug categories" ON drug_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view public drugs" ON drug_library FOR SELECT TO authenticated USING (is_public = true);

CREATE POLICY "Users can view invoice templates in their clinic" ON invoice_templates FOR SELECT TO authenticated USING (clinic_id = current_user_clinic_id());
CREATE POLICY "Clinic admins can manage invoice templates" ON invoice_templates FOR ALL TO authenticated USING (is_clinic_admin() AND clinic_id = current_user_clinic_id());

CREATE POLICY "Anyone can view template library" ON template_library FOR SELECT TO authenticated USING (true);

CREATE POLICY "Super admins can manage app versions" ON app_versions FOR ALL TO authenticated USING (is_super_admin()) WITH CHECK (is_super_admin());
CREATE POLICY "Clinic admins can manage restore points" ON app_restore_points FOR ALL TO authenticated USING (is_super_admin() OR (is_clinic_admin() AND clinic_id = current_user_clinic_id())) WITH CHECK (is_super_admin() OR (is_clinic_admin() AND clinic_id = current_user_clinic_id()));

CREATE OR REPLACE VIEW analytics_revenue_trends WITH (security_invoker = true) AS
SELECT i.clinic_id, DATE_TRUNC('month', i.invoice_date) as period, COUNT(DISTINCT i.id) as total_invoices,
  COUNT(DISTINCT i.patient_id) as unique_patients, SUM(i.total) as total_revenue, SUM(i.paid_amount) as total_paid,
  SUM(i.total - i.paid_amount) as total_outstanding, AVG(i.total) as avg_invoice_amount
FROM invoices i WHERE i.invoice_date IS NOT NULL GROUP BY i.clinic_id, DATE_TRUNC('month', i.invoice_date);

CREATE OR REPLACE VIEW analytics_expense_analysis WITH (security_invoker = true) AS
SELECT e.clinic_id, DATE_TRUNC('month', e.expense_date) as period, e.category, COUNT(*) as expense_count,
  SUM(e.amount) as total_amount, AVG(e.amount) as avg_amount
FROM expenses e WHERE e.expense_date IS NOT NULL GROUP BY e.clinic_id, DATE_TRUNC('month', e.expense_date), e.category;

CREATE OR REPLACE VIEW analytics_patient_stats WITH (security_invoker = true) AS
SELECT p.clinic_id, DATE_TRUNC('month', p.created_at) as registration_period, COUNT(DISTINCT p.id) as new_patients,
  COUNT(DISTINCT CASE WHEN p.assigned_doctor_id IS NOT NULL THEN p.id END) as assigned_patients,
  COUNT(DISTINCT p.id) FILTER (WHERE p.date_of_birth IS NOT NULL) as patients_with_dob
FROM patients p GROUP BY p.clinic_id, DATE_TRUNC('month', p.created_at);

CREATE OR REPLACE VIEW analytics_appointment_stats WITH (security_invoker = true) AS
SELECT a.clinic_id, a.doctor_id, DATE_TRUNC('month', a.appointment_date) as period, a.status,
  COUNT(*) as appointment_count, COUNT(DISTINCT a.patient_id) as unique_patients
FROM appointments a WHERE a.appointment_date IS NOT NULL
GROUP BY a.clinic_id, a.doctor_id, DATE_TRUNC('month', a.appointment_date), a.status;

CREATE OR REPLACE VIEW analytics_staff_performance WITH (security_invoker = true) AS
SELECT u.clinic_id, u.id as staff_id, u.full_name, u.full_name_ar, u.role,
  DATE_TRUNC('month', a.appointment_date) as period,
  COUNT(DISTINCT a.id) as total_appointments,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'completed') as completed_appointments,
  COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'cancelled') as cancelled_appointments,
  COUNT(DISTINCT a.patient_id) as unique_patients_served,
  COALESCE(SUM(i.total), 0) as total_revenue_generated,
  COALESCE(AVG(i.total), 0) as avg_revenue_per_appointment
FROM users u
LEFT JOIN appointments a ON u.id = a.doctor_id AND u.clinic_id = a.clinic_id
LEFT JOIN invoices i ON a.patient_id = i.patient_id
  AND DATE_TRUNC('day', a.appointment_date) = DATE_TRUNC('day', i.invoice_date)
  AND u.clinic_id = i.clinic_id
WHERE u.role IN ('doctor', 'clinic_admin') AND a.appointment_date IS NOT NULL
GROUP BY u.clinic_id, u.id, u.full_name, u.full_name_ar, u.role, DATE_TRUNC('month', a.appointment_date);

CREATE OR REPLACE FUNCTION get_profit_margins(p_clinic_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS TABLE (period DATE, total_revenue NUMERIC, total_expenses NUMERIC, profit NUMERIC, profit_margin NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF p_clinic_id IS DISTINCT FROM current_user_clinic_id() AND NOT is_super_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  WITH revenue AS (
    SELECT DATE_TRUNC('month', invoice_date)::DATE as month, SUM(total) as amount
    FROM invoices WHERE clinic_id = p_clinic_id AND invoice_date >= p_start_date AND invoice_date <= p_end_date
    GROUP BY DATE_TRUNC('month', invoice_date)
  ), expenses AS (
    SELECT DATE_TRUNC('month', expense_date)::DATE as month, SUM(amount) as amount
    FROM expenses WHERE clinic_id = p_clinic_id AND expense_date >= p_start_date AND expense_date <= p_end_date
    GROUP BY DATE_TRUNC('month', expense_date)
  )
  SELECT COALESCE(r.month, e.month), COALESCE(r.amount, 0), COALESCE(e.amount, 0),
    COALESCE(r.amount, 0) - COALESCE(e.amount, 0),
    CASE WHEN COALESCE(r.amount, 0) > 0 THEN ((COALESCE(r.amount, 0) - COALESCE(e.amount, 0)) / r.amount * 100) ELSE 0 END
  FROM revenue r FULL OUTER JOIN expenses e ON r.month = e.month ORDER BY 1;
END;
$$;

CREATE OR REPLACE FUNCTION get_patient_retention_stats(p_clinic_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS TABLE (period DATE, new_patients BIGINT, returning_patients BIGINT, retention_rate NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF p_clinic_id IS DISTINCT FROM current_user_clinic_id() AND NOT is_super_admin() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN QUERY
  WITH patient_visits AS (
    SELECT a.patient_id, DATE_TRUNC('month', a.appointment_date)::DATE as month,
      MIN(a.appointment_date) OVER (PARTITION BY a.patient_id) as first_visit
    FROM appointments a
    WHERE a.clinic_id = p_clinic_id AND a.appointment_date >= p_start_date AND a.appointment_date <= p_end_date AND a.status = 'completed'
  )
  SELECT month, COUNT(DISTINCT patient_id) FILTER (WHERE DATE_TRUNC('month', first_visit) = month),
    COUNT(DISTINCT patient_id) FILTER (WHERE DATE_TRUNC('month', first_visit) < month),
    CASE WHEN COUNT(DISTINCT patient_id) > 0 THEN (COUNT(DISTINCT patient_id) FILTER (WHERE DATE_TRUNC('month', first_visit) < month)::NUMERIC / COUNT(DISTINCT patient_id) * 100) ELSE 0 END
  FROM patient_visits GROUP BY month ORDER BY month;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_profit_margins(UUID, DATE, DATE) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION get_patient_retention_stats(UUID, DATE, DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION get_profit_margins(UUID, DATE, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_patient_retention_stats(UUID, DATE, DATE) TO authenticated;

REVOKE EXECUTE ON FUNCTION is_super_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION is_clinic_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION current_user_clinic_id() FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_translations_updated_at BEFORE UPDATE ON translations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_staff_permissions_updated_at BEFORE UPDATE ON staff_permissions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prescription_templates_updated_at BEFORE UPDATE ON prescription_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_document_templates_updated_at BEFORE UPDATE ON document_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_settings_updated_at BEFORE UPDATE ON notification_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON notification_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_clinic_settings_updated_at BEFORE UPDATE ON clinic_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoice_templates_updated_at BEFORE UPDATE ON invoice_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_users_clinic_id ON users(clinic_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_patients_clinic_id ON patients(clinic_id);
CREATE INDEX IF NOT EXISTS idx_patients_file_number ON patients(clinic_id, file_number);
CREATE INDEX IF NOT EXISTS idx_appointments_clinic_id ON appointments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_invoices_clinic_id ON invoices(clinic_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_treatments_clinic_id ON treatments(clinic_id);
CREATE INDEX IF NOT EXISTS idx_treatments_patient ON treatments(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_clinic_id ON prescriptions(clinic_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);

DO $grants$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t.tablename);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t.tablename);
  END LOOP;
  FOR t IN SELECT viewname FROM pg_views WHERE schemaname='public' LOOP
    EXECUTE format('GRANT SELECT ON public.%I TO authenticated', t.viewname);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t.viewname);
  END LOOP;
END
$grants$;