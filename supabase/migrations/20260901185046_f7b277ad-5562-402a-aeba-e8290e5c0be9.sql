
REVOKE ALL ON FUNCTION public.calculate_clinic_monthly_usage(date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_clinic_monthly_invoice_with_items(uuid, uuid, numeric, date, integer, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_clinic_invoice_status(uuid, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.calculate_clinic_monthly_usage(date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_clinic_monthly_invoice_with_items(uuid, uuid, numeric, date, integer, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_clinic_invoice_status(uuid, text) TO authenticated, service_role;
