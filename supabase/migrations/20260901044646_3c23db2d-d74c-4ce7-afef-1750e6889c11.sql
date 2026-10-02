ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_status_check;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_status_check
  CHECK (status = ANY (ARRAY['scheduled','confirmed','arrived','in_chair','ready_to_pay','completed','cancelled','no_show']));

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS arrived_at timestamptz,
  ADD COLUMN IF NOT EXISTS seated_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_appointments_clinic_date_status
  ON public.appointments (clinic_id, appointment_date, status);