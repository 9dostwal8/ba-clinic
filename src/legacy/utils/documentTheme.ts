// @ts-nocheck
/**
 * Shared professional print/PDF document theme (Orbit Care).
 * Every generated document (invoice, receipt, prescription, schedule,
 * commission report, treatment plan) uses this single stylesheet so all
 * printed paperwork looks like one clean, consistent brand family.
 */

export const DOC_COLORS = {
  navy: '#0f2f4f',
  navyDeep: '#0a2137',
  navySoft: '#1d4e70',
  lime: '#84cc16',
  slate: '#475569',
  slateSoft: '#64748b',
  line: '#e2e8f0',
  surface: '#f8fafc',
  ink: '#0f172a',
  ok: '#059669',
  warn: '#b45309',
  danger: '#be123c',
};

interface DocCssOptions {
  /** Accent colour override (defaults to Orbit Care navy) */
  accent?: string;
  /** Paper size, e.g. A4, A5, Letter */
  paper?: string;
  /** Page margin for print */
  margin?: string;
  /** Base font family */
  font?: string;
}

export function documentCss(options: DocCssOptions = {}): string {
  const accent = options.accent || '#0f2f4f';
  const paper = options.paper || 'A4';
  const margin = options.margin || '14mm';
  const font =
    options.font ||
    "'Inter', 'Segoe UI', 'Helvetica Neue', Tahoma, 'Noto Naskh Arabic', Arial, sans-serif";

  return `
  :root {
    --accent: ${accent};
    --accent-deep: #0a2137;
    --lime: #84cc16;
    --ink: #0f172a;
    --slate: #475569;
    --muted: #64748b;
    --line: #e2e8f0;
    --surface: #f8fafc;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font-family: ${font};
    font-size: 12.5px;
    line-height: 1.55;
    color: var(--ink);
    background: #eef2f6;
    padding: 24px 16px;
    -webkit-font-smoothing: antialiased;
  }

  /* ---------- Sheet / container ---------- */
  .sheet, .container, .invoice-container, .report, .invoice, .prescription {
    width: 100%;
    max-width: 820px;
    margin: 0 auto;
    background: #fff;
    border: 1px solid var(--line);
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 18px 40px -28px rgba(15, 47, 79, .45);
  }

  /* ---------- Header ---------- */
  .head, .header, .invoice-header {
    position: relative;
    background: linear-gradient(135deg, var(--accent) 0%, var(--accent-deep) 100%);
    color: #fff;
    padding: 22px 26px 20px;
    border-bottom: 3px solid var(--lime);
    text-align: left;
  }
  .head *, .header *, .invoice-header * { color: inherit; border-color: rgba(255,255,255,.25); }
  .clinic, .clinic-name, .invoice-title, .report-title-main {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -.01em;
  }
  .clinic-info, .clinic-details, .head .muted, .header .muted {
    font-size: 11.5px;
    opacity: .82;
    margin-top: 2px;
  }
  .logo, .header-image, .footer-image {
    max-height: 62px;
    max-width: 190px;
    object-fit: contain;
    border-radius: 8px;
    background: #fff;
    padding: 4px;
  }
  .header-image, .footer-image { max-width: 100%; max-height: none; padding: 0; border-radius: 0; }
  .header-text { font-size: 13px; font-weight: 600; margin-top: 6px; }
  .doctor-info { font-size: 11.5px; opacity: .9; margin-top: 6px; }
  .invoice-number, .report-subtitle {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: .06em;
    text-transform: uppercase;
    opacity: .9;
    margin-top: 4px;
  }
  .invoice-info { font-size: 11.5px; opacity: .88; margin-top: 6px; }

  /* Document title bar under the header */
  .report-title {
    padding: 12px 26px;
    background: var(--surface);
    border-bottom: 1px solid var(--line);
    font-size: 14px;
    font-weight: 700;
    color: var(--accent);
    letter-spacing: .01em;
  }

  /* ---------- Body ---------- */
  .invoice-body, .report > .info-section, .container > .section:first-of-type { }
  .invoice-body { padding: 22px 26px; }
  .container, .report, .invoice, .prescription { padding-bottom: 0; }
  .container > *:not(.header):not(.footer):not(.header-image):not(.footer-image),
  .report > *:not(.header):not(.footer):not(.report-title),
  .invoice > *:not(.header):not(.footer),
  .prescription > *:not(.header):not(.footer) {
    padding-left: 26px;
    padding-right: 26px;
  }

  .section, .info-section, .patient-info, .info-box, .medications, .notes-section, .procedure-box {
    margin: 16px 0;
  }
  .section-title, .instructions-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .1em;
    color: var(--accent);
    padding-bottom: 6px;
    margin-bottom: 10px;
    border-bottom: 2px solid var(--line);
  }

  .info-section, .patient-info, .info-box {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 14px 16px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px 20px;
  }
  .info-row, .info-item {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: baseline;
    padding: 3px 0;
    border-bottom: 1px dotted #e6ebf1;
  }
  .info-row:last-child, .info-item:last-child { border-bottom: none; }
  .info-label {
    font-size: 11px;
    color: var(--muted);
    font-weight: 600;
    white-space: nowrap;
  }
  .info-value { font-size: 12.5px; font-weight: 600; color: var(--ink); text-align: right; }
  .muted { color: var(--muted); font-size: 11.5px; }
  .highlight { color: var(--accent); font-weight: 700; }
  .text-right { text-align: right; }

  /* ---------- Tables ---------- */
  table, .invoice-table {
    width: 100%;
    border-collapse: collapse;
    margin: 12px 0 4px;
    font-size: 12px;
  }
  thead th, .invoice-table thead th {
    background: var(--accent);
    color: #fff;
    text-align: left;
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: .07em;
    text-transform: uppercase;
    padding: 9px 10px;
  }
  thead th:first-child { border-top-left-radius: 8px; }
  thead th:last-child { border-top-right-radius: 8px; }
  tbody td { padding: 9px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
  tbody tr:nth-child(even) td { background: #fbfdff; }

  /* ---------- Summary cards ---------- */
  .summary-cards {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin: 16px 0;
  }
  .summary-card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-top: 3px solid var(--accent);
    border-radius: 10px;
    padding: 12px 14px;
  }
  .summary-card.commission { border-top-color: var(--lime); }
  .summary-card.treatments { border-top-color: #0ea5e9; }
  .summary-label {
    font-size: 10px; text-transform: uppercase; letter-spacing: .08em;
    color: var(--muted); font-weight: 700;
  }
  .summary-value { font-size: 21px; font-weight: 800; color: var(--accent); margin-top: 4px; letter-spacing: -.02em; }
  .summary-sub { font-size: 10.5px; color: var(--muted); }
  .calculation-note {
    background: #f1f7ff;
    border: 1px solid #dbeafe;
    border-left: 3px solid var(--accent);
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 11.5px;
    color: var(--slate);
    margin: 14px 0;
  }

  /* ---------- Totals ---------- */
  .totals, .totals-section {
    margin: 16px 0;
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 12px 16px;
    margin-left: auto;
    max-width: 380px;
  }
  .total-row, .totals-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 5px 0;
    font-size: 12.5px;
    color: var(--slate);
  }
  .total-row.discount, .totals-row.discount { color: var(--danger); }
  .total-row.grand-total, .totals-row.total, .totals-row.grand-total {
    margin-top: 8px;
    padding-top: 10px;
    border-top: 2px solid var(--accent);
    font-size: 15px;
    font-weight: 800;
    color: var(--accent);
  }
  .amt { font-weight: 700; }
  .amt.paid { color: var(--ok); }

  /* ---------- Medications / prescription ---------- */
  .medication-item {
    border: 1px solid var(--line);
    border-left: 3px solid var(--lime);
    border-radius: 10px;
    padding: 11px 14px;
    margin-bottom: 10px;
    background: #fff;
    page-break-inside: avoid;
  }
  .drug-name, .med-name { font-size: 13.5px; font-weight: 700; color: var(--accent); }
  .drug-details, .med-details {
    display: flex; flex-wrap: wrap; gap: 6px 18px;
    margin-top: 5px; font-size: 11.5px; color: var(--slate);
  }
  .instructions, .instructions-text {
    margin-top: 6px; font-size: 11.5px; color: var(--slate);
    background: var(--surface); border-radius: 6px; padding: 6px 9px;
  }
  .rx-symbol {
    font-size: 32px; font-weight: 800; color: var(--accent);
    line-height: 1; margin-bottom: 6px;
  }
  .notes-section {
    background: #fffbeb;
    border: 1px solid #fde68a;
    border-left: 3px solid #f59e0b;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 11.5px;
    color: #78350f;
  }

  /* ---------- Highlight boxes ---------- */
  .next-appointment, .procedure-box {
    background: linear-gradient(135deg, #f1f7ff, #f8fafc);
    border: 1px solid #dbeafe;
    border-left: 4px solid var(--accent);
    border-radius: 10px;
    padding: 14px 16px;
    margin: 16px 0;
  }
  .next-appointment-label {
    font-size: 10.5px; text-transform: uppercase; letter-spacing: .09em;
    font-weight: 700; color: var(--muted);
  }
  .next-appointment-date { font-size: 16px; font-weight: 800; color: var(--accent); margin-top: 3px; }

  /* ---------- Signature ---------- */
  .signature-line, .signature, .sign {
    display: flex; justify-content: flex-end; gap: 40px;
    margin: 30px 0 12px;
  }
  .signature-box, .sig-line {
    min-width: 210px;
    border-top: 1.5px solid var(--slate);
    padding-top: 6px;
    text-align: center;
    font-size: 11px;
    color: var(--muted);
  }

  /* ---------- Footer ---------- */
  .foot, .footer, .invoice-footer {
    margin-top: 18px;
    padding: 14px 26px 18px;
    background: var(--surface);
    border-top: 1px solid var(--line);
    text-align: center;
    font-size: 10.5px;
    color: var(--muted);
  }
  .footer p, .invoice-footer p { margin: 2px 0; }

  /* ---------- Badges ---------- */
  .badge {
    display: inline-block; padding: 2px 9px; border-radius: 999px;
    font-size: 10px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
  }
  .badge-paid { background: #dcfce7; color: #166534; }
  .badge-due { background: #ffe4e6; color: #9f1239; }
  .badge-pending { background: #fef3c7; color: #92400e; }

  /* ---------- Screen-only action bar ---------- */
  .action-buttons {
    max-width: 820px; margin: 18px auto 0;
    display: flex; gap: 10px; justify-content: center;
  }
  .action-btn {
    border: none; cursor: pointer;
    background: var(--accent); color: #fff;
    padding: 10px 20px; border-radius: 999px;
    font-size: 13px; font-weight: 700;
    box-shadow: 0 10px 24px -14px rgba(15,47,79,.8);
  }
  .action-btn.print-btn { background: var(--accent); }

  /* ---------- Responsive (mobile preview) ---------- */
  @media (max-width: 640px) {
    body { padding: 10px 8px; font-size: 12px; }
    .head, .header, .invoice-header { padding: 18px; }
    .invoice-body { padding: 16px; }
    .container > *, .report > *, .invoice > *, .prescription > * {
      padding-left: 16px !important; padding-right: 16px !important;
    }
    .info-section, .patient-info, .info-box { grid-template-columns: 1fr; }
    .summary-cards { grid-template-columns: 1fr; }
    .totals, .totals-section { max-width: none; }
    table, .invoice-table {
      font-size: 10px;
      table-layout: fixed;
      width: 100%;
    }
    thead th, tbody td { padding: 6px 4px; overflow-wrap: anywhere; }
    thead th { font-size: 8.5px; letter-spacing: .01em; }
    .summary-value { font-size: 19px; }
    .signature-line, .signature, .sign { justify-content: center; }
  }

  /* ---------- Print ---------- */
  @page { size: ${paper}; margin: ${margin}; }
  @media print {
    body { background: #fff; padding: 0; }
    .sheet, .container, .invoice-container, .report, .invoice, .prescription {
      max-width: none; border: none; border-radius: 0; box-shadow: none;
    }
    .action-buttons, .no-print { display: none !important; }
    .medication-item, tr, .summary-card, .section { page-break-inside: avoid; }
    thead { display: table-header-group; }
  }
  `;
}

export const printDocument = (html: string, title = 'Document') => {
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
  frame.contentWindow!.document.title = title;
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1500);
  }, 350);
};
