WITH picked AS (
  SELECT id,
         row_number() OVER (PARTITION BY clinic_id, doctor_id ORDER BY appointment_date DESC) AS rn
  FROM public.appointments
  WHERE status IN ('scheduled','confirmed')
)
UPDATE public.appointments a
SET appointment_date = date_trunc('day', now()) + ((8 + (p.rn * 2)) || ' hours')::interval,
    status = CASE p.rn WHEN 1 THEN 'scheduled' WHEN 2 THEN 'arrived' WHEN 3 THEN 'in_chair' ELSE 'ready_to_pay' END,
    arrived_at = CASE WHEN p.rn >= 2 THEN now() ELSE NULL END,
    seated_at  = CASE WHEN p.rn >= 3 THEN now() ELSE NULL END
FROM picked p
WHERE a.id = p.id AND p.rn <= 4;