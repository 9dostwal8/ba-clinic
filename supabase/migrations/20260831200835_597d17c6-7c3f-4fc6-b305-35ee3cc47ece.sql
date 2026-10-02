ALTER TABLE public.medications
  ADD COLUMN IF NOT EXISTS clinic_id uuid REFERENCES public.clinics(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS is_global boolean DEFAULT true;

ALTER TABLE public.translation_keys ADD COLUMN IF NOT EXISTS key text;

CREATE OR REPLACE FUNCTION public.sync_translation_key_alias()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.key IS NOT NULL AND (NEW.key_name IS NULL OR NEW.key_name = '') THEN
    NEW.key_name := NEW.key;
  ELSIF NEW.key_name IS NOT NULL AND (NEW.key IS NULL OR NEW.key = '') THEN
    NEW.key := NEW.key_name;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_translation_key_alias ON public.translation_keys;
CREATE TRIGGER sync_translation_key_alias
  BEFORE INSERT OR UPDATE ON public.translation_keys
  FOR EACH ROW EXECUTE FUNCTION public.sync_translation_key_alias();

UPDATE public.translation_keys SET key = key_name WHERE key IS NULL;
ALTER TABLE public.translation_keys ALTER COLUMN key_name DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS translation_keys_key_uidx ON public.translation_keys(key);

ALTER TABLE public.clinic_invoice_items
  ADD COLUMN IF NOT EXISTS treatment_id uuid REFERENCES public.treatments(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.treatment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  treatment_id uuid REFERENCES public.treatments(id) ON DELETE SET NULL,
  treatment_type_id uuid REFERENCES public.treatment_types(id) ON DELETE SET NULL,
  patient_id uuid REFERENCES public.patients(id) ON DELETE SET NULL,
  doctor_id uuid REFERENCES public.users(id),
  description text,
  tooth_number text,
  quantity integer DEFAULT 1,
  unit_price numeric DEFAULT 0,
  amount numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatment_items TO authenticated;
GRANT ALL ON public.treatment_items TO service_role;
ALTER TABLE public.treatment_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clinic access treatment_items" ON public.treatment_items;
CREATE POLICY "clinic access treatment_items" ON public.treatment_items FOR ALL TO authenticated
  USING (public.is_super_admin() OR clinic_id = public.current_user_clinic_id())
  WITH CHECK (public.is_super_admin() OR clinic_id = public.current_user_clinic_id());