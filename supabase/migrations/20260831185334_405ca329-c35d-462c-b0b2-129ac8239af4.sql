
-- ENUMS
CREATE TYPE public.app_role AS ENUM ('super_admin','dentist','reception');
CREATE TYPE public.clinic_type AS ENUM ('center','poly_clinic','normal_clinic','specialty','mobile_unit');
CREATE TYPE public.appointment_status AS ENUM ('scheduled','confirmed','in_chair','completed','cancelled','no_show');
CREATE TYPE public.treatment_status AS ENUM ('planned','in_progress','completed','cancelled');
CREATE TYPE public.billing_mode AS ENUM ('per_treatment','per_month','per_visit');
CREATE TYPE public.invoice_status AS ENUM ('draft','unpaid','partial','paid','void');
CREATE TYPE public.ledger_entry_type AS ENUM ('earning','payout','expense','bonus');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- CLINICS
CREATE TABLE public.clinics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type public.clinic_type NOT NULL DEFAULT 'normal_clinic',
  address text,
  phone text,
  currency text NOT NULL DEFAULT 'USD',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinics TO authenticated;
GRANT ALL ON public.clinics TO service_role;
ALTER TABLE public.clinics ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text NOT NULL DEFAULT 'New user',
  email text,
  phone text,
  job_title text,
  clinic_id uuid REFERENCES public.clinics(id) ON DELETE SET NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- HELPERS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.current_clinic_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT clinic_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.can_access_clinic(_clinic_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(),'super_admin')
      OR (_clinic_id IS NOT NULL AND _clinic_id = public.current_clinic_id());
$$;

-- CLINIC / PROFILE / ROLE POLICIES
CREATE POLICY "clinics readable by members and admins" ON public.clinics FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'super_admin') OR id = public.current_clinic_id());
CREATE POLICY "super admins insert clinics" ON public.clinics FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "super admins update clinics" ON public.clinics FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "super admins delete clinics" ON public.clinics FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "profiles readable in clinic" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.can_access_clinic(clinic_id));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "own profile update or admin" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'super_admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "admins delete profiles" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));

CREATE POLICY "read own roles or admin" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- PATIENTS
CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  phone text,
  email text,
  date_of_birth date,
  gender text,
  address text,
  allergies text,
  medical_notes text,
  chart_number text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic patients" ON public.patients FOR ALL TO authenticated
  USING (public.can_access_clinic(clinic_id)) WITH CHECK (public.can_access_clinic(clinic_id));

-- TREATMENT TYPES
CREATE TABLE public.treatment_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  code text,
  category text,
  color text NOT NULL DEFAULT '#0E1B2B',
  default_price numeric(12,2) NOT NULL DEFAULT 0,
  duration_min integer NOT NULL DEFAULT 30,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatment_types TO authenticated;
GRANT ALL ON public.treatment_types TO service_role;
ALTER TABLE public.treatment_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic treatment types" ON public.treatment_types FOR ALL TO authenticated
  USING (public.can_access_clinic(clinic_id)) WITH CHECK (public.can_access_clinic(clinic_id));

-- APPOINTMENTS
CREATE TABLE public.appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  dentist_id uuid,
  dentist_name text,
  starts_at timestamptz NOT NULL,
  duration_min integer NOT NULL DEFAULT 30,
  status public.appointment_status NOT NULL DEFAULT 'scheduled',
  reason text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.appointments TO authenticated;
GRANT ALL ON public.appointments TO service_role;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic appointments" ON public.appointments FOR ALL TO authenticated
  USING (public.can_access_clinic(clinic_id)) WITH CHECK (public.can_access_clinic(clinic_id));

-- TOOTH TREATMENTS
CREATE TABLE public.tooth_treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  treatment_type_id uuid REFERENCES public.treatment_types(id) ON DELETE SET NULL,
  tooth_number integer NOT NULL,
  surfaces text[] NOT NULL DEFAULT '{}',
  status public.treatment_status NOT NULL DEFAULT 'planned',
  price numeric(12,2) NOT NULL DEFAULT 0,
  dentist_id uuid,
  dentist_name text,
  notes text,
  performed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tooth_treatments TO authenticated;
GRANT ALL ON public.tooth_treatments TO service_role;
ALTER TABLE public.tooth_treatments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic tooth treatments" ON public.tooth_treatments FOR ALL TO authenticated
  USING (public.can_access_clinic(clinic_id)) WITH CHECK (public.can_access_clinic(clinic_id));

-- PLANS
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  billing_mode public.billing_mode NOT NULL DEFAULT 'per_visit',
  price numeric(12,2) NOT NULL DEFAULT 0,
  description text,
  popular boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.plans TO authenticated;
GRANT ALL ON public.plans TO service_role;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic plans read" ON public.plans FOR SELECT TO authenticated
  USING (public.can_access_clinic(clinic_id));
CREATE POLICY "admins manage plans" ON public.plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- PATIENT SUBSCRIPTIONS
CREATE TABLE public.patient_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  started_at date NOT NULL DEFAULT current_date,
  ends_at date,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patient_subscriptions TO authenticated;
GRANT ALL ON public.patient_subscriptions TO service_role;
ALTER TABLE public.patient_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic subscriptions" ON public.patient_subscriptions FOR ALL TO authenticated
  USING (public.can_access_clinic(clinic_id)) WITH CHECK (public.can_access_clinic(clinic_id));

-- INVOICES
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  number text,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0,
  paid numeric(12,2) NOT NULL DEFAULT 0,
  status public.invoice_status NOT NULL DEFAULT 'unpaid',
  issued_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic invoices" ON public.invoices FOR ALL TO authenticated
  USING (public.can_access_clinic(clinic_id)) WITH CHECK (public.can_access_clinic(clinic_id));

-- PAYMENTS
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'cash',
  received_by uuid,
  received_by_name text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic payments" ON public.payments FOR ALL TO authenticated
  USING (public.can_access_clinic(clinic_id)) WITH CHECK (public.can_access_clinic(clinic_id));

-- STAFF LEDGER
CREATE TABLE public.staff_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  staff_id uuid,
  staff_name text NOT NULL,
  entry_type public.ledger_entry_type NOT NULL DEFAULT 'earning',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  note text,
  occurred_on date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_ledger TO authenticated;
GRANT ALL ON public.staff_ledger TO service_role;
ALTER TABLE public.staff_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff ledger read" ON public.staff_ledger FOR SELECT TO authenticated
  USING (staff_id = auth.uid() OR public.can_access_clinic(clinic_id));
CREATE POLICY "staff ledger manage" ON public.staff_ledger FOR ALL TO authenticated
  USING (public.can_access_clinic(clinic_id)) WITH CHECK (public.can_access_clinic(clinic_id));

-- TEMPLATES
CREATE TABLE public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  body text NOT NULL DEFAULT '',
  mobile_ready boolean NOT NULL DEFAULT true,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.templates TO authenticated;
GRANT ALL ON public.templates TO service_role;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic templates" ON public.templates FOR ALL TO authenticated
  USING (public.can_access_clinic(clinic_id)) WITH CHECK (public.can_access_clinic(clinic_id));

-- updated_at triggers
CREATE TRIGGER t1 BEFORE UPDATE ON public.clinics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t2 BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t3 BEFORE UPDATE ON public.patients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t4 BEFORE UPDATE ON public.treatment_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t5 BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t6 BEFORE UPDATE ON public.tooth_treatments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t7 BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t8 BEFORE UPDATE ON public.patient_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t9 BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t10 BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SEED DEMO CLINIC AND DATA
INSERT INTO public.clinics (id, name, type, address, phone, currency) VALUES
  ('11111111-1111-1111-1111-111111111111','Orbit Care Central','center','12 Riverside Ave','+1 555 0100','USD'),
  ('22222222-2222-2222-2222-222222222222','Orbit Poly Clinic North','poly_clinic','88 North Road','+1 555 0144','USD');

INSERT INTO public.treatment_types (id, clinic_id, name, code, category, color, default_price, duration_min) VALUES
  ('aaaa0001-0000-4000-8000-000000000001','11111111-1111-1111-1111-111111111111','Composite Restoration','D2391','Restorative','#C8FF3D',180,45),
  ('aaaa0001-0000-4000-8000-000000000002','11111111-1111-1111-1111-111111111111','Full-Coverage Crown','D2740','Prosthodontics','#0E1B2B',780,90),
  ('aaaa0001-0000-4000-8000-000000000003','11111111-1111-1111-1111-111111111111','Root Canal Therapy','D3310','Endodontics','#F97316',620,120),
  ('aaaa0001-0000-4000-8000-000000000004','11111111-1111-1111-1111-111111111111','Scaling & Polishing','D1110','Hygiene','#38BDF8',95,30),
  ('aaaa0001-0000-4000-8000-000000000005','11111111-1111-1111-1111-111111111111','Extraction','D7140','Surgery','#EF4444',210,45),
  ('aaaa0001-0000-4000-8000-000000000006','11111111-1111-1111-1111-111111111111','Implant Placement','D6010','Surgery','#A855F7',1900,150),
  ('aaaa0001-0000-4000-8000-000000000007','11111111-1111-1111-1111-111111111111','Teeth Whitening','D9972','Cosmetic','#FACC15',340,60),
  ('aaaa0001-0000-4000-8000-000000000008','11111111-1111-1111-1111-111111111111','Fissure Sealant','D1351','Preventive','#22C55E',65,20);

INSERT INTO public.patients (id, clinic_id, full_name, phone, date_of_birth, gender, chart_number, allergies, medical_notes) VALUES
  ('bbbb0001-0000-4000-8000-000000000001','11111111-1111-1111-1111-111111111111','Mara Voss','+1 555 0111','1988-04-12','Female','#4471','Penicillin','Sensitive to cold.'),
  ('bbbb0001-0000-4000-8000-000000000002','11111111-1111-1111-1111-111111111111','Omar Haddad','+1 555 0112','1975-11-02','Male','#4472',NULL,'Hypertension, monitored.'),
  ('bbbb0001-0000-4000-8000-000000000003','11111111-1111-1111-1111-111111111111','Lena Kaur','+1 555 0113','1996-06-23','Female','#4473','Latex',NULL),
  ('bbbb0001-0000-4000-8000-000000000004','11111111-1111-1111-1111-111111111111','Priya Chandra','+1 555 0114','2001-01-30','Female','#4474',NULL,'Orthodontic retainer.'),
  ('bbbb0001-0000-4000-8000-000000000005','11111111-1111-1111-1111-111111111111','Daniel Kim','+1 555 0115','1969-09-08','Male','#4475',NULL,'Diabetic type 2.');

INSERT INTO public.appointments (clinic_id, patient_id, dentist_name, starts_at, duration_min, status, reason) VALUES
  ('11111111-1111-1111-1111-111111111111','bbbb0001-0000-4000-8000-000000000001','Dr. Omar D.', now() + interval '2 hour', 45,'in_chair','Composite · tooth 22'),
  ('11111111-1111-1111-1111-111111111111','bbbb0001-0000-4000-8000-000000000002','Dr. Priya C.', now() + interval '4 hour', 90,'scheduled','Crown fitting · tooth 36'),
  ('11111111-1111-1111-1111-111111111111','bbbb0001-0000-4000-8000-000000000003','Dr. Omar D.', now() + interval '1 day', 120,'confirmed','Root canal · tooth 17'),
  ('11111111-1111-1111-1111-111111111111','bbbb0001-0000-4000-8000-000000000004','Dr. Priya C.', now() + interval '1 day 3 hour', 30,'scheduled','Scaling & polishing'),
  ('11111111-1111-1111-1111-111111111111','bbbb0001-0000-4000-8000-000000000005','Dr. Omar D.', now() - interval '1 day', 45,'completed','Extraction · tooth 48');

INSERT INTO public.tooth_treatments (clinic_id, patient_id, treatment_type_id, tooth_number, surfaces, status, price, dentist_name, performed_at) VALUES
  ('11111111-1111-1111-1111-111111111111','bbbb0001-0000-4000-8000-000000000001','aaaa0001-0000-4000-8000-000000000001',22,'{M,O}','in_progress',180,'Dr. Omar D.',now()),
  ('11111111-1111-1111-1111-111111111111','bbbb0001-0000-4000-8000-000000000001','aaaa0001-0000-4000-8000-000000000002',26,'{O,B,L}','planned',780,'Dr. Omar D.',NULL),
  ('11111111-1111-1111-1111-111111111111','bbbb0001-0000-4000-8000-000000000001','aaaa0001-0000-4000-8000-000000000004',11,'{B}','completed',95,'Dr. Priya C.',now() - interval '20 day'),
  ('11111111-1111-1111-1111-111111111111','bbbb0001-0000-4000-8000-000000000002','aaaa0001-0000-4000-8000-000000000003',17,'{O}','planned',620,'Dr. Priya C.',NULL),
  ('11111111-1111-1111-1111-111111111111','bbbb0001-0000-4000-8000-000000000005','aaaa0001-0000-4000-8000-000000000005',48,'{}','completed',210,'Dr. Omar D.',now() - interval '1 day');

INSERT INTO public.plans (id, clinic_id, name, billing_mode, price, description, popular) VALUES
  ('cccc0001-0000-4000-8000-000000000001','11111111-1111-1111-1111-111111111111','Per-Visit','per_visit',45,'Charged once per clinic visit.',false),
  ('cccc0001-0000-4000-8000-000000000002','11111111-1111-1111-1111-111111111111','Monthly Care','per_month',120,'Unlimited hygiene visits and 20% off treatments.',true),
  ('cccc0001-0000-4000-8000-000000000003','11111111-1111-1111-1111-111111111111','Per-Treatment','per_treatment',0,'Pay the listed price for each treatment performed.',false);

INSERT INTO public.patient_subscriptions (clinic_id, patient_id, plan_id) VALUES
  ('11111111-1111-1111-1111-111111111111','bbbb0001-0000-4000-8000-000000000001','cccc0001-0000-4000-8000-000000000002'),
  ('11111111-1111-1111-1111-111111111111','bbbb0001-0000-4000-8000-000000000002','cccc0001-0000-4000-8000-000000000001');

INSERT INTO public.invoices (id, clinic_id, patient_id, number, subtotal, discount, total, paid, status) VALUES
  ('dddd0001-0000-4000-8000-000000000001','11111111-1111-1111-1111-111111111111','bbbb0001-0000-4000-8000-000000000001','INV-1001',275,0,275,275,'paid'),
  ('dddd0001-0000-4000-8000-000000000002','11111111-1111-1111-1111-111111111111','bbbb0001-0000-4000-8000-000000000002','INV-1002',620,20,600,200,'partial'),
  ('dddd0001-0000-4000-8000-000000000003','11111111-1111-1111-1111-111111111111','bbbb0001-0000-4000-8000-000000000005','INV-1003',210,0,210,0,'unpaid');

INSERT INTO public.payments (clinic_id, invoice_id, patient_id, amount, method, received_by_name) VALUES
  ('11111111-1111-1111-1111-111111111111','dddd0001-0000-4000-8000-000000000001','bbbb0001-0000-4000-8000-000000000001',275,'card','Lena K.'),
  ('11111111-1111-1111-1111-111111111111','dddd0001-0000-4000-8000-000000000002','bbbb0001-0000-4000-8000-000000000002',200,'cash','Lena K.');

INSERT INTO public.staff_ledger (clinic_id, staff_name, entry_type, amount, note) VALUES
  ('11111111-1111-1111-1111-111111111111','Dr. Omar D.','earning',8940,'148 procedures'),
  ('11111111-1111-1111-1111-111111111111','Dr. Priya C.','earning',7260,'126 procedures'),
  ('11111111-1111-1111-1111-111111111111','Lena K.','earning',2410,'Reception salary'),
  ('11111111-1111-1111-1111-111111111111','Dr. Omar D.','payout',-4000,'Mid-month payout'),
  ('11111111-1111-1111-1111-111111111111','Clinic','expense',-1200,'Lab and materials');

INSERT INTO public.templates (clinic_id, name, category, mobile_ready, tags, body) VALUES
  ('11111111-1111-1111-1111-111111111111','Consent & Release','consent',true,'{consent,signature}','I, {{patient_name}}, consent to the treatment plan discussed on {{date}} at {{clinic_name}}.'),
  ('11111111-1111-1111-1111-111111111111','Invoice + Payment','billing',true,'{invoice,qr}','Invoice {{invoice_number}} for {{patient_name}} — total {{total}}. Scan to pay.'),
  ('11111111-1111-1111-1111-111111111111','Recall Reminder','messaging',true,'{sms,whatsapp}','Hi {{patient_name}}, your recall visit at {{clinic_name}} is due. Reply YES to book.'),
  ('11111111-1111-1111-1111-111111111111','Post-Extraction Care','clinical',true,'{aftercare}','Bite on gauze for 30 minutes. No rinsing for 24 hours. Soft food only today.'),
  ('11111111-1111-1111-1111-111111111111','Treatment Plan Estimate','clinical',false,'{estimate}','Planned treatments for {{patient_name}}: {{treatment_list}}. Estimated total {{total}}.'),
  ('11111111-1111-1111-1111-111111111111','Medical History Intake','intake',true,'{intake,form}','Please list current medications, allergies and prior surgeries.');

-- NEW USER TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email, clinic_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email,
    '11111111-1111-1111-1111-111111111111'
  );

  BEGIN
    _role := COALESCE(NEW.raw_user_meta_data->>'role','reception')::public.app_role;
  EXCEPTION WHEN others THEN
    _role := 'reception';
  END;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
