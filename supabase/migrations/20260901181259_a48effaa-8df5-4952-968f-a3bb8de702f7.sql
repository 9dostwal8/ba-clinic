
ALTER TABLE public.clinic_types ADD COLUMN IF NOT EXISTS subscription_plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL;

DROP TRIGGER IF EXISTS trigger_sync_clinics_on_type_billing_change ON public.clinic_types;
DROP TRIGGER IF EXISTS trigger_update_billing_on_type_change ON public.clinics;
DROP TRIGGER IF EXISTS trigger_create_billing_for_new_clinic ON public.clinics;

CREATE OR REPLACE FUNCTION public.assign_clinic_type_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan_id uuid;
BEGIN
  IF NEW.clinic_type_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT subscription_plan_id INTO v_plan_id
  FROM public.clinic_types WHERE id = NEW.clinic_type_id;

  IF v_plan_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.clinic_subscriptions
    WHERE clinic_id = NEW.id AND status = 'active'
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.clinic_subscriptions (clinic_id, plan_id, status, start_date)
  VALUES (NEW.id, v_plan_id, 'active', CURRENT_DATE);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_assign_clinic_type_subscription
AFTER INSERT ON public.clinics
FOR EACH ROW EXECUTE FUNCTION public.assign_clinic_type_subscription();
