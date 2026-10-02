
-- 1) Subscription-driven usage calculation
CREATE OR REPLACE FUNCTION public.calculate_clinic_monthly_usage(p_start_date date, p_end_date date)
RETURNS TABLE(
  clinic_id uuid,
  clinic_name text,
  billing_type text,
  unit_price numeric,
  treatment_count bigint,
  patient_count bigint,
  billable_units integer,
  total_amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH base AS (
    SELECT
      c.id AS c_id,
      c.name AS c_name,
      eb.billing_mode,
      COALESCE(eb.unit_price, 0)::numeric AS u_price,
      COALESCE(eb.price_monthly, 0)::numeric AS m_price,
      GREATEST(
        COALESCE((SELECT COUNT(*) FROM treatments t
                  WHERE t.clinic_id = c.id
                    AND DATE(t.treatment_date) BETWEEN p_start_date AND p_end_date), 0),
        COALESCE((SELECT SUM(CASE WHEN jsonb_typeof(i.items) = 'array' THEN jsonb_array_length(i.items) ELSE 0 END)
                  FROM invoices i
                  WHERE i.clinic_id = c.id
                    AND DATE(i.invoice_date) BETWEEN p_start_date AND p_end_date), 0)
      )::bigint AS t_count,
      COALESCE((SELECT COUNT(DISTINCT i.patient_id) FROM invoices i
                WHERE i.clinic_id = c.id
                  AND DATE(i.invoice_date) BETWEEN p_start_date AND p_end_date), 0)::bigint AS p_count
    FROM clinics c
    CROSS JOIN LATERAL public.get_clinic_effective_billing(c.id) eb
    WHERE c.subscription_status = 'active'
      AND eb.plan_id IS NOT NULL
  )
  SELECT
    b.c_id,
    b.c_name,
    COALESCE(b.billing_mode, 'per_month')::text,
    CASE WHEN COALESCE(b.billing_mode,'per_month') = 'per_month' THEN b.m_price ELSE b.u_price END,
    b.t_count,
    b.p_count,
    CASE
      WHEN b.billing_mode = 'per_treatment' THEN b.t_count::integer
      WHEN b.billing_mode = 'per_patient' THEN b.p_count::integer
      ELSE 1
    END,
    CASE
      WHEN b.billing_mode = 'per_treatment' THEN b.t_count * b.u_price
      WHEN b.billing_mode = 'per_patient' THEN b.p_count * b.u_price
      ELSE b.m_price
    END
  FROM base b;
END;
$$;

-- 2) Invoice generation independent of legacy billing models
CREATE OR REPLACE FUNCTION public.create_clinic_monthly_invoice_with_items(
  p_clinic_id uuid,
  p_usage_record_id uuid,
  p_discount_percentage numeric DEFAULT 0,
  p_issue_date date DEFAULT CURRENT_DATE,
  p_due_days integer DEFAULT 30,
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
  v_invoice_number text;
  v_usage monthly_clinic_usage%ROWTYPE;
  v_billing_type text;
  v_unit_price numeric;
  v_subtotal numeric;
  v_discount numeric;
  v_total numeric;
  v_item RECORD;
BEGIN
  SELECT * INTO v_usage FROM monthly_clinic_usage WHERE id = p_usage_record_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usage record not found';
  END IF;

  SELECT COALESCE(eb.billing_mode, 'per_month')
    INTO v_billing_type
  FROM public.get_clinic_effective_billing(p_clinic_id) eb
  LIMIT 1;

  v_billing_type := COALESCE(v_billing_type, 'per_month');
  v_unit_price := COALESCE(v_usage.unit_price, 0);

  v_subtotal := COALESCE(v_usage.total_amount, 0);
  v_discount := ROUND(v_subtotal * (COALESCE(p_discount_percentage, 0) / 100), 2);
  v_total := v_subtotal - v_discount;

  v_invoice_number := 'SUB-' || TO_CHAR(p_issue_date, 'YYYYMM') || '-' ||
    LPAD((SELECT COALESCE(MAX(SUBSTRING(invoice_number FROM '\d+$')::integer), 0) + 1
          FROM clinic_monthly_invoices
          WHERE invoice_number LIKE 'SUB-' || TO_CHAR(p_issue_date, 'YYYYMM') || '-%')::text, 6, '0');

  INSERT INTO clinic_monthly_invoices (
    invoice_number, clinic_id, usage_record_id, billing_period_start, billing_period_end,
    billing_type, unit_count, unit_price, subtotal, discount_amount, discount_percentage,
    total_amount, currency, status, issued_date, due_date, created_by
  ) VALUES (
    v_invoice_number, p_clinic_id, p_usage_record_id,
    v_usage.billing_period_start, v_usage.billing_period_end,
    v_billing_type, COALESCE(v_usage.billable_unit_count, 0), v_unit_price,
    v_subtotal, v_discount, COALESCE(p_discount_percentage, 0),
    v_total, 'IQD', 'draft', p_issue_date, p_issue_date + p_due_days, p_created_by
  ) RETURNING id INTO v_invoice_id;

  IF v_billing_type = 'per_month' THEN
    INSERT INTO clinic_invoice_items (invoice_id, description, quantity, unit_price, line_total)
    VALUES (v_invoice_id, 'Monthly subscription fee', 1, v_unit_price, v_unit_price);
  ELSE
    FOR v_item IN
      SELECT
        COALESCE(item->>'description', 'Treatment') AS description,
        COALESCE((item->>'quantity')::numeric, 1) AS quantity,
        i.invoice_date AS treatment_date
      FROM invoices i
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(i.items) = 'array' THEN i.items ELSE '[]'::jsonb END
      ) AS item
      WHERE i.clinic_id = p_clinic_id
        AND DATE(i.invoice_date) BETWEEN v_usage.billing_period_start AND v_usage.billing_period_end
      LIMIT 200
    LOOP
      INSERT INTO clinic_invoice_items (invoice_id, description, quantity, unit_price, line_total, treatment_date)
      VALUES (v_invoice_id, v_item.description, v_item.quantity, v_unit_price,
              v_item.quantity * v_unit_price, v_item.treatment_date);
    END LOOP;
  END IF;

  UPDATE monthly_clinic_usage SET status = 'invoiced' WHERE id = p_usage_record_id;

  RETURN v_invoice_id;
END;
$$;

-- 3) Status helper for platform invoices
CREATE OR REPLACE FUNCTION public.set_clinic_invoice_status(p_invoice_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only super admins can change platform invoice status';
  END IF;

  IF p_status NOT IN ('draft','sent','paid','overdue','cancelled') THEN
    RAISE EXCEPTION 'Invalid status %', p_status;
  END IF;

  UPDATE clinic_monthly_invoices
  SET status = p_status,
      paid_date = CASE WHEN p_status = 'paid' THEN CURRENT_DATE ELSE NULL END,
      updated_at = now()
  WHERE id = p_invoice_id;

  IF p_status = 'paid' THEN
    UPDATE monthly_clinic_usage u
    SET status = 'paid'
    FROM clinic_monthly_invoices ci
    WHERE ci.id = p_invoice_id AND u.id = ci.usage_record_id;
  END IF;
END;
$$;
