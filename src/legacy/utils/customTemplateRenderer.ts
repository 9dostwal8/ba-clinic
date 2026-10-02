// @ts-nocheck
import { supabase } from '../lib/supabase';

interface TemplateData {
  [key: string]: any;
}

interface CustomTemplate {
  id: string;
  template_name?: string;
  custom_html: string;
  custom_css: string | null;
  use_custom_template: boolean;
  template_type: 'invoice' | 'prescription' | 'visit';
}

export async function getCustomTemplate(
  clinicId: string,
  templateType: 'invoice' | 'prescription' | 'visit',
  templateName?: string
): Promise<CustomTemplate | null> {
  try {
    console.log('Querying for template:', { clinicId, templateType });

    const query = supabase
      .from('document_templates')
      .select('id, template_name, custom_html, custom_css, use_custom_template, template_type')
      .eq('clinic_id', clinicId)
      .eq('template_type', templateType)
      .eq('use_custom_template', true);

    const { data, error } = await query.maybeSingle();

    if (error) {
      console.error('Database error fetching template:', error);
      throw error;
    }

    if (!data) {
      console.log('No custom template found for:', templateType);
      return null;
    }

    if (!data.custom_html || data.custom_html.trim() === '') {
      console.error('Template found but has no HTML content!');
      return null;
    }

    console.log('Template found:', data.template_name || data.id);
    console.log('HTML length:', data.custom_html.length);
    return data;
  } catch (error) {
    console.error('Error fetching custom template:', error);
    throw error;
  }
}

export function renderCustomTemplate(template: CustomTemplate, data: TemplateData): string {
  let html = template.custom_html;

  console.log('Rendering custom template');
  console.log('Has custom CSS:', !!template.custom_css);
  console.log('HTML length:', html.length);
  console.log('HTML preview:', html.substring(0, 200));

  html = html.replace(/{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g, (match, condition, content) => {
    const value = data[condition];
    if (value && value !== '' && value !== 'false' && value !== '0') {
      return content;
    }
    return '';
  });

  html = html.replace(/{{#each\s+(\w+)}}([\s\S]*?){{\/each}}/g, (match, arrayName, itemTemplate) => {
    const arrayData = data[arrayName];

    let items: any[] = [];
    if (typeof arrayData === 'string') {
      try {
        items = JSON.parse(arrayData);
      } catch (e) {
        console.error('Failed to parse array:', arrayData);
        return '';
      }
    } else if (Array.isArray(arrayData)) {
      items = arrayData;
    }

    if (!items || items.length === 0) return '';

    return items.map((item) => {
      let itemHtml = itemTemplate;
      Object.entries(item).forEach(([key, value]) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        itemHtml = itemHtml.replace(regex, String(value || ''));
      });
      return itemHtml;
    }).join('');
  });

  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'string' || typeof value === 'number') {
      const regex = new RegExp(`{{${key}}}`, 'g');
      html = html.replace(regex, String(value));
    }
  });

  html = html.replace(/{{[^}]+}}/g, '');

  if (!html.includes('<!DOCTYPE html>')) {
    html = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>Document</title>\n</head>\n<body>\n${html}\n</body>\n</html>`;
  }

  if (template.custom_css) {
    const cssTag = `<style>${template.custom_css}</style>`;
    if (html.includes('</head>')) {
      html = html.replace('</head>', `${cssTag}\n</head>`);
    } else {
      html = html.replace('<body>', `<style>${template.custom_css}</style>\n<body>`);
    }
  }

  return html;
}

export async function generateCustomInvoicePDF(
  clinicId: string,
  invoiceData: any,
  templateName?: string
): Promise<void> {
  try {
    console.log('=== Starting Custom Invoice PDF Generation ===');
    console.log('Clinic ID:', clinicId);

    const template = await getCustomTemplate(clinicId, 'invoice', templateName);

    if (!template) {
      console.error('No custom invoice template found!');
      throw new Error('Custom template not found');
    }

    console.log('✓ Template loaded successfully');

    const data = {
      invoiceNumber: invoiceData.invoiceNumber,
      invoiceDate: new Date(invoiceData.invoiceDate).toLocaleDateString('ar-IQ'),
      clinicName: invoiceData.clinicName,
      clinicNameAr: invoiceData.clinicNameAr || '',
      clinicAddress: invoiceData.clinicAddress || '',
      clinicPhone: invoiceData.clinicPhone || '',
      clinicLogo: invoiceData.clinicLogo || '',
      patientName: invoiceData.patientName,
      patientNameAr: invoiceData.patientNameAr || '',
      patientPhone: invoiceData.patientPhone || '',
      items: invoiceData.items || [],
      itemsJson: JSON.stringify(invoiceData.items || []),
      subtotal: invoiceData.subtotal.toLocaleString(),
      tax: invoiceData.tax.toLocaleString(),
      discount: invoiceData.discount.toLocaleString(),
      total: invoiceData.total.toLocaleString(),
      paidAmount: invoiceData.paidAmount.toLocaleString(),
      remainingAmount: invoiceData.remainingAmount.toLocaleString(),
    };

    const renderedHtml = renderCustomTemplate(template, data);

    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      alert('Please allow popups to generate PDF. Check your browser settings.');
      return;
    }

    printWindow.document.write(renderedHtml);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };

    if (!printWindow.onload) {
      setTimeout(() => {
        printWindow.print();
      }, 1000);
    }
  } catch (error) {
    console.error('Error generating custom invoice PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    alert(`Failed to generate invoice. Error: ${errorMessage}`);
    throw error;
  }
}

export async function generateCustomPrescriptionPDF(
  clinicId: string,
  prescriptionData: any,
  templateName?: string
): Promise<void> {
  try {
    console.log('=== Starting Custom Prescription PDF Generation ===');
    console.log('Clinic ID:', clinicId);

    const template = await getCustomTemplate(clinicId, 'prescription', templateName);

    if (!template) {
      console.error('No custom prescription template found for clinic:', clinicId);
      throw new Error('Custom template not found');
    }

    console.log('✓ Template loaded successfully:', template.template_name || template.id);

    const data = {
      clinicName: prescriptionData.clinicName,
      clinicNameAr: prescriptionData.clinicNameAr || '',
      clinicLogo: prescriptionData.clinicLogo || '',
      clinicAddress: prescriptionData.clinicAddress || '',
      clinicPhone: prescriptionData.clinicPhone || '',
      doctorName: prescriptionData.doctorName,
      doctorNameAr: prescriptionData.doctorNameAr || '',
      doctorSpecialization: prescriptionData.doctorSpecialization || '',
      patientName: prescriptionData.patientName,
      patientNameAr: prescriptionData.patientNameAr || '',
      patientAge: prescriptionData.patientAge || '',
      patientGender: prescriptionData.patientGender || '',
      prescriptionDate: new Date(prescriptionData.prescriptionDate).toLocaleDateString('ar-IQ'),
      medications: prescriptionData.medications || [],
      medicationsJson: JSON.stringify(prescriptionData.medications || []),
      instructions: prescriptionData.instructions || '',
      instructionsAr: prescriptionData.instructionsAr || '',
    };

    const renderedHtml = renderCustomTemplate(template, data);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to generate PDF. Check your browser settings.');
      return;
    }

    printWindow.document.write(renderedHtml);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };

    if (!printWindow.onload) {
      setTimeout(() => {
        printWindow.print();
      }, 1000);
    }
  } catch (error) {
    console.error('Error generating custom prescription PDF:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    alert(`Failed to generate prescription. Error: ${errorMessage}`);
    throw error;
  }
}

export function sanitizeHtml(html: string): string {
  const tempDiv = document.createElement('div');
  tempDiv.textContent = html;
  return tempDiv.innerHTML;
}

export function validateTemplate(html: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!html || html.trim().length === 0) {
    errors.push('Template cannot be empty');
  }

  if (!html.includes('<!DOCTYPE html>') && !html.includes('<html')) {
    errors.push('Template must be valid HTML');
  }

  const scriptTags = html.match(/<script[^>]*>[\s\S]*?<\/script>/gi);
  if (scriptTags) {
    scriptTags.forEach((script) => {
      if (script.includes('eval(') || script.includes('Function(')) {
        errors.push('Template contains potentially unsafe JavaScript');
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function getTemplatePreviewData(templateType: 'invoice' | 'prescription'): TemplateData {
  if (templateType === 'invoice') {
    return {
      invoiceNumber: 'INV-001',
      invoiceDate: new Date().toLocaleDateString('ar-IQ'),
      clinicName: 'عيادة الأسنان الحديثة',
      clinicNameAr: 'Modern Dental Clinic',
      clinicAddress: 'شارع الطبي 123، بغداد',
      clinicPhone: '+964 770 123 4567',
      clinicLogo: '',
      patientName: 'أحمد علي محمد',
      patientNameAr: 'Ahmed Ali Mohammed',
      patientPhone: '+964 770 999 8888',
      itemsJson: JSON.stringify([
        { description: 'تنظيف الأسنان', quantity: 1, unitPrice: 50000, total: 50000 },
        { description: 'حشوة أسنان', quantity: 2, unitPrice: 75000, total: 150000 },
        { description: 'فحص شامل', quantity: 1, unitPrice: 30000, total: 30000 }
      ]),
      subtotal: '230,000',
      tax: '0',
      discount: '10,000',
      total: '220,000',
      paidAmount: '220,000',
      remainingAmount: '0',
    };
  } else {
    return {
      clinicName: 'المركز الطبي الحديث',
      clinicNameAr: 'Modern Medical Center',
      clinicLogo: '',
      clinicAddress: 'شارع الطبي 123، بغداد',
      clinicPhone: '+964 770 123 4567',
      doctorName: 'أحمد حسن الطائي',
      doctorNameAr: 'Dr. Ahmed Hassan Al-Taie',
      doctorSpecialization: 'طب العائلة',
      patientName: 'سارة محمد علي',
      patientNameAr: 'Sara Mohammed Ali',
      patientAge: '35',
      patientGender: 'female',
      prescriptionDate: new Date().toLocaleDateString('ar-IQ'),
      medicationsJson: JSON.stringify([
        {
          name: 'Amoxicillin 500mg',
          nameAr: 'أموكسيسيلين 500 ملغ',
          dosage: '500mg',
          frequency: '3 مرات يومياً',
          duration: '7 أيام',
          instructions: 'تناول بعد الطعام مع كوب ماء كامل'
        },
        {
          name: 'Paracetamol 500mg',
          nameAr: 'باراسيتامول 500 ملغ',
          dosage: '500mg',
          frequency: 'عند الحاجة (كل 6 ساعات)',
          duration: '5 أيام',
          instructions: 'لا تتجاوز 4 جرعات يومياً'
        }
      ]),
      instructions: 'شرب الكثير من الماء، الراحة التامة، تجنب التعرض للبرد',
      instructionsAr: 'Drink plenty of water, complete rest, avoid cold exposure',
    };
  }
}
