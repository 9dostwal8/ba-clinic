// @ts-nocheck
import { documentCss } from './documentTheme';
export interface CommissionReportData {
  doctorName: string;
  doctorNameAr?: string;
  clinicName: string;
  clinicNameAr?: string;
  clinicLogo?: string;
  periodStart: string;
  periodEnd: string;
  items: {
    date: string;
    patientName: string;
    treatmentType: string;
    treatmentTypeAr?: string;
    toothNumber?: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    commissionRate: number;
    commissionType: string;
    commissionAmount: number;
    isPaid?: boolean;
  }[];
  totalRevenue: number;
  totalCommission: number;
  totalTreatments: number;
}

function generateCommissionReportHTML(data: CommissionReportData): string {
  const formattedPeriodStart = new Date(data.periodStart).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedPeriodEnd = new Date(data.periodEnd).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const itemsHTML = data.items.map((item, index) => `
    <tr${item.isPaid ? ' style="background-color: #eff6ff;"' : ''}>
      <td>${index + 1}</td>
      <td>${new Date(item.date).toLocaleDateString('en-US')}</td>
      <td>${item.patientName}</td>
      <td>${item.treatmentType}${item.treatmentTypeAr ? `<br><span style="color: #666; font-size: 12px;">${item.treatmentTypeAr}</span>` : ''}</td>
      <td>${item.toothNumber || '-'}</td>
      <td>${item.quantity}</td>
      <td>${item.unitPrice.toLocaleString()}</td>
      <td>${item.totalAmount.toLocaleString()}</td>
      <td>${item.commissionType === 'percentage' ? `${item.commissionRate}%` : `${item.commissionRate.toLocaleString()} IQD`}</td>
      <td style="font-weight: bold; color: #059669;">
        ${item.commissionAmount.toLocaleString()}
        ${item.isPaid ? '<br><span style="display: inline-block; background: #3b82f6; color: white; padding: 2px 8px; border-radius: 12px; font-size: 10px; margin-top: 4px;">✓ مدفوع / Paid</span>' : ''}
      </td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Commission Report - ${data.doctorName}</title>
      <style>${documentCss()}      </style>
    </head>
    <body>
      <div class="report">
        <div class="header">
          ${data.clinicLogo ? `<img src="${data.clinicLogo}" alt="Logo" class="logo">` : '<div class="logo"></div>'}
          <div class="clinic-info">
            <div class="clinic-name">${data.clinicName}</div>
            ${data.clinicNameAr ? `<div style="color: #666; font-size: 14px;">${data.clinicNameAr}</div>` : ''}
          </div>
        </div>

        <div class="report-title">تقرير العمولات / Commission Report</div>
        <div class="report-subtitle">
          ${formattedPeriodStart} - ${formattedPeriodEnd}
        </div>

        <div class="info-section">
          <div>
            <div class="info-row">
              <span class="info-label">اسم الطبيب / Doctor Name:</span>
              <span class="info-value">${data.doctorName}</span>
            </div>
            ${data.doctorNameAr ? `
            <div class="info-row">
              <span class="info-label">الاسم بالعربية:</span>
              <span class="info-value">${data.doctorNameAr}</span>
            </div>
            ` : ''}
          </div>
          <div>
            <div class="info-row">
              <span class="info-label">فترة التقرير / Report Period:</span>
              <span class="info-value">${formattedPeriodStart}</span>
            </div>
            <div class="info-row">
              <span class="info-label">إلى / To:</span>
              <span class="info-value">${formattedPeriodEnd}</span>
            </div>
          </div>
        </div>

        <div class="summary-cards">
          <div class="summary-card revenue">
            <div class="summary-label">إجمالي الإيرادات / Total Revenue</div>
            <div class="summary-value">${data.totalRevenue.toLocaleString()}</div>
            <div class="summary-sub">IQD</div>
          </div>
          <div class="summary-card commission">
            <div class="summary-label">إجمالي العمولات / Total Commission</div>
            <div class="summary-value">${data.totalCommission.toLocaleString()}</div>
            <div class="summary-sub">IQD</div>
          </div>
          <div class="summary-card treatments">
            <div class="summary-label">عدد العلاجات / Total Treatments</div>
            <div class="summary-value">${data.totalTreatments}</div>
            <div class="summary-sub">Treatments</div>
          </div>
        </div>

        <div class="calculation-note">
          <strong>ملاحظة حول الحساب / Calculation Note:</strong>
          يتم حساب العمولة لكل علاج على حدة بناءً على نوع العلاج ونسبة العمولة المحددة. العمولة = (الكمية × السعر) × نسبة العمولة
          <br>
          <em>Commission is calculated per treatment based on treatment type and assigned commission rate. Commission = (Quantity × Price) × Commission Rate</em>
        </div>

        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>التاريخ<br>Date</th>
              <th>اسم المريض<br>Patient</th>
              <th>نوع العلاج<br>Treatment Type</th>
              <th>السن<br>Tooth</th>
              <th>الكمية<br>Qty</th>
              <th>السعر<br>Price</th>
              <th>الإجمالي<br>Total</th>
              <th>نسبة العمولة<br>Rate</th>
              <th>العمولة<br>Commission</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>

        <div class="totals-section">
          <div class="totals-row">
            <span>عدد العلاجات / Total Treatments:</span>
            <span>${data.totalTreatments}</span>
          </div>
          <div class="totals-row">
            <span>إجمالي الإيرادات / Total Revenue:</span>
            <span>${data.totalRevenue.toLocaleString()} IQD</span>
          </div>
          <div class="totals-row grand-total">
            <span>إجمالي العمولات / Total Commission:</span>
            <span>${data.totalCommission.toLocaleString()} IQD</span>
          </div>
        </div>

        <div class="footer">
          <p>هذا التقرير تم إنشاؤه آلياً بتاريخ ${new Date().toLocaleString('ar-IQ')}</p>
          <p>This report was generated automatically on ${new Date().toLocaleString('en-US')}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function generateCommissionReportPDF(data: CommissionReportData): Promise<void> {
  const htmlContent = generateCommissionReportHTML(data);

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to download the commission report');
    return;
  }

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };
}
