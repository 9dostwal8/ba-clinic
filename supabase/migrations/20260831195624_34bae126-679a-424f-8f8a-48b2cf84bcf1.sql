CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'super_admin'
    AND is_active = true
  );
END;
$$;

CREATE OR REPLACE FUNCTION current_user_clinic_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  clinic_id_val uuid;
BEGIN
  SELECT clinic_id INTO clinic_id_val
  FROM users
  WHERE id = auth.uid()
  AND is_active = true;

  RETURN clinic_id_val;
END;
$$;

CREATE OR REPLACE FUNCTION is_clinic_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
    AND role = 'clinic_admin'
    AND is_active = true
  );
END;
$$;

CREATE TABLE IF NOT EXISTS clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  name_ar text,
  logo_url text,
  address text,
  phone text,
  email text,
  subscription_status text DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'suspended')),
  subscription_start timestamptz DEFAULT now(),
  subscription_end timestamptz,
  max_staff integer DEFAULT 10,
  max_patients integer DEFAULT 1000,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  full_name_ar text,
  role text NOT NULL CHECK (role IN ('super_admin', 'clinic_admin', 'doctor', 'staff')),
  specialization text,
  phone text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  file_number text NOT NULL,
  full_name text NOT NULL,
  full_name_ar text,
  date_of_birth date,
  gender text CHECK (gender IN ('male', 'female')),
  phone text,
  email text,
  address text,
  emergency_contact text,
  emergency_phone text,
  medical_history text,
  allergies text,
  blood_type text,
  assigned_doctor_id uuid REFERENCES users(id),
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(clinic_id, file_number)
);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES users(id),
  appointment_date timestamptz NOT NULL,
  duration_minutes integer DEFAULT 30,
  status text DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
  appointment_type text CHECK (appointment_type IN ('checkup', 'treatment', 'followup', 'emergency')),
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS treatment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  category text CHECK (category IN ('general', 'cosmetic', 'orthodontics', 'surgery', 'pediatric', 'endodontics', 'periodontics', 'prosthodontics')),
  default_price decimal(10,2) DEFAULT 0,
  duration_minutes integer DEFAULT 30,
  description text,
  description_ar text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(clinic_id, name)
);

ALTER TABLE treatment_types ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES users(id),
  appointment_id uuid REFERENCES appointments(id),
  treatment_type_id uuid REFERENCES treatment_types(id),
  treatment_date timestamptz DEFAULT now(),
  tooth_number text,
  diagnosis text,
  notes text,
  status text DEFAULT 'in_progress' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  cost decimal(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  invoice_date timestamptz DEFAULT now(),
  items jsonb DEFAULT '[]'::jsonb,
  subtotal decimal(10,2) DEFAULT 0,
  tax decimal(10,2) DEFAULT 0,
  discount decimal(10,2) DEFAULT 0,
  total decimal(10,2) DEFAULT 0,
  paid_amount decimal(10,2) DEFAULT 0,
  payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
  payment_method text CHECK (payment_method IN ('cash', 'card', 'transfer')),
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(clinic_id, invoice_number)
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  item_name_ar text,
  category text CHECK (category IN ('medications', 'equipment', 'supplies')),
  sku text,
  quantity integer DEFAULT 0,
  unit text,
  unit_price decimal(10,2) DEFAULT 0,
  supplier text,
  reorder_level integer DEFAULT 10,
  expiry_date date,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(clinic_id, sku)
);

ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  inventory_item_id uuid REFERENCES inventory_items(id) ON DELETE CASCADE,
  purchase_date timestamptz DEFAULT now(),
  quantity integer NOT NULL,
  unit_price decimal(10,2) NOT NULL,
  total_amount decimal(10,2) NOT NULL,
  supplier text,
  receipt_url text,
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  expense_date timestamptz DEFAULT now(),
  category text CHECK (category IN ('rent', 'utilities', 'salaries', 'maintenance', 'supplies', 'other')),
  description text NOT NULL,
  description_ar text,
  amount decimal(10,2) NOT NULL,
  payment_method text CHECK (payment_method IN ('cash', 'card', 'transfer')),
  receipt_url text,
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS staff_salaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payment_date timestamptz DEFAULT now(),
  amount decimal(10,2) NOT NULL,
  payment_method text CHECK (payment_method IN ('cash', 'card', 'transfer')),
  notes text,
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE staff_salaries ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS language_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid UNIQUE REFERENCES clinics(id) ON DELETE CASCADE,
  default_language text DEFAULT 'en' CHECK (default_language IN ('en', 'ar')),
  available_languages text[] DEFAULT ARRAY['en', 'ar'],
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE language_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS translation_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text UNIQUE NOT NULL,
  context text,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE translation_keys ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_name text NOT NULL REFERENCES translation_keys(key_name) ON DELETE CASCADE,
  language text NOT NULL CHECK (language IN ('en', 'ar')),
  translation text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(key_name, language)
);

ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS staff_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  can_view_patients boolean DEFAULT false,
  can_edit_patients boolean DEFAULT false,
  can_delete_patients boolean DEFAULT false,
  can_view_appointments boolean DEFAULT false,
  can_edit_appointments boolean DEFAULT false,
  can_delete_appointments boolean DEFAULT false,
  can_view_invoices boolean DEFAULT false,
  can_edit_invoices boolean DEFAULT false,
  can_delete_invoices boolean DEFAULT false,
  can_view_inventory boolean DEFAULT false,
  can_edit_inventory boolean DEFAULT false,
  can_manage_staff boolean DEFAULT false,
  can_view_reports boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(clinic_id, user_id)
);

ALTER TABLE staff_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS prescription_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  name_ar text,
  header_text text,
  header_text_ar text,
  footer_text text,
  footer_text_ar text,
  header_image_url text,
  footer_image_url text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE prescription_templates ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid REFERENCES users(id),
  prescription_date timestamptz DEFAULT now(),
  diagnosis text,
  notes text,
  template_id uuid REFERENCES prescription_templates(id),
  created_by uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS prescription_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medication_name text NOT NULL,
  medication_name_ar text,
  dosage text,
  frequency text,
  duration text,
  instructions text,
  instructions_ar text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  template_type text NOT NULL CHECK (template_type IN ('prescription', 'invoice', 'report', 'consent')),
  html_content text,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS template_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  template_type text NOT NULL CHECK (template_type IN ('prescription', 'invoice', 'report')),
  preview_image_url text,
  html_template text NOT NULL,
  is_premium boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE template_presets ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid UNIQUE REFERENCES clinics(id) ON DELETE CASCADE,
  email_notifications boolean DEFAULT true,
  sms_notifications boolean DEFAULT false,
  appointment_reminders boolean DEFAULT true,
  reminder_hours_before integer DEFAULT 24,
  payment_reminders boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS notification_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid REFERENCES clinics(id) ON DELETE CASCADE,
  template_type text NOT NULL CHECK (template_type IN ('appointment_reminder', 'payment_due', 'appointment_confirmed')),
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp')),
  subject text,
  body text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  recipient_type text NOT NULL CHECK (recipient_type IN ('patient', 'staff', 'admin')),
  recipient_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email', 'sms', 'whatsapp', 'in_app')),
  subject text,
  message text NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered', 'read')),
  error_message text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS clinic_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid UNIQUE REFERENCES clinics(id) ON DELETE CASCADE,
  currency text DEFAULT 'USD',
  timezone text DEFAULT 'UTC',
  date_format text DEFAULT 'YYYY-MM-DD',
  time_format text DEFAULT '24h',
  working_hours jsonb DEFAULT '{"monday": {"start": "09:00", "end": "17:00"}}'::jsonb,
  appointment_duration integer DEFAULT 30,
  tax_rate decimal(5,2) DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE clinic_settings ENABLE ROW LEVEL SECURITY;

DO $grants$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t.tablename);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t.tablename);
  END LOOP;
END
$grants$;