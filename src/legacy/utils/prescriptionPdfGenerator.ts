// @ts-nocheck
import { documentCss } from './documentTheme';
interface PrescriptionItem {
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface Prescription {
  prescription_date: string;
  diagnosis: string;
  notes: string;
  patients: {
    first_name?: string;
    last_name?: string;
    full_name: string;
  };
  prescription_items: PrescriptionItem[];
}

interface Template {
  template_name: string;
  logo_url: string;
  header_image_url?: string;
  footer_image_url?: string;
  header_text: string;
  footer_text: string;
  show_clinic_info: boolean;
  show_doctor_info: boolean;
  color_scheme: string;
  font_family?: string;
  paper_size?: string;
}

interface ClinicInfo {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

interface DoctorInfo {
  full_name: string;
  email?: string;
}

const colorSchemes: Record<string, string> = {
  blue: '#0284c7',
  green: '#059669',
  red: '#dc2626',
  gray: '#4b5563'
};

export function generatePrescriptionPDF(
  prescription: Prescription,
  template: Template,
  clinicInfo: ClinicInfo,
  doctorInfo: DoctorInfo
): void {
  const accentColor = colorSchemes[template.color_scheme] || colorSchemes.blue;
  const fontFamily = template.font_family || 'Arial';
  const paperSize = template.paper_size || 'A4';

  const paperSizes: Record<string, string> = {
    A4: 'width: 210mm; min-height: 297mm;',
    Letter: 'width: 8.5in; min-height: 11in;'
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Prescription - ${prescription.patients.first_name} ${prescription.patients.last_name}</title>
        <style>${documentCss({ accent: accentColor, paper: paperSize, font: fontFamily })}        </style>
      </head>
      <body>
        <div class="container">
          ${template.header_image_url ? `<img src="${template.header_image_url}" alt="Header" class="header-image" />` : ''}

          <div class="header">
            ${template.logo_url ? `<img src="${template.logo_url}" alt="Logo" class="logo" />` : ''}
            ${template.header_text ? `<div class="header-text">${template.header_text}</div>` : ''}

            ${template.show_clinic_info ? `
              <div class="clinic-info">
                <strong>${clinicInfo.name}</strong><br/>
                ${clinicInfo.address ? `${clinicInfo.address}<br/>` : ''}
                ${clinicInfo.phone ? `Tel: ${clinicInfo.phone}` : ''} ${clinicInfo.phone && clinicInfo.email ? '|' : ''} ${clinicInfo.email ? `Email: ${clinicInfo.email}` : ''}
              </div>
            ` : ''}

            ${template.show_doctor_info ? `
              <div class="doctor-info">
                <strong>Dr. ${doctorInfo.full_name}</strong><br/>
                ${doctorInfo.email ? `${doctorInfo.email}` : ''}
              </div>
            ` : ''}
          </div>

          <div class="patient-info">
            <div class="info-item">
              <span class="info-label">Patient Name:</span>
              <span class="info-value">${prescription.patients.full_name || `${prescription.patients.first_name || ''} ${prescription.patients.last_name || ''}`}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Date:</span>
              <span class="info-value">${new Date(prescription.prescription_date).toLocaleDateString()}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Diagnosis:</span>
              <span class="info-value">${prescription.diagnosis}</span>
            </div>
          </div>

          <div class="section medications">
            <div class="section-title">Prescribed Medications</div>
            ${prescription.prescription_items.map((item, index) => `
              <div class="medication-item">
                <div class="drug-name">${index + 1}. ${item.drug_name}</div>
                <div class="drug-details">
                  <div class="drug-detail"><strong>Dosage:</strong> ${item.dosage}</div>
                  <div class="drug-detail"><strong>Frequency:</strong> ${item.frequency}</div>
                  <div class="drug-detail"><strong>Duration:</strong> ${item.duration}</div>
                </div>
                ${item.instructions ? `<div class="instructions"><strong>Instructions:</strong> ${item.instructions}</div>` : ''}
              </div>
            `).join('')}
          </div>

          ${prescription.notes ? `
            <div class="section">
              <div class="section-title">Additional Notes</div>
              <div class="notes-section">
                ${prescription.notes}
              </div>
            </div>
          ` : ''}

          <div class="signature-line">
            <div class="signature-box">
              Doctor's Signature
            </div>
          </div>

          ${template.footer_text ? `
            <div class="footer">
              ${template.footer_text}
            </div>
          ` : ''}

          ${template.footer_image_url ? `<img src="${template.footer_image_url}" alt="Footer" class="footer-image" />` : ''}
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  }
}
