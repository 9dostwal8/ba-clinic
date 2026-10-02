DROP TABLE IF EXISTS public.clinic_subscriptions, public.platform_plans, public.templates, public.staff_ledger, public.payments, public.invoices, public.patient_subscriptions, public.plans, public.tooth_treatments, public.appointments, public.treatment_types, public.patients, public.user_roles, public.profiles, public.clinics CASCADE;

DO $t$
DECLARE r record;
BEGIN
  FOR r IN SELECT typname FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype='e' LOOP
    EXECUTE format('DROP TYPE IF EXISTS public.%I CASCADE', r.typname);
  END LOOP;
END
$t$;

GRANT CREATE, USAGE ON SCHEMA public TO sandbox_exec;