// @ts-nocheck
import { documentCss } from './documentTheme';
import { supabase } from '../lib/supabase';

export interface ReceiptLine {
  label: string;
  value: string;
}

export interface ReceiptData {
  clinicName: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicLogo?: string;
  invoiceNumber?: string;
  receiptNumber: string;
  paidAt: string;
  patientName: string;
  patientPhone?: string;
  doctorName?: string;
  amountPaid: number;
  paymentMethod: string;
  total?: number;
  previouslyPaid?: number;
  remaining?: number;
  collectedBy?: string;
  currencySymbol: string;
  visitLines: ReceiptLine[];
  nextVisits: Array<{ when: string; who?: string; what?: string }>;
}

const fmtDateTime = (iso: string) => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Collect everything needed to print a receipt for a payment that was
 * just recorded: clinic header, visit details and the patient's next visits.
 */
export async function buildReceiptData(opts: {
  clinicId: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  doctorName?: string;
  amountPaid: number;
  paymentMethod: string;
  invoiceNumber?: string;
  total?: number;
  previouslyPaid?: number;
  remaining?: number;
  collectedBy?: string;
  currencySymbol: string;
  visitLines?: ReceiptLine[];
  treatmentPlanId?: string;
}): Promise<ReceiptData> {
  const nowIso = new Date().toISOString();

  const [{ data: clinic }, { data: appts }, { data: futureVisits }] = await Promise.all([
    supabase
      .from('clinics')
      .select('name, name_ar, address, phone, logo_url')
      .eq('id', opts.clinicId)
      .maybeSingle(),
    supabase
      .from('appointments')
      .select('appointment_date, appointment_type, status, doctor:users!appointments_doctor_id_fkey(full_name)')
      .eq('clinic_id', opts.clinicId)
      .eq('patient_id', opts.patientId)
      .gte('appointment_date', nowIso)
      .order('appointment_date', { ascending: true })
      .limit(5),
    supabase
      .from('treatment_visits')
      .select('visit_number, visit_date, status, visit_cost, doctor:users!treatment_visits_doctor_id_fkey(full_name)')
      .eq('patient_id', opts.patientId)
      .neq('status', 'completed')
      .gte('visit_date', nowIso)
      .order('visit_date', { ascending: true })
      .limit(5),
  ]);

  const nextVisits: ReceiptData['nextVisits'] = [];
  (appts || [])
    .filter((a: any) => a.status !== 'cancelled')
    .forEach((a: any) =>
      nextVisits.push({
        when: fmtDateTime(a.appointment_date),
        who: a.doctor?.full_name,
        what: a.appointment_type || 'Appointment',
      })
    );
  (futureVisits || []).forEach((v: any) =>
    nextVisits.push({
      when: fmtDateTime(v.visit_date),
      who: v.doctor?.full_name,
      what: `Visit #${v.visit_number}`,
    })
  );

  return {
    clinicName: clinic?.name || 'Dental Clinic',
    clinicAddress: clinic?.address || '',
    clinicPhone: clinic?.phone || '',
    clinicLogo: clinic?.logo_url || '',
    invoiceNumber: opts.invoiceNumber,
    receiptNumber: `RCT-${Date.now().toString().slice(-8)}`,
    paidAt: fmtDateTime(nowIso),
    patientName: opts.patientName,
    patientPhone: opts.patientPhone,
    doctorName: opts.doctorName,
    amountPaid: opts.amountPaid,
    paymentMethod: opts.paymentMethod,
    total: opts.total,
    previouslyPaid: opts.previouslyPaid,
    remaining: opts.remaining,
    collectedBy: opts.collectedBy,
    currencySymbol: opts.currencySymbol,
    visitLines: opts.visitLines || [],
    nextVisits,
  };
}

const esc = (s: any) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export function receiptHtml(d: ReceiptData) {
  const money = (n: number) => `${d.currencySymbol}${Number(n || 0).toFixed(2)}`;
  return `<!doctype html><html><head><meta charset="utf-8" />
<title>Receipt ${esc(d.receiptNumber)}</title>
<style>${documentCss()}</style>
<div class="sheet">
  <div class="head">
    <div>
      <div class="clinic">${esc(d.clinicName)}</div>
      <div class="muted">${esc(d.clinicAddress || '')}</div>
      <div class="muted">${esc(d.clinicPhone || '')}</div>
    </div>
    <div style="text-align:right">
      ${d.clinicLogo ? `<img src="${esc(d.clinicLogo)}" style="max-height:52px;margin-bottom:6px" />` : ''}
      <div style="font-weight:700">PAYMENT RECEIPT</div>
      <div class="muted">${esc(d.receiptNumber)}</div>
      ${d.invoiceNumber ? `<div class="muted">Invoice ${esc(d.invoiceNumber)}</div>` : ''}
      <div class="muted">${esc(d.paidAt)}</div>
    </div>
  </div>

  <h2>Patient</h2>
  <table>
    <tr><td style="width:35%"><strong>Name</strong></td><td>${esc(d.patientName)}</td></tr>
    ${d.patientPhone ? `<tr><td><strong>Phone</strong></td><td>${esc(d.patientPhone)}</td></tr>` : ''}
    ${d.doctorName ? `<tr><td><strong>Doctor</strong></td><td>${esc(d.doctorName)}</td></tr>` : ''}
  </table>

  ${
    d.visitLines.length
      ? `<h2>Visit details</h2><table>${d.visitLines
          .map((l) => `<tr><td style="width:35%"><strong>${esc(l.label)}</strong></td><td>${esc(l.value)}</td></tr>`)
          .join('')}</table>`
      : ''
  }

  <h2>Payment</h2>
  <table class="totals">
    ${d.total != null ? `<tr><td>Total</td><td class="amt">${money(d.total)}</td></tr>` : ''}
    ${d.previouslyPaid != null ? `<tr><td>Previously paid</td><td class="amt">${money(d.previouslyPaid)}</td></tr>` : ''}
    <tr><td>Paid now (${esc(d.paymentMethod)})</td><td class="amt paid">${money(d.amountPaid)}</td></tr>
    ${d.remaining != null ? `<tr><td>Remaining balance</td><td class="amt"><strong>${money(d.remaining)}</strong></td></tr>` : ''}
  </table>

  <h2>Next visits</h2>
  ${
    d.nextVisits.length
      ? `<table><thead><tr><th>Date &amp; time</th><th>Visit</th><th>Doctor</th></tr></thead><tbody>
      ${d.nextVisits
        .map(
          (v) =>
            `<tr><td>${esc(v.when)}</td><td>${esc(v.what || '-')}</td><td>${esc(v.who || '-')}</td></tr>`
        )
        .join('')}</tbody></table>`
      : `<div class="muted">No upcoming visit scheduled. Please book the next appointment at reception.</div>`
  }

  <div class="sign"><div>Received by: ${esc(d.collectedBy || '')}</div><div>Patient signature</div></div>
  <div class="foot">Thank you for visiting ${esc(d.clinicName)}. Please keep this receipt for your records.</div>
</div>
<script>window.onload = function(){ window.focus(); window.print(); };</script>
</body></html>`;
}

export function printReceipt(d: ReceiptData) {
  const html = receiptHtml(d);
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    try {
      document.body.removeChild(frame);
    } catch {
      /* noop */
    }
  }, 60000);
}
