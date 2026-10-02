ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS treatment_plan_id uuid REFERENCES public.treatment_plans(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS invoices_treatment_plan_id_key ON public.invoices(treatment_plan_id) WHERE treatment_plan_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.auto_invoice_completed_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max int := 0;
  v_number text;
  v_desc text;
  v_exists uuid;
BEGIN
  IF NEW.status = 'completed' AND COALESCE(OLD.status, '') <> 'completed' AND COALESCE(NEW.total_cost, 0) > 0 THEN
    SELECT id INTO v_exists FROM public.invoices WHERE treatment_plan_id = NEW.id LIMIT 1;
    IF v_exists IS NOT NULL THEN
      RETURN NEW;
    END IF;

    SELECT COALESCE(MAX(NULLIF(regexp_replace(split_part(invoice_number, '-', 2), '\D', '', 'g'), '')::int), 0)
      INTO v_max
      FROM public.invoices
     WHERE clinic_id = NEW.clinic_id;

    v_number := 'INV-' || lpad((v_max + 1)::text, 6, '0');

    SELECT COALESCE(tt.name, NEW.treatment_category, 'Treatment plan')
      INTO v_desc
      FROM public.treatment_types tt
     WHERE tt.id = NEW.treatment_type_id;

    v_desc := COALESCE(v_desc, NEW.treatment_category, 'Treatment plan');

    INSERT INTO public.invoices (
      clinic_id, patient_id, doctor_id, invoice_number, invoice_date,
      items, subtotal, total, paid_amount, payment_status, notes,
      created_by, treatment_plan_id
    ) VALUES (
      NEW.clinic_id, NEW.patient_id, NEW.doctor_id, v_number, now(),
      jsonb_build_array(jsonb_build_object(
        'description', v_desc || ' (treatment plan)',
        'quantity', 1,
        'unitPrice', NEW.total_cost,
        'total', NEW.total_cost
      )),
      NEW.total_cost, NEW.total_cost, COALESCE(NEW.paid_amount, 0),
      CASE WHEN COALESCE(NEW.paid_amount, 0) >= NEW.total_cost THEN 'paid'
           WHEN COALESCE(NEW.paid_amount, 0) > 0 THEN 'partial'
           ELSE 'unpaid' END,
      'Auto-generated from completed treatment plan',
      NEW.doctor_id, NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_invoice_completed_plan ON public.treatment_plans;
CREATE TRIGGER trg_auto_invoice_completed_plan
AFTER UPDATE OF status ON public.treatment_plans
FOR EACH ROW EXECUTE FUNCTION public.auto_invoice_completed_plan();