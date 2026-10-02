INSERT INTO public.staff_permissions (user_id, can_view_appointments, can_edit_appointments, can_view_patients, can_edit_patients, can_view_treatments, can_edit_treatments, can_view_invoices, can_edit_invoices, can_view_treatment_plans, can_edit_treatment_plans, view_all_patients, view_all_appointments)
SELECT u.id, true, true, true, true, true, true, true, false, true, true, true, true
FROM public.users u
LEFT JOIN public.staff_permissions sp ON sp.user_id = u.id
WHERE u.role IN ('doctor','receptionist') AND sp.user_id IS NULL;