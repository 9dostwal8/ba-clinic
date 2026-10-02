// @ts-nocheck
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Code, Eye, Save, Copy, Download, FileText, Sparkles, Palette, Layout } from 'lucide-react';

interface TemplateVariable {
  name: string;
  description: string;
  example: string;
}

interface LibraryTemplate {
  id: string;
  template_name: string;
  template_name_ar: string;
  template_type: 'invoice' | 'prescription' | 'visit';
  category: string;
  description: string;
  description_ar: string;
  thumbnail_url?: string;
  html_template: string;
  css_template: string;
  template_variables: any;
  preview_data: any;
}

interface CustomTemplateDesignerProps {
  clinicId: string;
  onClose?: () => void;
}

export default function CustomTemplateDesigner({ clinicId, onClose }: CustomTemplateDesignerProps) {
  const [templateType, setTemplateType] = useState<'invoice' | 'prescription' | 'visit'>('invoice');
  const [htmlCode, setHtmlCode] = useState('');
  const [cssCode, setCssCode] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [templateName, setTemplateName] = useState('');
  const [saving, setSaving] = useState(false);
  const [libraryTemplates, setLibraryTemplates] = useState<LibraryTemplate[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  const [selectedLibraryTemplate, setSelectedLibraryTemplate] = useState<string | null>(null);

  const previewRef = useRef<HTMLIFrameElement>(null);

  const invoiceVariables: TemplateVariable[] = [
    { name: '{{invoiceNumber}}', description: 'Invoice number', example: 'INV-001' },
    { name: '{{invoiceDate}}', description: 'Invoice date', example: '2025-10-20' },
    { name: '{{clinicName}}', description: 'Clinic name', example: 'Modern Dental Clinic' },
    { name: '{{clinicAddress}}', description: 'Clinic address', example: '123 Medical St' },
    { name: '{{clinicPhone}}', description: 'Clinic phone', example: '+964 770 123 4567' },
    { name: '{{clinicLogo}}', description: 'Clinic logo URL', example: 'https://...' },
    { name: '{{patientName}}', description: 'Patient full name', example: 'Ahmed Ali' },
    { name: '{{patientPhone}}', description: 'Patient phone', example: '+964 770 999 8888' },
    { name: '{{items}}', description: 'Invoice items array', example: '[{description, quantity, unitPrice, total}]' },
    { name: '{{subtotal}}', description: 'Subtotal amount', example: '50000' },
    { name: '{{tax}}', description: 'Tax amount', example: '0' },
    { name: '{{discount}}', description: 'Discount amount', example: '5000' },
    { name: '{{total}}', description: 'Total amount', example: '45000' },
    { name: '{{paidAmount}}', description: 'Paid amount', example: '45000' },
    { name: '{{remainingAmount}}', description: 'Remaining amount', example: '0' },
  ];

  const prescriptionVariables: TemplateVariable[] = [
    { name: '{{clinicName}}', description: 'Clinic name', example: 'Modern Medical Center' },
    { name: '{{clinicAddress}}', description: 'Clinic address', example: '123 Medical St' },
    { name: '{{clinicPhone}}', description: 'Clinic phone', example: '+964 770 123 4567' },
    { name: '{{clinicLogo}}', description: 'Clinic logo URL', example: 'https://...' },
    { name: '{{doctorName}}', description: 'Doctor name', example: 'Dr. Ahmed Hassan' },
    { name: '{{doctorSpecialization}}', description: 'Doctor specialization', example: 'Family Medicine' },
    { name: '{{patientName}}', description: 'Patient name', example: 'Sara Mohammed' },
    { name: '{{patientAge}}', description: 'Patient age', example: '35' },
    { name: '{{patientGender}}', description: 'Patient gender', example: 'male/female' },
    { name: '{{prescriptionDate}}', description: 'Prescription date', example: 'October 20, 2025' },
    { name: '{{medications}}', description: 'Medications array', example: '[{name, dosage, frequency, duration, instructions}]' },
    { name: '{{instructions}}', description: 'General instructions', example: 'Take with food' },
  ];

  const visitVariables: TemplateVariable[] = [
    { name: '{{clinicName}}', description: 'Clinic name', example: 'Smile Dental Clinic' },
    { name: '{{clinicAddress}}', description: 'Clinic address', example: '123 Main St' },
    { name: '{{clinicPhone}}', description: 'Clinic phone', example: '+1-555-1234' },
    { name: '{{patientName}}', description: 'Patient name', example: 'Ahmed Ali' },
    { name: '{{patientAge}}', description: 'Patient age', example: '35' },
    { name: '{{doctorName}}', description: 'Doctor name', example: 'Dr. Mohammed' },
    { name: '{{visitDate}}', description: 'Visit date', example: 'Oct 24, 2024' },
    { name: '{{visitTime}}', description: 'Visit time', example: '10:30 AM' },
    { name: '{{visitNumber}}', description: 'Visit number', example: '2' },
    { name: '{{totalVisits}}', description: 'Total visits', example: '4' },
    { name: '{{treatmentCategory}}', description: 'Treatment type', example: 'Root Canal' },
    { name: '{{treatmentPlan}}', description: 'Treatment plan name', example: 'Molar Root Canal' },
    { name: '{{procedurePerformed}}', description: 'Procedure details', example: 'Completed root canal...' },
    { name: '{{teethTreated}}', description: 'Teeth numbers', example: '#14, #15' },
    { name: '{{diagnosis}}', description: 'Diagnosis', example: 'Pulpitis' },
    { name: '{{visitCost}}', description: 'Visit cost', example: '500.00' },
    { name: '{{paymentReceived}}', description: 'Payment received', example: '350.00' },
    { name: '{{amountDue}}', description: 'Amount due', example: '150.00' },
    { name: '{{treatmentProgress}}', description: 'Progress %', example: '50' },
    { name: '{{nextVisitDate}}', description: 'Next visit date', example: 'Nov 7, 2024' },
    { name: '{{notes}}', description: 'Additional notes', example: 'Patient tolerated well...' },
  ];

  const variables = templateType === 'invoice' ? invoiceVariables : templateType === 'prescription' ? prescriptionVariables : visitVariables;

  const defaultInvoiceTemplate = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>Invoice {{invoiceNumber}}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 40px; background: #fff; }
    .invoice { max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #0ea5e9; padding-bottom: 20px; }
    .clinic-name { font-size: 28px; font-weight: bold; color: #0ea5e9; }
    .invoice-title { font-size: 32px; margin: 30px 0; text-align: center; color: #333; }
    table { width: 100%; border-collapse: collapse; margin: 30px 0; }
    th { background: #0ea5e9; color: white; padding: 12px; text-align: right; }
    td { padding: 12px; border-bottom: 1px solid #ddd; text-align: right; }
    .totals { text-align: left; margin-top: 30px; }
    .total-row { display: flex; justify-content: space-between; padding: 10px; font-size: 18px; font-weight: bold; background: #0ea5e9; color: white; }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <div class="clinic-name">{{clinicName}}</div>
      <p>{{clinicAddress}}</p>
      <p>{{clinicPhone}}</p>
    </div>
    <div class="invoice-title">فاتورة #{{invoiceNumber}}</div>
    <div>
      <p><strong>اسم المريض:</strong> {{patientName}}</p>
      <p><strong>التاريخ:</strong> {{invoiceDate}}</p>
    </div>
    <table>
      <thead>
        <tr>
          <th>الوصف</th>
          <th>الكمية</th>
          <th>السعر</th>
          <th>المجموع</th>
        </tr>
      </thead>
      <tbody id="items"></tbody>
    </table>
    <div class="totals">
      <div class="total-row">
        <span>المجموع الكلي:</span>
        <span>{{total}} IQD</span>
      </div>
    </div>
  </div>
  <script>
    const items = {{itemsJson}};
    const tbody = document.getElementById('items');
    items.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = \`
        <td>\${item.description}</td>
        <td>\${item.quantity}</td>
        <td>\${item.unitPrice.toLocaleString()} IQD</td>
        <td>\${item.total.toLocaleString()} IQD</td>
      \`;
      tbody.appendChild(tr);
    });
  </script>
</body>
</html>`;

  const defaultPrescriptionTemplate = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>Prescription</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 40px; background: #fff; }
    .prescription { max-width: 800px; margin: 0 auto; border: 2px solid #0ea5e9; padding: 30px; }
    .header { text-align: center; border-bottom: 3px solid #0ea5e9; padding-bottom: 20px; margin-bottom: 30px; }
    .clinic-name { font-size: 28px; font-weight: bold; color: #0ea5e9; }
    .rx-symbol { font-size: 64px; text-align: center; color: #0ea5e9; margin: 20px 0; }
    .patient-info { background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
    .medication { border-right: 4px solid #0ea5e9; padding-right: 15px; margin-bottom: 20px; }
    .medication-name { font-size: 20px; font-weight: bold; color: #333; margin-bottom: 10px; }
    .signature { margin-top: 50px; text-align: left; }
  </style>
</head>
<body>
  <div class="prescription">
    <div class="header">
      <div class="clinic-name">{{clinicName}}</div>
      <p>د. {{doctorName}}</p>
      <p>{{doctorSpecialization}}</p>
      <p>{{clinicPhone}}</p>
    </div>
    <div class="rx-symbol">℞</div>
    <div class="patient-info">
      <p><strong>اسم المريض:</strong> {{patientName}}</p>
      <p><strong>العمر:</strong> {{patientAge}} سنة</p>
      <p><strong>التاريخ:</strong> {{prescriptionDate}}</p>
    </div>
    <div id="medications"></div>
    <div class="signature">
      <p>توقيع الطبيب: _________________</p>
    </div>
  </div>
  <script>
    const medications = {{medicationsJson}};
    const container = document.getElementById('medications');
    medications.forEach((med, index) => {
      const div = document.createElement('div');
      div.className = 'medication';
      div.innerHTML = \`
        <div class="medication-name">\${index + 1}. \${med.name}</div>
        <p>الجرعة: \${med.dosage}</p>
        <p>التكرار: \${med.frequency}</p>
        <p>المدة: \${med.duration}</p>
        \${med.instructions ? \`<p style="color: #0ea5e9; margin-top: 10px;">ملاحظات: \${med.instructions}</p>\` : ''}
      \`;
      container.appendChild(div);
    });
  </script>
</body>
</html>`;

  const defaultVisitTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Visit Record</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
    .container { max-width: 800px; margin: 0 auto; background: white; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
    .header h1 { font-size: 28px; margin-bottom: 5px; }
    .visit-badge { background: white; color: #667eea; display: inline-block; padding: 6px 15px; border-radius: 15px; font-weight: bold; margin-top: 10px; font-size: 14px; }
    .content { padding: 30px; }
    .section { background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin-bottom: 20px; border-radius: 4px; }
    .section h2 { color: #667eea; font-size: 16px; margin-bottom: 15px; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .info-item { background: white; padding: 10px; border-radius: 4px; border: 1px solid #e0e0e0; }
    .info-label { font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 4px; }
    .info-value { font-size: 14px; color: #333; font-weight: 600; }
    .procedure-box { background: white; padding: 15px; border-radius: 4px; border: 1px solid #e0e0e0; margin-top: 10px; }
    .financial { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .financial h3 { margin-bottom: 15px; font-size: 18px; }
    .financial-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; }
    .financial-item { background: rgba(255,255,255,0.2); padding: 15px; border-radius: 4px; text-align: center; }
    .financial-label { font-size: 12px; opacity: 0.9; }
    .financial-value { font-size: 22px; font-weight: bold; margin-top: 5px; }
    .next-visit { background: #e3f2fd; border: 2px dashed #2196F3; padding: 20px; border-radius: 8px; text-align: center; }
    .next-visit h3 { color: #1976D2; margin-bottom: 10px; }
    .footer { background: #f8f9fa; padding: 20px; text-align: center; border-top: 2px solid #e0e0e0; font-size: 12px; color: #666; }
    .progress-bar { background: #e0e0e0; height: 8px; border-radius: 10px; overflow: hidden; margin-top: 10px; }
    .progress-fill { background: linear-gradient(90deg, #667eea, #764ba2); height: 100%; width: {{treatmentProgress}}%; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{clinicName}}</h1>
      <p>{{clinicAddress}} | {{clinicPhone}}</p>
      <div class="visit-badge">Visit #{{visitNumber}} of {{totalVisits}}</div>
    </div>
    <div class="content">
      <div class="section">
        <h2>Patient Information</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Patient Name</div>
            <div class="info-value">{{patientName}}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Age</div>
            <div class="info-value">{{patientAge}} years</div>
          </div>
        </div>
      </div>
      <div class="section">
        <h2>Visit Information</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Visit Date & Time</div>
            <div class="info-value">{{visitDate}} at {{visitTime}}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Doctor</div>
            <div class="info-value">{{doctorName}}</div>
          </div>
        </div>
      </div>
      <div class="section">
        <h2>Clinical Details</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Treatment</div>
            <div class="info-value">{{treatmentPlan}}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Teeth Treated</div>
            <div class="info-value">{{teethTreated}}</div>
          </div>
        </div>
        <div class="procedure-box">
          <strong>Procedure:</strong> {{procedurePerformed}}
        </div>
      </div>
      <div class="financial">
        <h3>Financial Summary</h3>
        <div class="financial-grid">
          <div class="financial-item">
            <div class="financial-label">Cost</div>
            <div class="financial-value">\${{visitCost}}</div>
          </div>
          <div class="financial-item">
            <div class="financial-label">Paid</div>
            <div class="financial-value">\${{paymentReceived}}</div>
          </div>
          <div class="financial-item">
            <div class="financial-label">Due</div>
            <div class="financial-value">\${{amountDue}}</div>
          </div>
        </div>
      </div>
      <div class="section">
        <h2>Treatment Progress</h2>
        <div class="progress-bar">
          <div class="progress-fill"></div>
        </div>
        <div style="text-align: right; font-weight: bold; color: #667eea; margin-top: 5px;">{{treatmentProgress}}% Complete</div>
      </div>
      <div class="next-visit">
        <h3>Next Appointment</h3>
        <div style="font-size: 18px; font-weight: bold; color: #1565C0;">{{nextVisitDate}}</div>
      </div>
    </div>
    <div class="footer">
      <p><strong>{{clinicName}}</strong></p>
      <p>{{clinicAddress}} | {{clinicPhone}}</p>
    </div>
  </div>
</body>
</html>`;

  const getDefaultTemplate = () => {
    if (templateType === 'invoice') return defaultInvoiceTemplate;
    if (templateType === 'prescription') return defaultPrescriptionTemplate;
    return defaultVisitTemplate;
  };

  useEffect(() => {
    setHtmlCode(getDefaultTemplate());
    loadLibraryTemplates();
  }, [templateType]);

  useEffect(() => {
    updatePreview();
  }, [htmlCode, cssCode]);

  const loadLibraryTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('template_library')
        .select('*')
        .eq('template_type', templateType)
        .eq('is_active', true)
        .order('category', { ascending: true });

      if (error) throw error;
      setLibraryTemplates(data || []);
    } catch (error) {
      console.error('Error loading library templates:', error);
    }
  };

  const updatePreview = () => {
    let sampleData;

    if (templateType === 'invoice') {
      sampleData = {
        invoiceNumber: 'INV-001',
        invoiceDate: new Date().toLocaleDateString('ar-IQ'),
        clinicName: 'عيادة الأسنان الحديثة',
        clinicAddress: 'شارع الطبي 123، بغداد',
        clinicPhone: '+964 770 123 4567',
        patientName: 'أحمد علي',
        patientPhone: '+964 770 999 8888',
        items: [
          { description: 'تنظيف الأسنان', quantity: 1, unitPrice: 50000, total: 50000 },
          { description: 'حشوة أسنان', quantity: 2, unitPrice: 75000, total: 150000 }
        ],
        itemsJson: JSON.stringify([
          { description: 'تنظيف الأسنان', quantity: 1, unitPrice: 50000, total: 50000 },
          { description: 'حشوة أسنان', quantity: 2, unitPrice: 75000, total: 150000 }
        ]),
        subtotal: 200000,
        tax: 0,
        discount: 10000,
        total: 190000,
        paidAmount: 190000,
        remainingAmount: 0
      };
    } else if (templateType === 'prescription') {
      sampleData = {
        clinicName: 'المركز الطبي الحديث',
        clinicAddress: 'شارع الطبي 123، بغداد',
        clinicPhone: '+964 770 123 4567',
        doctorName: 'أحمد حسن',
        doctorSpecialization: 'طب العائلة',
        patientName: 'سارة محمد',
        patientAge: 35,
        patientGender: 'female',
        prescriptionDate: new Date().toLocaleDateString('ar-IQ'),
        medications: [
          { name: 'Amoxicillin 500mg', dosage: '500mg', frequency: '3 مرات يومياً', duration: '7 أيام', instructions: 'تناول بعد الطعام' },
          { name: 'Paracetamol 500mg', dosage: '500mg', frequency: 'عند الحاجة', duration: '5 أيام', instructions: 'لا تتجاوز 4 جرعات يومياً' }
        ],
        medicationsJson: JSON.stringify([
          { name: 'Amoxicillin 500mg', dosage: '500mg', frequency: '3 مرات يومياً', duration: '7 أيام', instructions: 'تناول بعد الطعام' },
          { name: 'Paracetamol 500mg', dosage: '500mg', frequency: 'عند الحاجة', duration: '5 أيام', instructions: 'لا تتجاوز 4 جرعات يومياً' }
        ]),
        instructions: 'شرب الكثير من الماء والراحة'
      };
    } else {
      sampleData = {
        clinicName: 'Smile Dental Clinic',
        clinicAddress: '123 Main Street, Baghdad',
        clinicPhone: '+964 770 123 4567',
        patientName: 'Ahmed Ali Mohammed',
        patientAge: 35,
        doctorName: 'Dr. Mohammed Hassan',
        visitDate: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        visitTime: '10:30 AM',
        visitNumber: 2,
        totalVisits: 4,
        treatmentCategory: 'Root Canal Treatment',
        treatmentPlan: 'Molar Root Canal Package',
        procedurePerformed: 'Completed root canal treatment on tooth #14. Canal cleaned, shaped, and filled with gutta-percha.',
        teethTreated: '#14, #15',
        diagnosis: 'Pulpitis on tooth #14',
        visitCost: '500.00',
        paymentReceived: '350.00',
        amountDue: '150.00',
        treatmentProgress: 50,
        nextVisitDate: 'Thursday, November 7, 2024',
        notes: 'Patient tolerated procedure well. Slight discomfort expected for 24-48 hours.'
      };
    }

    let processedHtml = htmlCode;
    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      processedHtml = processedHtml.replace(regex, String(value));
    });

    if (cssCode) {
      const styleTag = `<style>${cssCode}</style>`;
      processedHtml = processedHtml.replace('</head>', `${styleTag}</head>`);
    }

    if (previewRef.current) {
      const iframeDoc = previewRef.current.contentDocument || previewRef.current.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(processedHtml);
        iframeDoc.close();
      }
    }
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    setSaving(true);
    try {
      console.log('=== Saving Custom Template ===');
      console.log('Clinic ID:', clinicId);
      console.log('Template Name:', templateName);
      console.log('Template Type:', templateType);
      console.log('HTML Length:', htmlCode.length);
      console.log('CSS Length:', cssCode.length);

      const { data: existingTemplate, error: checkError } = await supabase
        .from('document_templates')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('template_type', templateType)
        .maybeSingle();

      if (checkError) {
        console.error('Error checking existing template:', checkError);
        throw checkError;
      }

      console.log('Existing template found:', existingTemplate ? 'Yes' : 'No');

      if (existingTemplate) {
        console.log('Updating existing template:', existingTemplate.id);
        const { error: updateError } = await supabase
          .from('document_templates')
          .update({
            template_name: templateName,
            custom_html: htmlCode,
            custom_css: cssCode,
            use_custom_template: true,
            template_variables: { [templateType]: variables.map(v => v.name) },
            updated_at: new Date().toISOString()
          })
          .eq('id', existingTemplate.id);

        if (updateError) {
          console.error('Update error:', updateError);
          throw updateError;
        }
        console.log('✓ Template updated successfully');
      } else {
        console.log('Inserting new template');
        const { error: insertError } = await supabase
          .from('document_templates')
          .insert({
            clinic_id: clinicId,
            template_name: templateName,
            template_type: templateType,
            custom_html: htmlCode,
            custom_css: cssCode,
            use_custom_template: true,
            template_variables: { [templateType]: variables.map(v => v.name) },
            is_default: false
          });

        if (insertError) {
          console.error('Insert error:', insertError);
          throw insertError;
        }
        console.log('✓ Template inserted successfully');
      }

      alert('Template saved successfully!');
      if (onClose) onClose();
    } catch (error: any) {
      console.error('Error saving template:', error);
      alert(`Failed to save template: ${error.message || 'Please try again.'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLoadLibraryTemplate = (template: LibraryTemplate) => {
    setHtmlCode(template.html_template);
    setCssCode(template.css_template || '');
    setTemplateName(template.template_name);
    setSelectedLibraryTemplate(template.id);
    setShowLibrary(false);
  };

  const copyVariable = (variable: string) => {
    navigator.clipboard.writeText(variable);
  };

  const downloadTemplate = () => {
    const fullHtml = cssCode
      ? htmlCode.replace('</head>', `<style>${cssCode}</style></head>`)
      : htmlCode;

    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${templateName || templateType}-template.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-sky-500 to-blue-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Palette className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Custom Template Designer</h2>
              <p className="text-sky-100 text-sm">Create beautiful custom HTML/CSS templates</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Template Name</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                placeholder="Enter template name..."
              />
            </div>

            <div className="w-64">
              <label className="block text-sm font-medium text-gray-700 mb-2">Template Type</label>
              <select
                value={templateType}
                onChange={(e) => setTemplateType(e.target.value as 'invoice' | 'prescription' | 'visit')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
              >
                <option value="invoice">Invoice (فاتورة)</option>
                <option value="prescription">Prescription (روشتة)</option>
                <option value="visit">Visit Record (سجل زيارة)</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <button
                onClick={() => setShowLibrary(!showLibrary)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Template Library
              </button>
            </div>
          </div>

          {showLibrary && (
            <div className="mb-6 bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border-2 border-purple-200">
              <h3 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                <Layout className="w-5 h-5" />
                Choose from Template Library
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {libraryTemplates.map((template) => (
                  <div
                    key={template.id}
                    className={`bg-white rounded-lg border-2 cursor-pointer transition-all hover:shadow-lg overflow-hidden ${
                      selectedLibraryTemplate === template.id
                        ? 'border-purple-500 shadow-lg'
                        : 'border-gray-200 hover:border-purple-300'
                    }`}
                    onClick={() => handleLoadLibraryTemplate(template)}
                  >
                    {template.thumbnail_url && (
                      <div className="w-full h-40 bg-gray-100 overflow-hidden">
                        <img
                          src={template.thumbnail_url}
                          alt={template.template_name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-gray-900 truncate">{template.template_name}</h4>
                          <p className="text-sm text-gray-600 truncate">{template.template_name_ar}</p>
                        </div>
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full ml-2 flex-shrink-0">
                          {template.category}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <Code className="w-4 h-4" />
                    HTML Template
                  </label>
                  <button
                    onClick={downloadTemplate}
                    className="text-sm text-sky-600 hover:text-sky-700 flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
                <textarea
                  value={htmlCode}
                  onChange={(e) => setHtmlCode(e.target.value)}
                  className="w-full h-96 px-4 py-3 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Enter HTML template code..."
                  spellCheck={false}
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                  <Palette className="w-4 h-4" />
                  Custom CSS (Optional)
                </label>
                <textarea
                  value={cssCode}
                  onChange={(e) => setCssCode(e.target.value)}
                  className="w-full h-48 px-4 py-3 font-mono text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                  placeholder="Enter additional CSS styles..."
                  spellCheck={false}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <FileText className="w-4 h-4" />
                    Available Variables
                  </label>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto border border-gray-200">
                  {variables.map((variable) => (
                    <div
                      key={variable.name}
                      className="mb-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-sky-300 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <code className="text-xs font-bold text-sky-600">{variable.name}</code>
                        <button
                          onClick={() => copyVariable(variable.name)}
                          className="text-gray-400 hover:text-sky-600 transition-colors"
                          title="Copy to clipboard"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{variable.description}</p>
                      <p className="text-xs text-gray-400">Example: {variable.example}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    id="showPreview"
                    checked={showPreview}
                    onChange={(e) => setShowPreview(e.target.checked)}
                    className="w-4 h-4 text-sky-600 rounded focus:ring-sky-500"
                  />
                  <label htmlFor="showPreview" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Live Preview
                  </label>
                </div>
                {showPreview && (
                  <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
                    <iframe
                      ref={previewRef}
                      className="w-full h-[600px]"
                      title="Template Preview"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 p-6 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            <p className="font-medium mb-1">Template Tips:</p>
            <ul className="list-disc list-inside text-xs space-y-1">
              <li>Use variables from the list above in your HTML</li>
              <li>For arrays (items, medications), use JavaScript in {`<script>`} tags</li>
              <li>Test thoroughly before using in production</li>
            </ul>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveTemplate}
              disabled={saving || !templateName.trim()}
              className="px-6 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg hover:from-sky-600 hover:to-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
