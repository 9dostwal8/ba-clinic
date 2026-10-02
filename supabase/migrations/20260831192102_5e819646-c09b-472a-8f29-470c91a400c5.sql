CREATE TYPE public.platform_billing_type AS ENUM ('per_month','per_treatment');
CREATE TYPE public.subscription_status AS ENUM ('trialing','active','past_due','cancelled');

CREATE TABLE public.platform_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  clinic_type public.clinic_type NOT NULL DEFAULT 'normal_clinic',
  billing_type public.platform_billing_type NOT NULL DEFAULT 'per_month',
  price numeric NOT NULL DEFAULT 0,
  per_treatment_fee numeric NOT NULL DEFAULT 0,
  description text,
  features text[] NOT NULL DEFAULT '{}',
  max_users integer,
  popular boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_plans TO authenticated;
GRANT SELECT ON public.platform_plans TO anon;
GRANT ALL ON public.platform_plans TO service_role;
ALTER TABLE public.platform_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "platform plans readable" ON public.platform_plans FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "super admins manage platform plans" ON public.platform_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER pp_updated BEFORE UPDATE ON public.platform_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.clinic_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.platform_plans(id),
  status public.subscription_status NOT NULL DEFAULT 'trialing',
  started_at date NOT NULL DEFAULT CURRENT_DATE,
  current_period_end date,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clinic_subscriptions TO authenticated;
GRANT ALL ON public.clinic_subscriptions TO service_role;
ALTER TABLE public.clinic_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "clinic subscription read" ON public.clinic_subscriptions FOR SELECT TO authenticated
  USING (public.can_access_clinic(clinic_id));
CREATE POLICY "super admins manage clinic subscriptions" ON public.clinic_subscriptions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER cs_updated BEFORE UPDATE ON public.clinic_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.platform_plans (name, clinic_type, billing_type, price, per_treatment_fee, description, features, max_users, popular) VALUES
('Clinic Monthly','normal_clinic','per_month',49,0,'Single-chair or small clinic running day-to-day operations.','{"1 site","Up to 5 users","Tooth charting & scheduling","Billing & invoices"}',5,false),
('Clinic Pay-as-you-go','normal_clinic','per_treatment',0,1.5,'No monthly fee — pay a small fee per completed treatment.','{"1 site","Up to 5 users","Unlimited patients","Billing & invoices"}',5,false),
('Poly Clinic Monthly','poly_clinic','per_month',129,0,'Multi-speciality clinic with several dentists and departments.','{"Up to 3 sites","Up to 20 users","Staff accounting","Templates library"}',20,true),
('Poly Clinic Pay-as-you-go','poly_clinic','per_treatment',0,1.1,'Scale with volume — billed on completed treatments only.','{"Up to 3 sites","Up to 20 users","Staff accounting"}',20,false),
('Center Monthly','center','per_month',299,0,'Full dental center with multi-site management and reporting.','{"Unlimited sites","Unlimited users","Advanced accounting","Priority support"}',NULL,false),
('Center Pay-as-you-go','center','per_treatment',0,0.8,'Enterprise volume pricing per completed treatment.','{"Unlimited sites","Unlimited users","Advanced accounting","Priority support"}',NULL,false);