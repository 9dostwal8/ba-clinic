// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { FileText, Plus, Edit2, Trash2, Eye, Save, X, Code, Layout } from 'lucide-react';

interface Template {
  id: string;
  template_name: string;
  template_name_ar: string;
  template_type: 'invoice' | 'prescription' | 'visit';
  category: string;
  description: string;
  description_ar: string;
  thumbnail_url?: string;
  html_template: string;
  css_template?: string;
  template_variables: any;
  preview_data: any;
  is_rtl_ready: boolean;
  is_active: boolean;
  created_at: string;
}

export function SuperAdminTemplatesModule() {
  const { t, isRTL } = useLanguage();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'invoice' | 'prescription' | 'visit'>('all');

  const [formData, setFormData] = useState({
    template_name: '',
    template_name_ar: '',
    template_type: 'invoice' as 'invoice' | 'prescription' | 'visit',
    category: 'modern',
    description: '',
    description_ar: '',
    thumbnail_url: '',
    html_template: '',
    css_template: '',
    is_rtl_ready: true,
    is_active: true
  });

  useEffect(() => {
    loadTemplates();
  }, [filterType]);

  const loadTemplates = async () => {
    try {
      let query = supabase
        .from('template_library')
        .select('*')
        .order('created_at', { ascending: false });

      if (filterType !== 'all') {
        query = query.eq('template_type', filterType);
      }

      const { data, error } = await query;
      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const templateVariables = formData.template_type === 'invoice'
        ? {
            invoice: ['invoiceNumber', 'invoiceDate', 'clinicName', 'clinicNameAr', 'clinicAddress',
                     'clinicPhone', 'clinicLogo', 'patientName', 'patientNameAr', 'patientPhone',
                     'items', 'subtotal', 'tax', 'discount', 'total', 'paidAmount', 'remainingAmount']
          }
        : {
            prescription: ['clinicName', 'clinicNameAr', 'clinicLogo', 'clinicAddress', 'clinicPhone',
                          'doctorName', 'doctorNameAr', 'doctorSpecialization', 'patientName',
                          'patientNameAr', 'patientAge', 'patientGender', 'prescriptionDate',
                          'medications', 'instructions']
          };

      const previewData = formData.template_type === 'invoice'
        ? {
            invoiceNumber: 'INV-001',
            invoiceDate: new Date().toISOString().split('T')[0],
            clinicName: 'Sample Clinic',
            clinicAddress: '123 Medical Street',
            clinicPhone: '+964 770 123 4567',
            patientName: 'John Doe',
            items: [{ description: 'Service', quantity: 1, unitPrice: 100000, total: 100000 }],
            subtotal: 100000,
            total: 100000
          }
        : {
            clinicName: 'Sample Clinic',
            doctorName: 'Dr. Ahmed',
            doctorSpecialization: 'General',
            clinicPhone: '+964 770 123 4567',
            patientName: 'John Doe',
            patientAge: 30,
            prescriptionDate: new Date().toLocaleDateString(),
            medications: [{ name: 'Medicine', dosage: '500mg', frequency: '2x daily', duration: '7 days' }]
          };

      const templateData = {
        ...formData,
        template_variables: templateVariables,
        preview_data: previewData
      };

      console.log('Saving template data:', templateData);

      if (editingTemplate) {
        const { data, error } = await supabase
          .from('template_library')
          .update(templateData)
          .eq('id', editingTemplate.id)
          .select();

        console.log('Update result:', { data, error });
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('template_library')
          .insert([templateData])
          .select();

        console.log('Insert result:', { data, error });
        if (error) throw error;
      }

      setShowModal(false);
      resetForm();
      loadTemplates();
      alert(isRTL ? 'تم حفظ القالب بنجاح!' : 'Template saved successfully!');
    } catch (error: any) {
      console.error('Error saving template:', error);
      const errorMessage = error?.message || 'Unknown error';
      alert(`${isRTL ? 'خطأ في حفظ القالب' : 'Error saving template'}: ${errorMessage}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(isRTL ? 'هل أنت متأكد من حذف هذا القالب؟' : 'Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('template_library')
        .delete()
        .eq('id', id);
      if (error) throw error;
      loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      template_name: template.template_name,
      template_name_ar: template.template_name_ar,
      template_type: template.template_type,
      category: template.category,
      description: template.description,
      description_ar: template.description_ar,
      thumbnail_url: template.thumbnail_url || '',
      html_template: template.html_template,
      css_template: template.css_template || '',
      is_rtl_ready: template.is_rtl_ready,
      is_active: template.is_active
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setFormData({
      template_name: '',
      template_name_ar: '',
      template_type: 'invoice' as 'invoice' | 'prescription' | 'visit',
      category: 'modern',
      description: '',
      description_ar: '',
      thumbnail_url: '',
      html_template: '',
      css_template: '',
      is_rtl_ready: true,
      is_active: true
    });
    setEditingTemplate(null);
  };

  const toggleActive = async (template: Template) => {
    try {
      const { error } = await supabase
        .from('template_library')
        .update({ is_active: !template.is_active })
        .eq('id', template.id);
      if (error) throw error;
      loadTemplates();
    } catch (error) {
      console.error('Error toggling template:', error);
    }
  };

  const getTemplateVariables = (type: 'invoice' | 'prescription' | 'visit') => {
    if (type === 'invoice') {
      return [
        { name: '{{clinicName}}', desc: 'Clinic name | اسم العيادة' },
        { name: '{{clinicNameAr}}', desc: 'Clinic name (Arabic) | اسم العيادة بالعربية' },
        { name: '{{clinicAddress}}', desc: 'Clinic address | عنوان العيادة' },
        { name: '{{clinicPhone}}', desc: 'Clinic phone | هاتف العيادة' },
        { name: '{{clinicEmail}}', desc: 'Clinic email | البريد الإلكتروني' },
        { name: '{{clinicWebsite}}', desc: 'Clinic website | الموقع الإلكتروني' },
        { name: '{{patientName}}', desc: 'Patient name | اسم المريض' },
        { name: '{{patientPhone}}', desc: 'Patient phone | هاتف المريض' },
        { name: '{{invoiceNumber}}', desc: 'Invoice number | رقم الفاتورة' },
        { name: '{{invoiceDate}}', desc: 'Invoice date | تاريخ الفاتورة' },
        { name: '{{items}}', desc: 'Invoice items list | قائمة البنود' },
        { name: '{{subtotal}}', desc: 'Subtotal amount | المجموع الفرعي' },
        { name: '{{tax}}', desc: 'Tax amount | الضريبة' },
        { name: '{{discount}}', desc: 'Discount amount | الخصم' },
        { name: '{{total}}', desc: 'Total amount | المجموع الكلي' },
        { name: '{{amountPaid}}', desc: 'Amount paid | المبلغ المدفوع' },
        { name: '{{amountDue}}', desc: 'Amount due | المبلغ المستحق' }
      ];
    } else if (type === 'prescription') {
      return [
        { name: '{{clinicName}}', desc: 'Clinic name | اسم العيادة' },
        { name: '{{clinicNameAr}}', desc: 'Clinic name (Arabic) | اسم العيادة بالعربية' },
        { name: '{{clinicAddress}}', desc: 'Clinic address | عنوان العيادة' },
        { name: '{{clinicPhone}}', desc: 'Clinic phone | هاتف العيادة' },
        { name: '{{clinicEmail}}', desc: 'Clinic email | البريد الإلكتروني' },
        { name: '{{doctorName}}', desc: 'Doctor name | اسم الطبيب' },
        { name: '{{doctorNameAr}}', desc: 'Doctor name (Arabic) | اسم الطبيب بالعربية' },
        { name: '{{doctorSpecialty}}', desc: 'Doctor specialty | التخصص' },
        { name: '{{doctorLicense}}', desc: 'Doctor license | رقم الترخيص' },
        { name: '{{patientName}}', desc: 'Patient name | اسم المريض' },
        { name: '{{patientAge}}', desc: 'Patient age | عمر المريض' },
        { name: '{{patientPhone}}', desc: 'Patient phone | هاتف المريض' },
        { name: '{{patientGender}}', desc: 'Patient gender | الجنس' },
        { name: '{{patientWeight}}', desc: 'Patient weight | الوزن' },
        { name: '{{prescriptionDate}}', desc: 'Prescription date | تاريخ الوصفة' },
        { name: '{{diagnosis}}', desc: 'Diagnosis | التشخيص' },
        { name: '{{medications}}', desc: 'Medications list | قائمة الأدوية' },
        { name: '{{notes}}', desc: 'Additional notes | ملاحظات إضافية' }
      ];
    } else {
      return [
        { name: '{{clinicName}}', desc: 'Clinic name | اسم العيادة' },
        { name: '{{clinicNameAr}}', desc: 'Clinic name (Arabic) | اسم العيادة بالعربية' },
        { name: '{{clinicAddress}}', desc: 'Clinic address | عنوان العيادة' },
        { name: '{{clinicPhone}}', desc: 'Clinic phone | هاتف العيادة' },
        { name: '{{clinicEmail}}', desc: 'Clinic email | البريد الإلكتروني' },
        { name: '{{clinicWebsite}}', desc: 'Clinic website | الموقع الإلكتروني' },
        { name: '{{clinicLogo}}', desc: 'Clinic logo URL | شعار العيادة' },
        { name: '{{patientName}}', desc: 'Patient name | اسم المريض' },
        { name: '{{patientNameAr}}', desc: 'Patient name (Arabic) | اسم المريض بالعربية' },
        { name: '{{patientPhone}}', desc: 'Patient phone | هاتف المريض' },
        { name: '{{patientEmail}}', desc: 'Patient email | بريد المريض' },
        { name: '{{patientAge}}', desc: 'Patient age | عمر المريض' },
        { name: '{{patientGender}}', desc: 'Patient gender | الجنس' },
        { name: '{{patientAddress}}', desc: 'Patient address | عنوان المريض' },
        { name: '{{patientId}}', desc: 'Patient ID number | رقم هوية المريض' },
        { name: '{{doctorName}}', desc: 'Doctor name | اسم الطبيب' },
        { name: '{{doctorNameAr}}', desc: 'Doctor name (Arabic) | اسم الطبيب بالعربية' },
        { name: '{{doctorSpecialty}}', desc: 'Doctor specialty | تخصص الطبيب' },
        { name: '{{doctorPhone}}', desc: 'Doctor phone | هاتف الطبيب' },
        { name: '{{doctorEmail}}', desc: 'Doctor email | بريد الطبيب' },
        { name: '{{visitDate}}', desc: 'Visit date | تاريخ الزيارة' },
        { name: '{{visitDateAr}}', desc: 'Visit date (Arabic) | تاريخ الزيارة بالعربية' },
        { name: '{{visitTime}}', desc: 'Visit time | وقت الزيارة' },
        { name: '{{visitDuration}}', desc: 'Visit duration | مدة الزيارة' },
        { name: '{{treatmentCategory}}', desc: 'Treatment category | فئة العلاج' },
        { name: '{{treatmentPlan}}', desc: 'Treatment plan name | اسم خطة العلاج' },
        { name: '{{visitNumber}}', desc: 'Visit number | رقم الزيارة' },
        { name: '{{totalVisits}}', desc: 'Total visits planned | إجمالي الزيارات' },
        { name: '{{procedurePerformed}}', desc: 'Procedure performed | الإجراء المنفذ' },
        { name: '{{teethTreated}}', desc: 'Teeth numbers treated | أرقام الأسنان' },
        { name: '{{diagnosis}}', desc: 'Clinical diagnosis | التشخيص' },
        { name: '{{symptoms}}', desc: 'Patient symptoms | الأعراض' },
        { name: '{{treatmentNotes}}', desc: 'Treatment notes | ملاحظات العلاج' },
        { name: '{{visitCost}}', desc: 'Visit cost | تكلفة الزيارة' },
        { name: '{{paymentReceived}}', desc: 'Payment received | المبلغ المدفوع' },
        { name: '{{amountDue}}', desc: 'Amount remaining | المبلغ المستحق' },
        { name: '{{paymentMethod}}', desc: 'Payment method | طريقة الدفع' },
        { name: '{{receiptNumber}}', desc: 'Receipt number | رقم الإيصال' },
        { name: '{{materialsUsed}}', desc: 'Materials used | المواد المستخدمة' },
        { name: '{{medicationsPrescribed}}', desc: 'Medications | الأدوية الموصوفة' },
        { name: '{{postCareInstructions}}', desc: 'Post-care instructions | تعليمات العناية' },
        { name: '{{complications}}', desc: 'Complications noted | المضاعفات' },
        { name: '{{notes}}', desc: 'Additional notes | ملاحظات إضافية' },
        { name: '{{nextVisitDate}}', desc: 'Next visit date | تاريخ الزيارة القادمة' },
        { name: '{{nextVisitDateAr}}', desc: 'Next visit (Arabic) | الموعد القادم بالعربية' },
        { name: '{{nextVisitProcedure}}', desc: 'Next procedure | الإجراء القادم' },
        { name: '{{estimatedNextCost}}', desc: 'Estimated next cost | التكلفة المتوقعة' },
        { name: '{{treatmentProgress}}', desc: 'Treatment progress % | نسبة الإنجاز' },
        { name: '{{currentDate}}', desc: 'Current date | التاريخ الحالي' },
        { name: '{{currentTime}}', desc: 'Current time | الوقت الحالي' },
        { name: '{{visitId}}', desc: 'Visit ID | رقم الزيارة' },
        { name: '{{qrCode}}', desc: 'QR code for visit | رمز الاستجابة' }
      ];
    }
  };

  const getDefaultHTMLTemplate = (type: 'invoice' | 'prescription' | 'visit') => {
    if (type === 'invoice') {
      return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>Invoice {{invoiceNumber}}</title>
</head>
<body>
  <div class="invoice">
    <h1>{{clinicName}}</h1>
    <p>Invoice #{{invoiceNumber}}</p>
    <p>Date: {{invoiceDate}}</p>
    <p>Patient: {{patientName}}</p>
    <table>
      <tr><th>Description</th><th>Quantity</th><th>Price</th><th>Total</th></tr>
      {{#each items}}
      <tr>
        <td>{{description}}</td>
        <td>{{quantity}}</td>
        <td>{{unitPrice}}</td>
        <td>{{total}}</td>
      </tr>
      {{/each}}
    </table>
    <p>Total: {{total}} IQD</p>
  </div>
</body>
</html>`;
    } else if (type === 'prescription') {
      return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <title>Prescription</title>
</head>
<body>
  <div class="prescription">
    <h1>{{clinicName}}</h1>
    <p>Dr. {{doctorName}}</p>
    <p>Patient: {{patientName}}</p>
    <p>Age: {{patientAge}}</p>
    <p>Date: {{prescriptionDate}}</p>
    <h2>Medications:</h2>
    {{#each medications}}
    <div>
      <p><strong>{{name}}</strong></p>
      <p>Dosage: {{dosage}}</p>
      <p>Frequency: {{frequency}}</p>
      <p>Duration: {{duration}}</p>
    </div>
    {{/each}}
  </div>
</body>
</html>`;
    } else {
      return String.raw`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Visit Record - ` + '{{visitId}}' + `</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      box-shadow: 0 0 20px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      text-align: center;
    }
    .header h1 { font-size: 32px; margin-bottom: 5px; }
    .header p { opacity: 0.9; font-size: 14px; }
    .visit-badge {
      background: white;
      color: #667eea;
      display: inline-block;
      padding: 8px 20px;
      border-radius: 20px;
      font-weight: bold;
      margin-top: 15px;
    }
    .content { padding: 30px; }
    .section {
      background: #f8f9fa;
      border-left: 4px solid #667eea;
      padding: 20px;
      margin-bottom: 20px;
      border-radius: 4px;
    }
    .section h2 {
      color: #667eea;
      font-size: 18px;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    .info-item {
      background: white;
      padding: 12px;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
    }
    .info-label {
      font-size: 11px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .info-value {
      font-size: 15px;
      color: #333;
      font-weight: 600;
    }
    .procedure-box {
      background: white;
      padding: 15px;
      border-radius: 4px;
      border: 1px solid #e0e0e0;
      margin-top: 10px;
      line-height: 1.8;
    }
    .financial {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .financial h3 { margin-bottom: 15px; }
    .financial-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
    }
    .financial-item {
      background: rgba(255,255,255,0.2);
      padding: 15px;
      border-radius: 4px;
      text-align: center;
    }
    .financial-label { font-size: 12px; opacity: 0.9; }
    .financial-value { font-size: 24px; font-weight: bold; margin-top: 5px; }
    .next-visit {
      background: #e3f2fd;
      border: 2px dashed #2196F3;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .next-visit h3 { color: #1976D2; margin-bottom: 10px; }
    .next-visit .date { font-size: 20px; font-weight: bold; color: #1565C0; }
    .footer {
      background: #f8f9fa;
      padding: 20px;
      text-align: center;
      border-top: 2px solid #e0e0e0;
      font-size: 12px;
      color: #666;
    }
    .progress-bar {
      background: #e0e0e0;
      height: 8px;
      border-radius: 10px;
      overflow: hidden;
      margin-top: 10px;
    }
    .progress-fill {
      background: linear-gradient(90deg, #667eea, #764ba2);
      height: 100%;
      width: ` + '{{treatmentProgress}}' + `%;
      transition: width 0.3s;
    }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>` + '{{clinicName}}' + `</h1>
      <p>` + '{{clinicAddress}}' + ` | ` + '{{clinicPhone}}' + `</p>
      <div class="visit-badge">Visit #` + '{{visitNumber}}' + ` of ` + '{{totalVisits}}' + `</div>
    </div>

    <div class="content">
      <div class="section">
        <h2>👤 Patient Information</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Patient Name</div>
            <div class="info-value">` + '{{patientName}}' + `</div>
          </div>
          <div class="info-item">
            <div class="info-label">Patient ID</div>
            <div class="info-value">` + '{{patientId}}' + `</div>
          </div>
          <div class="info-item">
            <div class="info-label">Age / Gender</div>
            <div class="info-value">` + '{{patientAge}}' + ` years / ` + '{{patientGender}}' + `</div>
          </div>
          <div class="info-item">
            <div class="info-label">Contact</div>
            <div class="info-value">` + '{{patientPhone}}' + `</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>🩺 Visit Information</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Visit Date & Time</div>
            <div class="info-value">` + '{{visitDate}}' + ` at ` + '{{visitTime}}' + `</div>
          </div>
          <div class="info-item">
            <div class="info-label">Doctor</div>
            <div class="info-value">` + '{{doctorName}}' + `</div>
          </div>
          <div class="info-item">
            <div class="info-label">Treatment Plan</div>
            <div class="info-value">` + '{{treatmentPlan}}' + `</div>
          </div>
          <div class="info-item">
            <div class="info-label">Duration</div>
            <div class="info-value">` + '{{visitDuration}}' + `</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>🦷 Clinical Details</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Diagnosis</div>
            <div class="info-value">` + '{{diagnosis}}' + `</div>
          </div>
          <div class="info-item">
            <div class="info-label">Teeth Treated</div>
            <div class="info-value">` + '{{teethTreated}}' + `</div>
          </div>
        </div>
        <div class="procedure-box">
          <strong>Procedure Performed:</strong><br>
          ` + '{{procedurePerformed}}' + `
        </div>
        <div class="procedure-box" style="margin-top: 10px;">
          <strong>Treatment Notes:</strong><br>
          ` + '{{treatmentNotes}}' + `
        </div>
      </div>

      <div class="financial">
        <h3>💰 Financial Summary</h3>
        <div class="financial-grid">
          <div class="financial-item">
            <div class="financial-label">Visit Cost</div>
            <div class="financial-value">$` + '{{visitCost}}' + `</div>
          </div>
          <div class="financial-item">
            <div class="financial-label">Paid Today</div>
            <div class="financial-value">$` + '{{paymentReceived}}' + `</div>
          </div>
          <div class="financial-item">
            <div class="financial-label">Balance Due</div>
            <div class="financial-value">$` + '{{amountDue}}' + `</div>
          </div>
        </div>
        <div style="margin-top: 15px; font-size: 13px;">
          Payment Method: ` + '{{paymentMethod}}' + ` | Receipt #: ` + '{{receiptNumber}}' + `
        </div>
      </div>

      <div class="section">
        <h2>📋 Post-Care Instructions</h2>
        <div class="procedure-box">
          ` + '{{postCareInstructions}}' + `
        </div>
      </div>

      <div class="section">
        <h2>📊 Treatment Progress</h2>
        <div style="font-size: 14px; margin-bottom: 5px;">
          Visit ` + '{{visitNumber}}' + ` of ` + '{{totalVisits}}' + ` completed
        </div>
        <div class="progress-bar">
          <div class="progress-fill"></div>
        </div>
        <div style="text-align: right; font-size: 18px; font-weight: bold; color: #667eea; margin-top: 5px;">
          ` + '{{treatmentProgress}}' + `% Complete
        </div>
      </div>

      <div class="next-visit">
        <h3>📅 Next Appointment</h3>
        <div class="date">` + '{{nextVisitDate}}' + `</div>
        <div style="margin-top: 10px; color: #1976D2;">
          Procedure: ` + '{{nextVisitProcedure}}' + `<br>
          Estimated Cost: $` + '{{estimatedNextCost}}' + `
        </div>
      </div>

      <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
        <strong>Additional Notes:</strong><br>
        ` + '{{notes}}' + `
      </div>
    </div>

    <div class="footer">
      <p><strong>` + '{{clinicName}}' + `</strong></p>
      <p>` + '{{clinicAddress}}' + ` | Phone: ` + '{{clinicPhone}}' + ` | Email: ` + '{{clinicEmail}}' + `</p>
      <p style="margin-top: 10px;">Generated on ` + '{{currentDate}}' + ` at ` + '{{currentTime}}' + ` | Visit ID: ` + '{{visitId}}' + `</p>
    </div>
  </div>
</body>
</html>`;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
            {isRTL ? 'إدارة القوالب' : 'Template Management'}
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            {isRTL ? 'إنشاء وإدارة قوالب الفواتير والوصفات الطبية' : 'Create and manage invoice and prescription templates'}
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors text-sm sm:text-base"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>{isRTL ? 'قالب جديد' : 'New Template'}</span>
        </button>
      </div>

      <div className="flex flex-wrap gap-2 sm:gap-3">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            filterType === 'all'
              ? 'bg-sky-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {isRTL ? 'الكل' : 'All'} ({templates.length})
        </button>
        <button
          onClick={() => setFilterType('invoice')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            filterType === 'invoice'
              ? 'bg-sky-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {isRTL ? 'الفواتير' : 'Invoices'} ({templates.filter(t => t.template_type === 'invoice').length})
        </button>
        <button
          onClick={() => setFilterType('prescription')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            filterType === 'prescription'
              ? 'bg-sky-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {isRTL ? 'الوصفات' : 'Prescriptions'} ({templates.filter(t => t.template_type === 'prescription').length})
        </button>
        <button
          onClick={() => setFilterType('visit')}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            filterType === 'visit'
              ? 'bg-sky-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {isRTL ? 'الزيارات' : 'Visit Records'} ({templates.filter(t => t.template_type === 'visit').length})
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className={`bg-white rounded-lg shadow-sm border-2 overflow-hidden transition-all ${
              template.is_active ? 'border-gray-200' : 'border-red-200 opacity-60'
            }`}
          >
            {template.thumbnail_url && (
              <div className="w-full h-32 sm:h-40 bg-gray-100 overflow-hidden">
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
            <div className="p-3 sm:p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    template.template_type === 'invoice'
                      ? 'bg-green-100'
                      : template.template_type === 'prescription'
                      ? 'bg-blue-100'
                      : 'bg-amber-100'
                  }`}>
                    <FileText className={`w-4 h-4 sm:w-5 sm:h-5 ${
                      template.template_type === 'invoice'
                        ? 'text-green-600'
                        : template.template_type === 'prescription'
                        ? 'text-blue-600'
                        : 'text-amber-600'
                    }`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                      {isRTL ? template.template_name_ar : template.template_name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                        template.template_type === 'invoice'
                          ? 'bg-green-50 text-green-700'
                          : template.template_type === 'prescription'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {template.template_type === 'invoice'
                          ? (isRTL ? 'فاتورة' : 'Invoice')
                          : template.template_type === 'prescription'
                          ? (isRTL ? 'وصفة' : 'Prescription')
                          : (isRTL ? 'زيارة' : 'Visit')
                        }
                      </span>
                      <span className="text-xs text-gray-500 capitalize">{template.category}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => toggleActive(template)}
                  className={`px-2 py-1 rounded text-xs font-medium flex-shrink-0 ${
                    template.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {template.is_active ? (isRTL ? 'نشط' : 'Active') : (isRTL ? 'معطل' : 'Inactive')}
                </button>
              </div>

              <p className="text-xs sm:text-sm text-gray-600 mb-3 line-clamp-2">
                {isRTL ? template.description_ar : template.description}
              </p>
              <div className="flex items-center gap-2 px-3 sm:px-4 pb-3 sm:pb-4">
                <button
                  onClick={() => handleEdit(template)}
                className="flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 bg-sky-50 text-sky-600 rounded hover:bg-sky-100 transition-colors text-xs sm:text-sm"
              >
                <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                <span>{isRTL ? 'تعديل' : 'Edit'}</span>
              </button>
                <button
                  onClick={() => handleDelete(template.id)}
                  className="flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 sm:py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors text-xs sm:text-sm"
                >
                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>{isRTL ? 'حذف' : 'Delete'}</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-sm sm:text-base text-gray-500">
            {isRTL ? 'لا توجد قوالب بعد' : 'No templates yet'}
          </p>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
              <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                {editingTemplate
                  ? (isRTL ? 'تعديل القالب' : 'Edit Template')
                  : (isRTL ? 'قالب جديد' : 'New Template')
                }
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isRTL ? 'اسم القالب (English)' : 'Template Name (English)'}
                  </label>
                  <input
                    type="text"
                    value={formData.template_name}
                    onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm sm:text-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isRTL ? 'اسم القالب (العربية)' : 'Template Name (Arabic)'}
                  </label>
                  <input
                    type="text"
                    value={formData.template_name_ar}
                    onChange={(e) => setFormData({ ...formData, template_name_ar: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm sm:text-base"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isRTL ? 'نوع القالب' : 'Template Type'}
                  </label>
                  <select
                    value={formData.template_type}
                    onChange={(e) => setFormData({
                      ...formData,
                      template_type: e.target.value as 'invoice' | 'prescription' | 'visit',
                      html_template: formData.html_template || getDefaultHTMLTemplate(e.target.value as 'invoice' | 'prescription' | 'visit')
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm sm:text-base"
                    required
                  >
                    <option value="invoice">{isRTL ? 'فاتورة' : 'Invoice'}</option>
                    <option value="prescription">{isRTL ? 'وصفة طبية' : 'Prescription'}</option>
                    <option value="visit">{isRTL ? 'زيارة' : 'Visit'}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isRTL ? 'الفئة' : 'Category'}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm sm:text-base"
                    required
                  >
                    <option value="modern">{isRTL ? 'عصري' : 'Modern'}</option>
                    <option value="classic">{isRTL ? 'كلاسيكي' : 'Classic'}</option>
                    <option value="minimal">{isRTL ? 'بسيط' : 'Minimal'}</option>
                    <option value="professional">{isRTL ? 'احترافي' : 'Professional'}</option>
                    <option value="luxury">{isRTL ? 'فاخر' : 'Luxury'}</option>
                    <option value="simple">{isRTL ? 'بسيط جداً' : 'Simple'}</option>
                  </select>
                </div>
              </div>

              {/* Available Variables Section */}
              <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-lg p-4 border-2 border-sky-200">
                <h4 className="text-sm font-semibold text-sky-900 mb-3 flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  {isRTL ? 'المتغيرات المتاحة' : 'Available Variables'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {getTemplateVariables(formData.template_type).map((variable, index) => (
                    <div
                      key={index}
                      className="bg-white rounded px-3 py-2 text-xs border border-sky-100 hover:border-sky-300 transition-colors cursor-pointer"
                      onClick={() => {
                        navigator.clipboard.writeText(variable.name);
                        alert(isRTL ? 'تم النسخ!' : 'Copied!');
                      }}
                      title={isRTL ? 'انقر للنسخ' : 'Click to copy'}
                    >
                      <code className="text-sky-700 font-semibold">{variable.name}</code>
                      <p className="text-gray-600 mt-1">{variable.desc}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-sky-700 mt-3 flex items-center gap-1">
                  <span>💡</span>
                  {isRTL
                    ? 'انقر على أي متغير لنسخه إلى الحافظة'
                    : 'Click on any variable to copy it to clipboard'
                  }
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isRTL ? 'الوصف (English)' : 'Description (English)'}
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm sm:text-base"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {isRTL ? 'الوصف (العربية)' : 'Description (Arabic)'}
                  </label>
                  <textarea
                    value={formData.description_ar}
                    onChange={(e) => setFormData({ ...formData, description_ar: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm sm:text-base"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {isRTL ? 'رابط الصورة المصغرة (اختياري)' : 'Thumbnail URL (Optional)'}
                </label>
                <input
                  type="url"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm sm:text-base"
                  placeholder="https://example.com/thumbnail.jpg"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {isRTL
                    ? 'أضف رابط صورة لمعاينة القالب (يفضل 400x300 بكسل)'
                    : 'Add an image URL for template preview (recommended 400x300 pixels)'
                  }
                </p>
                {formData.thumbnail_url && (
                  <div className="mt-2">
                    <img
                      src={formData.thumbnail_url}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-lg border border-gray-200"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Code className="w-4 h-4 inline mr-1" />
                  {isRTL ? 'HTML Template' : 'HTML Template'}
                </label>
                <textarea
                  value={formData.html_template}
                  onChange={(e) => setFormData({ ...formData, html_template: e.target.value })}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent font-mono text-xs sm:text-sm"
                  placeholder={getDefaultHTMLTemplate(formData.template_type)}
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  {isRTL
                    ? 'استخدم {{variableName}} للمتغيرات و {{#each items}} للقوائم'
                    : 'Use {{variableName}} for variables and {{#each items}} for loops'
                  }
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Layout className="w-4 h-4 inline mr-1" />
                  {isRTL ? 'CSS (اختياري)' : 'CSS (Optional)'}
                </label>
                <textarea
                  value={formData.css_template}
                  onChange={(e) => setFormData({ ...formData, css_template: e.target.value })}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent font-mono text-xs sm:text-sm"
                  placeholder=".invoice { padding: 20px; }"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_rtl_ready}
                    onChange={(e) => setFormData({ ...formData, is_rtl_ready: e.target.checked })}
                    className="w-4 h-4 text-sky-600 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    {isRTL ? 'جاهز للغة العربية (RTL)' : 'RTL Ready (Arabic)'}
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-sky-600 rounded"
                  />
                  <span className="text-sm text-gray-700">
                    {isRTL ? 'نشط' : 'Active'}
                  </span>
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="w-full sm:w-auto px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm sm:text-base"
                >
                  {isRTL ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors text-sm sm:text-base"
                >
                  <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span>{isRTL ? 'حفظ' : 'Save'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
