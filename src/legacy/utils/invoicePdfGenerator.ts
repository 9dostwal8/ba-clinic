// @ts-nocheck
import { documentCss } from './documentTheme';
interface InvoiceItem {
  description: string;
  treatment_date?: string;
  patient_name?: string;
  tooth_number?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

interface InvoiceData {
  invoice_number: string;
  clinic_name: string;
  clinic_email?: string;
  clinic_phone?: string;
  clinic_address?: string;
  billing_period_start: string;
  billing_period_end: string;
  billing_type: string;
  unit_count: number;
  unit_price: number;
  subtotal: number;
  discount_amount: number;
  discount_percentage: number;
  total_amount: number;
  currency: string;
  status: string;
  issued_date: string;
  due_date: string;
  paid_date?: string | null;
  notes?: string;
  items?: InvoiceItem[];
}

export const generateInvoicePDF = (invoice: InvoiceData): string => {
  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString()} ${invoice.currency}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoice_number}</title>
  <style>${documentCss()}  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="invoice-header">
      <h1>INVOICE</h1>
      <div class="invoice-number">${invoice.invoice_number}</div>
    </div>

    <div class="invoice-body">
      <div class="invoice-info">
        <div class="info-section">
          <h3>Bill To</h3>
          <p class="highlight">${invoice.clinic_name}</p>
          ${invoice.clinic_email ? `<p>${invoice.clinic_email}</p>` : ''}
          ${invoice.clinic_phone ? `<p>${invoice.clinic_phone}</p>` : ''}
          ${invoice.clinic_address ? `<p>${invoice.clinic_address}</p>` : ''}
        </div>

        <div class="info-section">
          <h3>Invoice Details</h3>
          <p><strong>Issue Date:</strong> ${formatDate(invoice.issued_date)}</p>
          <p><strong>Due Date:</strong> ${formatDate(invoice.due_date)}</p>
          ${invoice.paid_date ? `<p><strong>Paid Date:</strong> ${formatDate(invoice.paid_date)}</p>` : ''}
          <p>
            <span class="status-badge status-${invoice.status}">
              ${invoice.status.toUpperCase()}
            </span>
          </p>
        </div>
      </div>

      <div class="info-section">
        <h3>Billing Period</h3>
        <p>${formatDate(invoice.billing_period_start)} to ${formatDate(invoice.billing_period_end)}</p>
      </div>

      <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
        <h4 style="color: #1e40af; margin-bottom: 10px; font-size: 16px;">📊 Calculation Breakdown</h4>
        <div style="color: #1e3a8a; line-height: 1.8;">
          <p style="margin: 5px 0;"><strong>Billing Model:</strong> ${invoice.billing_type === 'per_treatment' ? 'Per Treatment' : 'Per Patient'}</p>
          <p style="margin: 5px 0;"><strong>Total Units:</strong> ${invoice.unit_count} ${invoice.billing_type === 'per_treatment' ? 'treatments' : 'patients'}</p>
          <p style="margin: 5px 0;"><strong>Rate per Unit:</strong> ${formatCurrency(invoice.unit_price)}</p>
          <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #bfdbfe;">
            <p style="margin: 5px 0;"><strong>Calculation:</strong></p>
            <p style="margin: 5px 0; padding-left: 20px;">
              ${invoice.unit_count} ${invoice.billing_type === 'per_treatment' ? 'treatments' : 'patients'} × ${formatCurrency(invoice.unit_price)} = ${formatCurrency(invoice.subtotal)}
            </p>
            ${invoice.discount_percentage > 0 ? `
            <p style="margin: 5px 0; padding-left: 20px; color: #059669;">
              Discount ${invoice.discount_percentage}%: ${formatCurrency(invoice.subtotal)} × ${invoice.discount_percentage}% = -${formatCurrency(invoice.discount_amount)}
            </p>
            <p style="margin: 5px 0; padding-left: 20px; font-weight: bold; color: #1e40af;">
              Final Amount: ${formatCurrency(invoice.subtotal)} - ${formatCurrency(invoice.discount_amount)} = ${formatCurrency(invoice.total_amount)}
            </p>
            ` : ''}
          </div>
        </div>
      </div>

      <table class="invoice-table">
        <thead>
          <tr>
            ${invoice.items && invoice.items.length > 0 ? `
            <th>Date</th>
            <th>Patient</th>
            <th>Description</th>
            <th class="text-right">Qty</th>
            <th class="text-right">Unit Price</th>
            <th class="text-right">Amount</th>
            ` : `
            <th>Description</th>
            <th class="text-right">Quantity</th>
            <th class="text-right">Unit Price</th>
            <th class="text-right">Amount</th>
            `}
          </tr>
        </thead>
        <tbody>
          ${invoice.items && invoice.items.length > 0 ?
            invoice.items.map(item => `
              <tr>
                <td>${item.treatment_date ? formatDate(item.treatment_date) : '-'}</td>
                <td>${item.patient_name || '-'}</td>
                <td>
                  ${item.description}
                </td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">${formatCurrency(item.unit_price)}</td>
                <td class="text-right"><strong>${formatCurrency(item.line_total)}</strong></td>
              </tr>
            `).join('')
          : `
            <tr>
              <td>
                <strong>${invoice.billing_type === 'per_treatment' ? 'Treatment Services' : 'Patient Registrations'}</strong>
                <br>
                <small style="color: #6b7280;">
                  ${invoice.billing_type === 'per_treatment' ? 'Billing based on number of treatments performed' : 'Billing based on number of patients registered'}
                </small>
              </td>
              <td class="text-right">${invoice.unit_count}</td>
              <td class="text-right">${formatCurrency(invoice.unit_price)}</td>
              <td class="text-right"><strong>${formatCurrency(invoice.subtotal)}</strong></td>
            </tr>
          `}
        </tbody>
      </table>

      <div class="totals-section">
        <div class="total-row subtotal">
          <span>Subtotal:</span>
          <span>${formatCurrency(invoice.subtotal)}</span>
        </div>

        ${invoice.discount_amount > 0 ? `
        <div class="total-row discount">
          <span>Discount (${invoice.discount_percentage}%):</span>
          <span>-${formatCurrency(invoice.discount_amount)}</span>
        </div>
        ` : ''}

        <div class="total-row grand-total">
          <span>Total Amount Due:</span>
          <span>${formatCurrency(invoice.total_amount)}</span>
        </div>
      </div>

      ${invoice.notes ? `
      <div class="notes-section">
        <h4>Notes:</h4>
        <p>${invoice.notes}</p>
      </div>
      ` : ''}
    </div>

    <div class="invoice-footer">
      <p><strong>Thank you for your business!</strong></p>
      <p>This is a computer-generated invoice and does not require a signature.</p>
      <p>For any inquiries, please contact our billing department.</p>
    </div>
  </div>
</body>
</html>`;

  return html;
};

export const downloadInvoicePDF = (invoice: InvoiceData) => {
  const html = generateInvoicePDF(invoice);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `invoice_${invoice.invoice_number}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const printInvoice = (invoice: InvoiceData) => {
  const html = generateInvoicePDF(invoice);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};
