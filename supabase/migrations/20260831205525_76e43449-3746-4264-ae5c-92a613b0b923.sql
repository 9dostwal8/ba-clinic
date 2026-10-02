CREATE OR REPLACE FUNCTION public.log_clinic_treatment_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO clinic_usage_logs (clinic_id, event_type, event_date, reference_id, metadata)
  VALUES (
    NEW.clinic_id,
    'treatment_created',
    COALESCE(NEW.created_at, now()),
    NEW.id,
    jsonb_build_object('patient_id', NEW.patient_id, 'treatment_type', NEW.procedure, 'status', NEW.status)
  );
  RETURN NEW;
END;
$$;