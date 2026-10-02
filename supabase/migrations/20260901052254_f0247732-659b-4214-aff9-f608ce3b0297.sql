CREATE OR REPLACE FUNCTION public.update_treatment_plan_totals()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_visit_cost numeric;
  v_total_paid numeric;
  v_completed_count integer;
  v_plan_id uuid;
  v_plan_total numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_plan_id := OLD.treatment_plan_id;
  ELSE
    v_plan_id := NEW.treatment_plan_id;
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN status = 'completed' THEN visit_cost ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'completed' THEN payment_received ELSE 0 END), 0),
    COUNT(CASE WHEN status = 'completed' THEN 1 END)
  INTO v_visit_cost, v_total_paid, v_completed_count
  FROM treatment_visits
  WHERE treatment_plan_id = v_plan_id;

  SELECT COALESCE(total_cost, 0) INTO v_plan_total FROM treatment_plans WHERE id = v_plan_id;

  UPDATE treatment_plans
  SET
    total_cost = CASE WHEN v_plan_total > 0 THEN v_plan_total ELSE v_visit_cost END,
    paid_amount = v_total_paid,
    completed_visits = v_completed_count,
    updated_at = now()
  WHERE id = v_plan_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;