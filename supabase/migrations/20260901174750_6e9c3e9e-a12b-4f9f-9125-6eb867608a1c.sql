-- 1. Plans: billing mode + richer limits
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS billing_mode text NOT NULL DEFAULT 'per_month',
  ADD COLUMN IF NOT EXISTS price_per_treatment numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS price_per_patient numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_receptionists integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS max_workers integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'IQD',
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscription_plans_billing_mode_check'
  ) THEN
    ALTER TABLE public.subscription_plans
      ADD CONSTRAINT subscription_plans_billing_mode_check
      CHECK (billing_mode IN ('per_month', 'per_treatment', 'per_patient'));
  END IF;
END $$;

-- 2. Clinic subscriptions: per-clinic overrides
ALTER TABLE public.clinic_subscriptions
  ADD COLUMN IF NOT EXISTS billing_mode text,
  ADD COLUMN IF NOT EXISTS custom_price_monthly numeric,
  ADD COLUMN IF NOT EXISTS custom_price_per_treatment numeric,
  ADD COLUMN IF NOT EXISTS custom_price_per_patient numeric,
  ADD COLUMN IF NOT EXISTS notes text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'clinic_subscriptions_billing_mode_check'
  ) THEN
    ALTER TABLE public.clinic_subscriptions
      ADD CONSTRAINT clinic_subscriptions_billing_mode_check
      CHECK (billing_mode IS NULL OR billing_mode IN ('per_month', 'per_treatment', 'per_patient'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS clinic_subscriptions_one_active_per_clinic
  ON public.clinic_subscriptions (clinic_id)
  WHERE status = 'active';

-- 3. Billing models reuse subscription plans
ALTER TABLE public.billing_models
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL;

-- 4. Effective billing resolver
CREATE OR REPLACE FUNCTION public.get_clinic_effective_billing(p_clinic_id uuid)
RETURNS TABLE(
  plan_id uuid,
  plan_name text,
  billing_mode text,
  unit_price numeric,
  price_monthly numeric,
  currency text,
  status text,
  start_date date,
  end_date date,
  max_dentists integer,
  max_staff integer,
  max_receptionists integer,
  max_patients integer,
  max_appointments_per_month integer,
  source text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH sub AS (
    SELECT
      cs.plan_id            AS c_plan_id,
      cs.status             AS c_status,
      cs.start_date         AS c_start_date,
      cs.end_date           AS c_end_date,
      cs.billing_mode       AS c_billing_mode,
      cs.custom_price_monthly       AS c_price_monthly,
      cs.custom_price_per_treatment AS c_price_treatment,
      cs.custom_price_per_patient   AS c_price_patient
    FROM public.clinic_subscriptions cs
    WHERE cs.clinic_id = p_clinic_id
    ORDER BY (cs.status = 'active') DESC, cs.start_date DESC
    LIMIT 1
  )
  SELECT
    p.id,
    p.display_name,
    COALESCE(s.c_billing_mode, p.billing_mode),
    CASE COALESCE(s.c_billing_mode, p.billing_mode)
      WHEN 'per_treatment' THEN COALESCE(s.c_price_treatment, p.price_per_treatment)
      WHEN 'per_patient'   THEN COALESCE(s.c_price_patient, p.price_per_patient)
      ELSE COALESCE(s.c_price_monthly, p.price_monthly)
    END,
    COALESCE(s.c_price_monthly, p.price_monthly),
    p.currency,
    s.c_status,
    s.c_start_date,
    s.c_end_date,
    p.max_dentists,
    p.max_staff,
    p.max_receptionists,
    p.max_patients,
    p.max_appointments_per_month,
    'subscription'::text
  FROM sub s
  JOIN public.subscription_plans p ON p.id = s.c_plan_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_clinic_effective_billing(uuid) TO authenticated, service_role;

-- 5. Feature gate helper
CREATE OR REPLACE FUNCTION public.clinic_has_feature(p_clinic_id uuid, p_feature_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT sf.feature_value
    FROM public.clinic_subscriptions cs
    JOIN public.subscription_features sf ON sf.plan_id = cs.plan_id
    WHERE cs.clinic_id = p_clinic_id
      AND cs.status = 'active'
      AND sf.feature_key = p_feature_key
    LIMIT 1
  ), false);
$$;

GRANT EXECUTE ON FUNCTION public.clinic_has_feature(uuid, text) TO authenticated, service_role;

-- 6. Backfill sensible defaults on existing plans
UPDATE public.subscription_plans
SET billing_mode = 'per_month'
WHERE billing_mode IS NULL;

UPDATE public.subscription_plans sp
SET price_per_treatment = 500
WHERE sp.price_per_treatment = 0 AND sp.billing_mode = 'per_treatment';