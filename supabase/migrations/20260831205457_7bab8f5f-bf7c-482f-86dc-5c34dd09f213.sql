CREATE OR REPLACE FUNCTION public.log_clinic_patient_usage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO clinic_usage_logs (clinic_id, event_type, event_date, reference_id, metadata)
  VALUES (
    NEW.clinic_id,
    'patient_registered',
    COALESCE(NEW.created_at, now()),
    NEW.id,
    jsonb_build_object('patient_name', NEW.full_name, 'phone', NEW.phone)
  );
  RETURN NEW;
END;
$$;