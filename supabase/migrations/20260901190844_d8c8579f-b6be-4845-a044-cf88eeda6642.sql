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
  v_item_type text;
  v_unit_price numeric;
  v_subtotal numeric;
  v_discount numeric;
  v_total numeric;
  v_item RECORD;
  v_item_count integer := 0;
BEGIN
  SELECT * INTO v_usage
  FROM monthly_clinic_usage
  WHERE id = p_usage_record_id
    AND clinic_id = p_clinic_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usage record not found for clinic';
  END IF;

  SELECT COALESCE(eb.billing_mode, 'per_month')
    INTO v_billing_type
  FROM public.get_clinic_effective_billing(p_clinic_id) eb
  LIMIT 1;

  v_billing_type := COALESCE(v_billing_type, 'per_month');
  v_item_type := CASE
    WHEN v_billing_type = 'per_treatment' THEN 'treatment'
    WHEN v_billing_type = 'per_patient' THEN 'patient'
    ELSE 'adjustment'
  END;
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
    INSERT INTO clinic_invoice_items (
      invoice_id, item_type, description, quantity, unit_price, line_total
    ) VALUES (
      v_invoice_id, 'adjustment', 'Monthly subscription fee', 1, v_unit_price, v_subtotal
    );
  ELSE
    FOR v_item IN
      SELECT
        COALESCE(item->>'description', CASE WHEN v_billing_type = 'per_patient' THEN 'Patient usage' ELSE 'Treatment' END) AS description,
        GREATEST(COALESCE((item->>'quantity')::integer, 1), 1) AS quantity,
        i.invoice_date AS treatment_date
      FROM invoices i
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE WHEN jsonb_typeof(i.items) = 'array' THEN i.items ELSE '[]'::jsonb END
      ) AS item
      WHERE i.clinic_id = p_clinic_id
        AND DATE(i.invoice_date) BETWEEN v_usage.billing_period_start AND v_usage.billing_period_end
      LIMIT 200
    LOOP
      INSERT INTO clinic_invoice_items (
        invoice_id, item_type, description, quantity, unit_price, line_total, treatment_date
      ) VALUES (
        v_invoice_id, v_item_type, v_item.description, v_item.quantity, v_unit_price,
        v_item.quantity * v_unit_price, v_item.treatment_date
      );
      v_item_count := v_item_count + 1;
    END LOOP;

    IF v_item_count = 0 THEN
      INSERT INTO clinic_invoice_items (
        invoice_id, item_type, description, quantity, unit_price, line_total
      ) VALUES (
        v_invoice_id,
        v_item_type,
        CASE WHEN v_billing_type = 'per_patient' THEN 'Patient usage for billing period' ELSE 'Treatment usage for billing period' END,
        COALESCE(v_usage.billable_unit_count, 0),
        v_unit_price,
        v_subtotal
      );
    END IF;
  END IF;

  UPDATE monthly_clinic_usage
  SET status = 'invoiced'
  WHERE id = p_usage_record_id;

  RETURN v_invoice_id;
END;
$$;