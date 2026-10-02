// @ts-nocheck
import { documentCss } from './documentTheme';
import { getCustomTemplate, renderCustomTemplate } from './customTemplateRenderer';

export interface VisitAppointmentData {
  clinicId?: string;
  patientName: string;
  patientNameAr?: string;
  patientPhone: string;
  patientAge?: number;
  doctorName: string;
  doctorNameAr?: string;
  clinicName: string;
  clinicNameAr?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  clinicEmail?: string;
  clinicWebsite?: string;
  clinicLogo?: string;
  appointmentDate: string;
  appointmentTime: string;
  treatmentCategory?: string;
  treatmentPlan?: string;
  visitNumber?: number;
  totalVisits?: number;
  procedurePerformed?: string;
  teethTreated?: string;
  diagnosis?: string;
  visitCost?: number;
  paymentReceived?: number;
  amountDue?: number;
  treatmentProgress?: number;
  notes?: string;
  nextVisitDate?: string;
  visitDate?: string;
}

export async function generateVisitAppointmentPDF(data: VisitAppointmentData): Promise<void> {
  console.log('=== generateVisitAppointmentPDF called ===');
  console.log('Clinic ID:', data.clinicId);
  console.log('Patient:', data.patientName);

  let doc = '';

  // Try to fetch custom template if clinicId is provided
  if (data.clinicId) {
    console.log('Clinic ID provided, fetching custom template...');
    try {
      const customTemplate = await getCustomTemplate(data.clinicId, 'visit');
      console.log('Template fetched:', customTemplate ? 'YES' : 'NO');

      if (customTemplate && customTemplate.use_custom_template && customTemplate.custom_html) {
        console.log('✅ Using custom visit template!');
        console.log('Template name:', customTemplate.template_name);
        console.log('HTML length:', customTemplate.custom_html.length);

        // Prepare data with all possible variables
        const templateData = {
          // Clinic info
          clinicName: data.clinicName || '',
          clinicNameAr: data.clinicNameAr || '',
          clinicAddress: data.clinicAddress || '',
          clinicPhone: data.clinicPhone || '',
          clinicEmail: data.clinicEmail || '',
          clinicWebsite: data.clinicWebsite || '',
          clinicLogo: data.clinicLogo || '',

          // Patient info
          patientName: data.patientName || '',
          patientNameAr: data.patientNameAr || '',
          patientPhone: data.patientPhone || '',
          patientAge: data.patientAge || '',

          // Doctor info
          doctorName: data.doctorName || '',
          doctorNameAr: data.doctorNameAr || '',

          // Visit info
          visitDate: data.visitDate || data.appointmentDate || '',
          appointmentDate: data.appointmentDate || '',
          appointmentTime: data.appointmentTime || '',
          visitTime: data.appointmentTime || '',
          visitNumber: data.visitNumber || '',
          totalVisits: data.totalVisits || '',

          // Treatment info
          treatmentCategory: data.treatmentCategory || '',
          treatmentPlan: data.treatmentPlan || '',
          procedurePerformed: data.procedurePerformed || '',
          teethTreated: data.teethTreated || '',
          diagnosis: data.diagnosis || '',

          // Financial info
          visitCost: data.visitCost !== undefined ? Number(data.visitCost).toFixed(2) : '',
          paymentReceived: data.paymentReceived !== undefined ? Number(data.paymentReceived).toFixed(2) : '',
          amountDue: data.amountDue !== undefined ? Number(data.amountDue).toFixed(2) : '',

          // Progress
          treatmentProgress: data.treatmentProgress || '',

          // Next visit
          nextVisitDate: data.nextVisitDate || '',

          // Notes
          notes: data.notes || '',

          // System
          currentDate: new Date().toLocaleDateString(),
          currentTime: new Date().toLocaleTimeString()
        };

        doc = renderCustomTemplate(customTemplate, templateData);

        // Add print script if not present
        if (!doc.includes('window.print()')) {
          doc = doc.replace('</body>', `
  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>`);
        }

        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(doc);
          printWindow.document.close();
        }
        return;
      } else {
        console.log('❌ Custom template not used:');
        console.log('  - Template exists:', !!customTemplate);
        console.log('  - use_custom_template:', customTemplate?.use_custom_template);
        console.log('  - Has HTML:', !!customTemplate?.custom_html);
      }
    } catch (error) {
      console.error('❌ Error loading custom template, falling back to default:', error);
    }
  } else {
    console.log('⚠️ No clinic ID provided, using default template');
  }

  // Fall back to default template
  if (!doc) {
    console.log('📄 Using default visit template');
    doc = generateDefaultVisitTemplate(data);
  }

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(doc);
    printWindow.document.close();
  }
}

function generateDefaultVisitTemplate(data: VisitAppointmentData): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Visit Details</title>
  <style>${documentCss()}  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="clinic-name">${data.clinicName}</div>
      ${data.clinicNameAr ? `<div class="clinic-name" style="font-size: 22px;">${data.clinicNameAr}</div>` : ''}
      ${data.clinicAddress ? `<div class="clinic-info">${data.clinicAddress}</div>` : ''}
      ${data.clinicPhone ? `<div class="clinic-info">📞 ${data.clinicPhone}</div>` : ''}
    </div>

    <!-- Section 1: Patient Information -->
    <div class="section">
      <div class="section-title">
        <span>👤</span>
        <span>Patient Information | معلومات المريض</span>
      </div>
      <div class="info-row">
        <div class="info-label">Name | الاسم:</div>
        <div class="info-value">
          ${data.patientName}
          ${data.patientNameAr ? `<br>${data.patientNameAr}` : ''}
        </div>
      </div>
      <div class="info-row">
        <div class="info-label">Phone | الهاتف:</div>
        <div class="info-value">${data.patientPhone}</div>
      </div>
      ${data.patientAge ? `
      <div class="info-row">
        <div class="info-label">Age | العمر:</div>
        <div class="info-value">${data.patientAge} years | سنة</div>
      </div>
      ` : ''}
      <div class="info-row">
        <div class="info-label">Doctor | الطبيب:</div>
        <div class="info-value">
          ${data.doctorName}
          ${data.doctorNameAr ? `<br>${data.doctorNameAr}` : ''}
        </div>
      </div>
      <div class="info-row">
        <div class="info-label">Visit Date | تاريخ الزيارة:</div>
        <div class="info-value">${new Date(data.appointmentDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>
    </div>

    <!-- Section 2: Current Visit Information -->
    <div class="section">
      <div class="section-title">
        <span>🦷</span>
        <span>Current Visit Details | تفاصيل الزيارة الحالية</span>
      </div>

      ${data.treatmentCategory ? `
      <div class="info-row">
        <div class="info-label">Treatment | العلاج:</div>
        <div class="info-value">${data.treatmentCategory}</div>
      </div>
      ` : ''}

      ${data.visitNumber ? `
      <div class="info-row">
        <div class="info-label">Visit Number | رقم الزيارة:</div>
        <div class="info-value">Visit ${data.visitNumber} | الزيارة ${data.visitNumber}</div>
      </div>
      ` : ''}

      ${data.visitCost !== undefined && data.visitCost !== null ? `
      <div class="info-row">
        <div class="info-label">Visit Cost | تكلفة الزيارة:</div>
        <div class="info-value">$${Number(data.visitCost).toFixed(2)}</div>
      </div>
      <div class="info-row">
        <div class="info-label">Amount Paid | المدفوع:</div>
        <div class="info-value">$${Number(data.paymentReceived || 0).toFixed(2)}</div>
      </div>
      ` : ''}

      ${data.procedurePerformed ? `
      <div style="margin-top: 20px;">
        <div class="info-label" style="margin-bottom: 10px;">What The Doctor Did | ما قام به الطبيب:</div>
        <div class="procedure-box">${data.procedurePerformed}</div>
      </div>
      ` : ''}

      ${data.notes ? `
      <div style="margin-top: 20px;">
        <div class="info-label" style="margin-bottom: 10px;">Additional Notes | ملاحظات إضافية:</div>
        <div class="procedure-box">${data.notes}</div>
      </div>
      ` : ''}
    </div>

    <!-- Section 3: Next Appointment -->
    ${data.nextVisitDate ? `
    <div class="section" style="background: transparent; border: none; padding: 0;">
      <div class="next-appointment">
        <div class="next-appointment-label">Next Appointment | الموعد القادم</div>
        <div class="next-appointment-date">${new Date(data.nextVisitDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        <div style="margin-top: 10px; font-size: 18px;">${new Date(data.nextVisitDate).toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </div>
    </div>
    ` : `
    <div class="section" style="background: #fef3c7; border-left-color: #f59e0b;">
      <div class="section-title" style="color: #92400e;">
        <span>📅</span>
        <span>Next Appointment | الموعد القادم</span>
      </div>
      <div class="info-value" style="text-align: center; font-size: 18px; color: #78350f;">
        No upcoming appointment scheduled yet<br>
        لم يتم تحديد موعد قادم بعد
      </div>
    </div>
    `}

    <div class="footer">
      <div style="margin-bottom: 5px;">Printed on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</div>
      <div>تم الطباعة في ${new Date().toLocaleDateString('ar-EG')} الساعة ${new Date().toLocaleTimeString('ar-EG')}</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.print();
    };
  </script>
</body>
</html>`;
}
