// @ts-nocheck
export const formatPhoneForWhatsApp = (phone: string | null): string | null => {
  if (!phone) return null;

  let cleaned = phone.replace(/\D/g, '');

  if (cleaned.startsWith('0')) {
    cleaned = '964' + cleaned.substring(1);
  } else if (!cleaned.startsWith('964')) {
    cleaned = '964' + cleaned;
  }

  return cleaned;
};

export const generateWhatsAppLink = (phone: string, message: string): string => {
  const formattedPhone = formatPhoneForWhatsApp(phone);
  if (!formattedPhone) return '';

  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
};

export const openWhatsApp = (phone: string, message: string) => {
  const formattedPhone = formatPhoneForWhatsApp(phone);

  if (!formattedPhone) {
    alert('Invalid phone number');
    return;
  }

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

  window.open(whatsappUrl, '_blank');
};

const loadTemplate = async (
  clinicId: string,
  messageType: string
): Promise<string | null> => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    );

    console.log('🔍 Loading WhatsApp template:', { clinicId, messageType });

    const { data, error } = await supabase
      .from('whatsapp_message_templates')
      .select('template_text')
      .eq('clinic_id', clinicId)
      .eq('message_type', messageType)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('❌ Error loading template:', error);
      return null;
    }

    if (data?.template_text) {
      console.log('✅ Custom template found');
      console.log('📄 Template:', data.template_text.substring(0, 100) + '...');
    } else {
      console.log('⚠️ No custom template found, using default');
    }

    return data?.template_text || null;
  } catch (error) {
    console.error('❌ Exception loading template:', error);
    return null;
  }
};

const replaceVariables = (template: string, variables: Record<string, string>): string => {
  let result = template;
  Object.entries(variables).forEach(([key, value]) => {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
  });
  return result;
};

const formatDate = (dateStr: string, lang: 'en' | 'ar' | 'ku') => {
  const date = new Date(dateStr);
  if (lang === 'ar') {
    return date.toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } else if (lang === 'ku') {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export const getWhatsAppMessage = async (
  patientName: string,
  patientLanguage: 'en' | 'ar' | 'ku',
  clinicName: string,
  appointmentDate: string,
  appointmentTime: string,
  doctorName?: string,
  clinicId?: string
): Promise<string> => {
  console.log('📱 getWhatsAppMessage called:', { patientName, clinicName, doctorName, clinicId });

  const formattedDate = formatDate(appointmentDate, patientLanguage);

  if (clinicId) {
    const template = await loadTemplate(clinicId, 'appointment_reminder');
    if (template) {
      console.log('✅ Using custom template');
      const message = replaceVariables(template, {
        patient_name: patientName,
        doctor_name: doctorName || '',
        appointment_date: formattedDate,
        appointment_time: appointmentTime,
        clinic_name: clinicName
      });
      console.log('📤 Final message:', message);
      return message;
    } else {
      console.log('⚠️ No template found, using default');
    }
  } else {
    console.log('⚠️ No clinicId provided');
  }

  if (patientLanguage === 'ar') {
    return `مرحباً ${patientName}، هذا تذكير بموعدك في عيادة ${clinicName} يوم ${formattedDate} الساعة ${appointmentTime}${doctorName ? ` مع الدكتور ${doctorName}` : ''}. نراك قريباً!`;
  } else if (patientLanguage === 'ku') {
    return `سڵاو ${patientName}، ئەمە یادەوەرییەکە بۆ چاوپێکەوتنەکەت لە کلینیکی ${clinicName} لە ڕۆژی ${formattedDate} لە کاتژمێر ${appointmentTime}${doctorName ? ` لەگەڵ دکتۆر ${doctorName}` : ''}. بە نزیکەوە دەتبینینەوە!`;
  } else {
    return `Hello ${patientName}, this is a reminder for your appointment at ${clinicName} on ${formattedDate} at ${appointmentTime}${doctorName ? ` with Dr. ${doctorName}` : ''}. See you soon!`;
  }
};

export const getInvoiceWhatsAppMessage = async (
  patientName: string,
  patientLanguage: 'en' | 'ar' | 'ku',
  clinicName: string,
  invoiceNumber: string,
  totalAmount: number,
  paidAmount: number,
  currency: string = 'IQD',
  clinicId?: string
): Promise<string> => {
  const remainingBalance = totalAmount - paidAmount;

  if (clinicId) {
    const template = await loadTemplate(clinicId, 'invoice_notification');
    if (template) {
      return replaceVariables(template, {
        patient_name: patientName,
        total_amount: `${totalAmount.toLocaleString()} ${currency}`,
        invoice_number: invoiceNumber,
        clinic_name: clinicName
      });
    }
  }

  if (patientLanguage === 'ar') {
    return `مرحباً ${patientName}،\n\nفاتورة من عيادة ${clinicName}\nرقم الفاتورة: ${invoiceNumber}\nالمبلغ الإجمالي: ${totalAmount.toLocaleString()} ${currency}\nالمبلغ المدفوع: ${paidAmount.toLocaleString()} ${currency}\nالمبلغ المتبقي: ${remainingBalance.toLocaleString()} ${currency}\n\nشكراً لزيارتك!`;
  } else if (patientLanguage === 'ku') {
    return `سڵاو ${patientName}،\n\nپسوڵە لە کلینیکی ${clinicName}\nژمارەی پسوڵە: ${invoiceNumber}\nکۆی گشتی: ${totalAmount.toLocaleString()} ${currency}\nبڕی پارەدراو: ${paidAmount.toLocaleString()} ${currency}\nماوەی پارە: ${remainingBalance.toLocaleString()} ${currency}\n\nسوپاس بۆ سەردانەکەت!`;
  } else {
    return `Hello ${patientName},\n\nInvoice from ${clinicName}\nInvoice #: ${invoiceNumber}\nTotal Amount: ${totalAmount.toLocaleString()} ${currency}\nPaid Amount: ${paidAmount.toLocaleString()} ${currency}\nRemaining Balance: ${remainingBalance.toLocaleString()} ${currency}\n\nThank you for your visit!`;
  }
};

export const getPrescriptionWhatsAppMessage = async (
  patientName: string,
  patientLanguage: 'en' | 'ar' | 'ku',
  clinicName: string,
  doctorName: string,
  prescriptionDate: string,
  medications?: string[],
  clinicId?: string
): Promise<string> => {
  const formattedDate = formatDate(prescriptionDate, patientLanguage);

  if (clinicId) {
    const template = await loadTemplate(clinicId, 'prescription_notification');
    if (template) {
      return replaceVariables(template, {
        patient_name: patientName,
        doctor_name: doctorName,
        prescription_date: formattedDate,
        clinic_name: clinicName
      });
    }
  }

  const medicationList = medications?.map((med, idx) => `${idx + 1}. ${med}`).join('\n') || '';

  if (patientLanguage === 'ar') {
    return `مرحباً ${patientName}،\n\nوصفتك الطبية من عيادة ${clinicName} مع الدكتور ${doctorName}\nالتاريخ: ${formattedDate}\n\n${medicationList}\n\nيرجى تناول الأدوية حسب التعليمات.\nمع تمنياتنا بالشفاء العاجل!`;
  } else if (patientLanguage === 'ku') {
    return `سڵاو ${patientName}،\n\nڕەچەتەی پزیشکیت لە کلینیکی ${clinicName} لەگەڵ دکتۆر ${doctorName}\nبەروار: ${formattedDate}\n\n${medicationList}\n\nتکایە دەرمانەکان بەپێی ڕێنماییەکان بەکاربهێنە.\nبە هیوای چاکبوونەوەی خێرا!`;
  } else {
    return `Hello ${patientName},\n\nYour prescription from ${clinicName} with Dr. ${doctorName}\nDate: ${formattedDate}\n\n${medicationList}\n\nPlease take medications as directed.\nWishing you a speedy recovery!`;
  }
};

export const getPaymentReminderMessage = async (
  patientName: string,
  patientLanguage: 'en' | 'ar' | 'ku',
  clinicName: string,
  amountDue: number,
  invoiceNumber: string,
  dueDate: string,
  currency: string = 'IQD',
  clinicId?: string
): Promise<string> => {
  const formattedDate = formatDate(dueDate, patientLanguage);

  if (clinicId) {
    const template = await loadTemplate(clinicId, 'payment_reminder');
    if (template) {
      return replaceVariables(template, {
        patient_name: patientName,
        amount_due: `${amountDue.toLocaleString()} ${currency}`,
        invoice_number: invoiceNumber,
        due_date: formattedDate,
        clinic_name: clinicName
      });
    }
  }

  if (patientLanguage === 'ar') {
    return `مرحباً ${patientName}،\n\nهذا تذكير ودي بأن لديك رصيد متبقي قدره ${amountDue.toLocaleString()} ${currency} للفاتورة رقم ${invoiceNumber} في عيادة ${clinicName}.\n\nتاريخ الاستحقاق: ${formattedDate}\n\nيرجى تسوية المبلغ في أقرب وقت ممكن.\nشكراً لك!`;
  } else if (patientLanguage === 'ku') {
    return `سڵاو ${patientName}،\n\nئەمە یادەوەرییەکی دۆستانەیە کە قەرزێکی ${amountDue.toLocaleString()} ${currency}ت هەیە بۆ وەسڵی ژمارە ${invoiceNumber} لە کلینیکی ${clinicName}.\n\nبەرواری قەرز: ${formattedDate}\n\nتکایە بڕەکە لە کاتی خۆیدا تەواو بکە.\nسوپاس!`;
  } else {
    return `Hello ${patientName},\n\nThis is a friendly reminder that you have an outstanding balance of ${amountDue.toLocaleString()} ${currency} for invoice #${invoiceNumber} at ${clinicName}.\n\nDue Date: ${formattedDate}\n\nPlease settle the amount at your earliest convenience.\nThank you!`;
  }
};

export const getFollowUpReminderMessage = async (
  patientName: string,
  patientLanguage: 'en' | 'ar' | 'ku',
  clinicName: string,
  lastVisitDate: string,
  treatmentType: string,
  clinicId?: string
): Promise<string> => {
  const formattedDate = formatDate(lastVisitDate, patientLanguage);

  if (clinicId) {
    const template = await loadTemplate(clinicId, 'follow_up_reminder');
    if (template) {
      return replaceVariables(template, {
        patient_name: patientName,
        last_visit_date: formattedDate,
        treatment_type: treatmentType,
        clinic_name: clinicName
      });
    }
  }

  if (patientLanguage === 'ar') {
    return `مرحباً ${patientName}،\n\nلقد مضى وقت منذ زيارتك الأخيرة في ${formattedDate} لـ ${treatmentType} في عيادة ${clinicName}.\n\nنوصي بحجز موعد متابعة للتأكد من صحة أسنانك.\n\nيرجى الاتصال بنا لحجز موعد.\nنتطلع لرؤيتك!`;
  } else if (patientLanguage === 'ku') {
    return `سڵاو ${patientName}،\n\nماوەیەک تێپەڕیوە لە سەردانی کۆتاییت لە ${formattedDate} بۆ ${treatmentType} لە کلینیکی ${clinicName}.\n\nپێشنیار دەکەین چاوپێکەوتنێکی دواتر دابنێیت بۆ دڵنیابوون لە تەندروستی ددانەکانت.\n\nتکایە پەیوەندیمان پێوە بکە بۆ دانانی چاوپێکەوتن.\nچاوەڕوانی بینینەوەتین!`;
  } else {
    return `Hello ${patientName},\n\nIt has been a while since your last visit on ${formattedDate} for ${treatmentType} at ${clinicName}.\n\nWe recommend scheduling a follow-up appointment to ensure your dental health.\n\nPlease contact us to book an appointment.\nLooking forward to seeing you!`;
  }
};

export const getTreatmentPlanMessage = async (
  patientName: string,
  patientLanguage: 'en' | 'ar' | 'ku',
  clinicName: string,
  planName: string,
  totalCost: number,
  paidAmount: number,
  nextVisitDate: string,
  currency: string = 'IQD'
): Promise<string> => {
  const remaining = totalCost - paidAmount;
  const formattedDate = formatDate(nextVisitDate, patientLanguage);

  if (patientLanguage === 'ar') {
    return `مرحباً ${patientName}،\n\nملخص خطة العلاج من عيادة ${clinicName}:\n\nالخطة: ${planName}\nالتكلفة الإجمالية: ${totalCost.toLocaleString()} ${currency}\nالمبلغ المدفوع: ${paidAmount.toLocaleString()} ${currency}\nالمتبقي: ${remaining.toLocaleString()} ${currency}\n\nالزيارة القادمة: ${formattedDate}\n\nنتطلع لرؤيتك!`;
  } else if (patientLanguage === 'ku') {
    return `سڵاو ${patientName}،\n\nکورتەی پلانی چارەسەرکردن لە کلینیکی ${clinicName}:\n\nپلان: ${planName}\nکۆی تێچوو: ${totalCost.toLocaleString()} ${currency}\nبڕی پارەدراو: ${paidAmount.toLocaleString()} ${currency}\nماوە: ${remaining.toLocaleString()} ${currency}\n\nسەردانی داهاتوو: ${formattedDate}\n\nچاوەڕوانی بینینەوەتین!`;
  } else {
    return `Hello ${patientName},\n\nTreatment Plan Summary from ${clinicName}:\n\nPlan: ${planName}\nTotal Cost: ${totalCost.toLocaleString()} ${currency}\nPaid: ${paidAmount.toLocaleString()} ${currency}\nRemaining: ${remaining.toLocaleString()} ${currency}\n\nNext Visit: ${formattedDate}\n\nLooking forward to seeing you!`;
  }
};
