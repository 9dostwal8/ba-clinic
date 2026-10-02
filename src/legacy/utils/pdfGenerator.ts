// @ts-nocheck
import { documentCss } from './documentTheme';
export interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  clinicName: string;
  clinicNameAr?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicLogo?: string;
  patientName: string;
  patientNameAr?: string;
  patientPhone?: string;
  doctorName?: string;
  doctorNameAr?: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paidAmount: number;
  remainingAmount: number;
}

export interface PrescriptionData {
  clinicName: string;
  clinicNameAr?: string;
  clinicLogo?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  doctorName: string;
  doctorNameAr?: string;
  doctorSpecialization?: string;
  patientName: string;
  patientNameAr?: string;
  patientAge?: number;
  patientGender?: string;
  prescriptionDate: string;
  medications: {
    name: string;
    nameAr?: string;
    dosage: string;
    frequency: string;
    duration: string;
    instructions?: string;
  }[];
  instructions?: string;
  instructionsAr?: string;
}

function generateInvoiceHTML(data: InvoiceData): string {
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice ${data.invoiceNumber}</title>
      <style>${documentCss({ margin: "20mm" })}      </style>
    </head>
    <body>
      <div class="invoice">
        <div class="header">
          ${data.clinicLogo ? `<img src="${data.clinicLogo}" alt="Logo" class="logo">` : '<div class="logo"></div>'}
          <div class="clinic-info">
            <div class="clinic-name">${data.clinicName}</div>
            ${data.clinicNameAr ? `<div style="color: #666; font-size: 14px; margin-bottom: 8px;">${data.clinicNameAr}</div>` : ''}
            <div class="clinic-details">
              ${data.clinicAddress ? `<div>${data.clinicAddress}</div>` : ''}
              ${data.clinicPhone ? `<div>هاتف: ${data.clinicPhone}</div>` : ''}
            </div>
          </div>
        </div>

        <div class="invoice-title">فاتورة / INVOICE</div>

        <div class="info-section">
          <div class="info-box">
            <h3>معلومات الفاتورة</h3>
            <p>
              <strong>رقم الفاتورة:</strong> ${data.invoiceNumber}<br>
              <strong>التاريخ:</strong> ${new Date(data.invoiceDate).toLocaleDateString('ar-IQ')}
            </p>
          </div>
          <div class="info-box">
            <h3>معلومات المريض</h3>
            <p>
              <strong>الاسم:</strong> ${data.patientName}<br>
              ${data.patientNameAr ? `<strong>الاسم بالعربي:</strong> ${data.patientNameAr}<br>` : ''}
              ${data.patientPhone ? `<strong>الهاتف:</strong> ${data.patientPhone}` : ''}
            </p>
          </div>
          ${data.doctorName ? `
          <div class="info-box">
            <h3>الطبيب المعالج</h3>
            <p>
              <strong>الاسم:</strong> د. ${data.doctorName}<br>
              ${data.doctorNameAr ? `<strong>Name:</strong> Dr. ${data.doctorNameAr}` : ''}
            </p>
          </div>
          ` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th>المجموع</th>
              <th>السعر</th>
              <th>الكمية</th>
              <th>الوصف</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.map(item => `
              <tr>
                <td>${item.total.toLocaleString()} IQD</td>
                <td>${item.unitPrice.toLocaleString()} IQD</td>
                <td>${item.quantity}</td>
                <td>${item.description}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row subtotal">
            <span>المجموع الفرعي:</span>
            <span>${data.subtotal.toLocaleString()} IQD</span>
          </div>
          ${data.tax > 0 ? `
            <div class="totals-row">
              <span>الضريبة:</span>
              <span>${data.tax.toLocaleString()} IQD</span>
            </div>
          ` : ''}
          ${data.discount > 0 ? `
            <div class="totals-row">
              <span>الخصم:</span>
              <span>-${data.discount.toLocaleString()} IQD</span>
            </div>
          ` : ''}
          <div class="totals-row total">
            <span>المجموع الكلي:</span>
            <span>${data.total.toLocaleString()} IQD</span>
          </div>
          <div class="totals-row" style="background: #dcfce7; padding: 12px; margin-top: 8px;">
            <span>المدفوع:</span>
            <span>${data.paidAmount.toLocaleString()} IQD</span>
          </div>
          ${data.remainingAmount > 0 ? `
            <div class="totals-row" style="background: #fee2e2; padding: 12px;">
              <span>المتبقي:</span>
              <span>${data.remainingAmount.toLocaleString()} IQD</span>
            </div>
          ` : ''}
        </div>

        <div class="footer">
          <p>شكراً لزيارتكم - Thank you for your visit</p>
          <p style="margin-top: 10px;">تم إنشاء هذه الفاتورة بواسطة نظام إدارة العيادات</p>
        </div>
      </div>
      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() {
            window.close();
          }, 100);
        };
      </script>
    </body>
    </html>
  `;
}

export function generateInvoicePDF(data: InvoiceData): void {
  try {
    const html = generateInvoiceHTML(data);

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const printWindow = window.open(url, '_blank');

    if (!printWindow) {
      alert('Please allow popups to download the invoice. Check your browser popup blocker settings.');
      URL.revokeObjectURL(url);
      return;
    }

    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    alert('Failed to generate invoice. Please try again.');
  }
}

export function generatePrescriptionPDF(data: PrescriptionData): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Prescription - ${data.patientName}</title>
      <style>${documentCss({ margin: "15mm" })}      </style>
    </head>
    <body>
      <div class="action-buttons">
        <button onclick="window.print()" class="action-btn print-btn">
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z"/>
          </svg>
          Print
        </button>
      </div>

      <div class="prescription">
        <div class="header">
          ${data.clinicLogo ? `<img src="${data.clinicLogo}" alt="Logo" class="logo">` : '<div></div>'}
          <div class="clinic-info">
            <div class="clinic-name">${data.clinicName}</div>
            ${data.clinicNameAr ? `<div style="color: #666; font-size: 14px;">${data.clinicNameAr}</div>` : ''}
            <div style="color: #666; font-size: 13px; margin-top: 5px;">
              ${data.clinicAddress ? `${data.clinicAddress} • ` : ''}
              ${data.clinicPhone ? `هاتف: ${data.clinicPhone}` : ''}
            </div>
          </div>
        </div>

        <div class="rx-symbol">℞</div>

        <div class="info-section">
          <div class="info-row">
            <div><span class="info-label">اسم الطبيب:</span> د. ${data.doctorName}</div>
            <div><span class="info-label">التاريخ:</span> ${new Date(data.prescriptionDate).toLocaleDateString('ar-IQ')}</div>
          </div>
          ${data.doctorNameAr || data.doctorSpecialization ? `
            <div class="info-row">
              ${data.doctorNameAr ? `<div><span class="info-label">Doctor:</span> Dr. ${data.doctorNameAr}</div>` : '<div></div>'}
              ${data.doctorSpecialization ? `<div><span class="info-label">التخصص:</span> ${data.doctorSpecialization}</div>` : '<div></div>'}
            </div>
          ` : ''}
          <div class="info-row" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
            <div><span class="info-label">اسم المريض:</span> ${data.patientName}</div>
            ${data.patientAge ? `<div><span class="info-label">العمر:</span> ${data.patientAge} سنة</div>` : '<div></div>'}
          </div>
          ${data.patientNameAr || data.patientGender ? `
            <div class="info-row">
              ${data.patientNameAr ? `<div><span class="info-label">Patient Name:</span> ${data.patientNameAr}</div>` : '<div></div>'}
              ${data.patientGender ? `<div><span class="info-label">الجنس:</span> ${data.patientGender === 'male' ? 'ذكر' : 'أنثى'}</div>` : '<div></div>'}
            </div>
          ` : ''}
        </div>

        <div class="medications">
          <h3 style="color: #0284c7; margin-bottom: 15px; font-size: 18px;">الأدوية الموصوفة:</h3>
          ${data.medications.map((med, index) => `
            <div class="medication-item">
              <div class="med-name">${index + 1}. ${med.name}</div>
              ${med.nameAr ? `<div style="color: #666; font-size: 14px; margin-bottom: 8px;">${med.nameAr}</div>` : ''}
              <div class="med-details">
                <div><strong>الجرعة:</strong> ${med.dosage}</div>
                <div><strong>التكرار:</strong> ${med.frequency}</div>
                <div><strong>المدة:</strong> ${med.duration}</div>
                ${med.instructions ? `<div style="margin-top: 5px; color: #0284c7;"><strong>ملاحظات:</strong> ${med.instructions}</div>` : ''}
              </div>
            </div>
          `).join('')}
        </div>

        ${data.instructions || data.instructionsAr ? `
          <div class="instructions">
            <div class="instructions-title">تعليمات عامة:</div>
            <div class="instructions-text">
              ${data.instructions || ''}
              ${data.instructionsAr ? `<br>${data.instructionsAr}` : ''}
            </div>
          </div>
        ` : ''}

        <div class="signature">
          <div class="sig-line">
            <div style="font-weight: bold;">د. ${data.doctorName}</div>
            <div style="font-size: 12px; color: #666; margin-top: 5px;">توقيع الطبيب</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}
