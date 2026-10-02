// @ts-nocheck
import { X, Calendar, User, Phone, FileText, Download, CreditCard, CheckCircle, XCircle, AlertCircle, MessageCircle } from 'lucide-react';
import { generateInvoicePDF, InvoiceData } from '../../utils/pdfGenerator';
import { generateCustomInvoicePDF } from '../../utils/customTemplateRenderer';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCurrency } from '../../hooks/useCurrency';
import { useAuth } from '../../contexts/AuthContext';
import { openWhatsApp, getInvoiceWhatsAppMessage } from '../../utils/whatsappHelper';
import { supabase } from '../../lib/supabase';
import { useEffect, useState } from 'react';
import { formatNumber } from '../../utils/numberFormatter';

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  toothNumber?: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paid_amount: number;
  payment_status: string;
  payment_method: string | null;
  items: InvoiceItem[];
  doctor_id: string | null;
  patients: {
    full_name: string;
    full_name_ar: string | null;
    phone: string | null;
  } | null;
  doctor?: {
    full_name: string;
    full_name_ar: string | null;
  } | null;
}

interface InvoiceDetailsModalProps {
  invoice: Invoice;
  clinic: any;
  onClose: () => void;
}

export function InvoiceDetailsModal({ invoice, clinic, onClose }: InvoiceDetailsModalProps) {
  const { t, language } = useLanguage();
  const { currencySymbol } = useCurrency();
  const { profile } = useAuth();
  const [whatsappSettings, setWhatsappSettings] = useState<any>(null);

  useEffect(() => {
    loadWhatsAppSettings();
  }, [profile?.clinic_id]);

  const loadWhatsAppSettings = async () => {
    if (!profile?.clinic_id) return;
    try {
      const { data } = await supabase
        .from('whatsapp_settings')
        .select('enabled, invoice_notifications_enabled')
        .eq('clinic_id', profile.clinic_id)
        .maybeSingle();
      if (data) setWhatsappSettings(data);
    } catch (error) {
      console.error('Error loading WhatsApp settings:', error);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const invoiceData: InvoiceData = {
        invoiceNumber: invoice.invoice_number,
        invoiceDate: invoice.invoice_date,
        clinicName: clinic?.name || '',
        clinicNameAr: clinic?.name_ar,
        clinicAddress: clinic?.address,
        clinicPhone: clinic?.phone,
        clinicLogo: clinic?.logo_url,
        patientName: invoice.patients?.full_name || '',
        patientNameAr: invoice.patients?.full_name_ar || undefined,
        patientPhone: invoice.patients?.phone || undefined,
        doctorName: invoice.doctor?.full_name || undefined,
        doctorNameAr: invoice.doctor?.full_name_ar || undefined,
        items: invoice.items.map((item: any) => ({
          description: item.description || item.treatment_name || 'Treatment',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || item.unit_price || 0,
          total: (item.quantity || 1) * (item.unitPrice || item.unit_price || 0)
        })),
        subtotal: invoice.subtotal || 0,
        tax: invoice.tax || 0,
        discount: invoice.discount || 0,
        total: invoice.total || 0,
        paidAmount: invoice.paid_amount || 0,
        remainingAmount: (invoice.total || 0) - (invoice.paid_amount || 0)
      };

      if (profile?.clinic_id) {
        try {
          await generateCustomInvoicePDF(profile.clinic_id, invoiceData);
        } catch (error) {
          generateInvoicePDF(invoiceData);
        }
      } else {
        generateInvoicePDF(invoiceData);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const getPaymentStatusInfo = () => {
    switch (invoice.payment_status) {
      case 'paid':
        return {
          icon: CheckCircle,
          color: 'bg-green-100 text-green-800 border-green-300',
          label: t('paid_in_full')
        };
      case 'partial':
        return {
          icon: AlertCircle,
          color: 'bg-amber-100 text-amber-800 border-amber-300',
          label: t('partially_paid')
        };
      default:
        return {
          icon: XCircle,
          color: 'bg-red-100 text-red-800 border-red-300',
          label: t('unpaid')
        };
    }
  };

  const getPaymentMethodLabel = () => {
    switch (invoice.payment_method) {
      case 'cash':
        return t('payment_method_cash');
      case 'card':
        return t('payment_method_card');
      case 'transfer':
        return t('payment_method_transfer');
      default:
        return 'N/A';
    }
  };

  const statusInfo = getPaymentStatusInfo();
  const StatusIcon = statusInfo.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white sm:rounded-2xl shadow-2xl w-full h-full sm:h-auto sm:max-w-5xl sm:max-h-[95vh] overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-sky-600 to-blue-700 px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between text-white">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <FileText className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-2xl font-bold truncate">{t('invoice_details')}</h2>
              <p className="text-sky-100 text-xs sm:text-sm">{invoice.invoice_number}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {invoice.patients?.phone && whatsappSettings?.enabled && whatsappSettings?.invoice_notifications_enabled && (
              <button
                onClick={async () => {
                  const patientName = language === 'ar' && invoice.patients?.full_name_ar
                    ? invoice.patients.full_name_ar
                    : invoice.patients?.full_name || '';
                  const patientLang = (language as 'en' | 'ar' | 'ku') || 'en';
                  const message = await getInvoiceWhatsAppMessage(
                    patientName,
                    patientLang,
                    clinic?.name || 'Clinic',
                    invoice.invoice_number,
                    invoice.total,
                    invoice.paid_amount,
                    clinic?.currency || 'IQD'
                  );
                  openWhatsApp(invoice.patients.phone, message);
                }}
                className="p-2 hover:bg-green-600 bg-green-500 rounded-lg transition flex-shrink-0"
                title="Send via WhatsApp"
              >
                <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            )}
            <button
              onClick={handleDownloadPDF}
              className="p-2 hover:bg-white/20 rounded-lg transition flex-shrink-0"
              title="Download PDF"
            >
              <Download className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition flex-shrink-0"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl p-4 sm:p-5 border-2 border-sky-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-sky-600 rounded-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{t('patient_information')}</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600">{t('name')}</p>
                  <p className="text-base font-semibold text-gray-900">{invoice.patients?.full_name || 'N/A'}</p>
                  {invoice.patients?.full_name_ar && (
                    <p className="text-sm text-gray-700 mt-0.5">{invoice.patients.full_name_ar}</p>
                  )}
                </div>
                {invoice.patients?.phone && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4" />
                    <span className="text-sm">{invoice.patients.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {invoice.doctor && (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 sm:p-5 border-2 border-green-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-600 rounded-lg">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">{t('assigned_doctor')}</h3>
                </div>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-gray-600">{t('doctor_name')}</p>
                    <p className="text-base font-semibold text-gray-900">{invoice.doctor.full_name}</p>
                    {invoice.doctor.full_name_ar && (
                      <p className="text-sm text-gray-700 mt-0.5">{invoice.doctor.full_name_ar}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 sm:p-5 border-2 border-purple-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-purple-600 rounded-lg">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{t('invoice_information')}</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600">{t('date')}</p>
                  <p className="text-base font-semibold text-gray-900">
                    {new Date(invoice.invoice_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('invoice_number')}</p>
                  <p className="text-base font-mono font-semibold text-gray-900">{invoice.invoice_number}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 sm:px-6 py-3 border-b-2 border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">{t('treatment_details')}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">{t('description')}</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">{t('tooth')}</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">{t('quantity')}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">{t('price')}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">{t('total')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invoice.items.map((item: any, index) => {
                    const description = item.description || item.treatment_name || 'Treatment';
                    const quantity = item.quantity || 1;
                    const unitPrice = item.unitPrice || item.unit_price || 0;
                    const toothNumber = item.toothNumber || item.tooth_number;

                    return (
                      <tr key={index} className="hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm text-gray-900">{description}</td>
                        <td className="px-4 py-3 text-center">
                          {toothNumber ? (
                            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-500 text-white rounded-full text-xs font-bold">
                              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                                <path d="M8 1 C5 1, 3 3, 3 5 C3 7, 4 9, 8 11 C12 9, 13 7, 13 5 C13 3, 11 1, 8 1 Z" />
                              </svg>
                              #{toothNumber}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-semibold text-gray-900">{quantity}</td>
                        <td className="px-4 py-3 text-right text-sm text-gray-900">{formatNumber(unitPrice)} {currencySymbol}</td>
                        <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                          {formatNumber((quantity * unitPrice))} {currencySymbol}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-4 sm:p-5 border-2 border-emerald-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-emerald-600 rounded-lg">
                  <CreditCard className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{t('payment_details')}</h3>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-600">{t('payment_method')}</p>
                  <p className="text-base font-semibold text-gray-900">{getPaymentMethodLabel()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">{t('status')}</p>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold border-2 ${statusInfo.color} mt-1`}>
                    <StatusIcon className="w-4 h-4" />
                    <span>{statusInfo.label}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 sm:p-5 border-2 border-gray-300">
              <h3 className="text-lg font-bold text-gray-900 mb-4">{t('financial_summary')}</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{t('subtotal')}:</span>
                  <span className="font-semibold text-gray-900">{formatNumber((invoice.subtotal || 0))} {currencySymbol}</span>
                </div>
                {(invoice.discount || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('discount')}:</span>
                    <span className="font-semibold text-yellow-600">-{formatNumber(invoice.discount || 0)} {currencySymbol}</span>
                  </div>
                )}
                <div className="border-t-2 border-gray-300 pt-2 mt-2">
                  <div className="flex justify-between text-lg">
                    <span className="font-bold text-gray-900">{t('total')}:</span>
                    <span className="font-bold text-sky-600">{formatNumber((invoice.total || 0))} {currencySymbol}</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                  <span className="text-gray-600">{t('paid_amount')}:</span>
                  <span className="font-semibold text-green-600">{formatNumber((invoice.paid_amount || 0))} {currencySymbol}</span>
                </div>
                {((invoice.total || 0) - (invoice.paid_amount || 0)) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">{t('remaining_balance')}:</span>
                    <span className="font-semibold text-amber-600">
                      {formatNumber(((invoice.total || 0) - (invoice.paid_amount || 0)))} {currencySymbol}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-4 sm:px-6 py-4 flex flex-col sm:flex-row gap-3 border-t-2 border-gray-200">
          <button
            onClick={handleDownloadPDF}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl font-bold"
          >
            <Download className="w-5 h-5" />
            <span>{t('download_pdf')}</span>
          </button>
          <button
            onClick={onClose}
            className="flex-1 sm:flex-none px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition font-semibold"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  );
}
