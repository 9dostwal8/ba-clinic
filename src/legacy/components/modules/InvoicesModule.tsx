// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCurrency } from '../../hooks/useCurrency';
import { Plus, FileText, X, Trash2, Sparkles, Check, Search } from 'lucide-react';
import { generateInvoicePDF, InvoiceData } from '../../utils/pdfGenerator';
import { ToothSelector } from '../ToothSelector';
import { TreatmentSelector } from '../TreatmentSelector';
import { InvoiceDetailsModal } from './InvoiceDetailsModal';
import { formatNumber } from '../../utils/numberFormatter';

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
  items: any[];
  doctor_id: string | null;
  patients: { full_name: string; full_name_ar: string | null; phone: string | null } | null;
  doctor?: { full_name: string; full_name_ar: string | null } | null;
}

interface TreatmentType {
  id: string;
  name: string;
  name_ar: string;
  cost: number;
}

interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  treatment_type_id: string;
  toothNumber?: number;
}

type AddItemStep = 'tooth' | 'treatment' | 'none';

export function InvoicesModule() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const { currencySymbol } = useCurrency();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [treatmentTypes, setTreatmentTypes] = useState<TreatmentType[]>([]);
  const [clinic, setClinic] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [addItemStep, setAddItemStep] = useState<AddItemStep>('none');
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [initialLoad, setInitialLoad] = useState(true);
  const [newInvoice, setNewInvoice] = useState({
    patient_id: '',
    doctor_id: '',
    items: [] as InvoiceItem[],
    discount: 0,
    payment_method: 'cash',
    paid_amount: 0
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setHasSearched(true);
    setInitialLoad(false);
    await searchInvoices();
  };

  const searchInvoices = async () => {
    if (!profile?.clinic_id || !profile?.id) return;

    try {
      let invoicesQuery = supabase
        .from('invoices')
        .select('*, patients(full_name, full_name_ar, phone), doctor:doctor_id(full_name, full_name_ar)')
        .eq('clinic_id', profile.clinic_id)
        .order('invoice_date', { ascending: false });

      if (profile.role === 'doctor') {
        const { data: perms } = await supabase
          .from('staff_permissions')
          .select('view_all_invoices')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (perms && perms.view_all_invoices === false) {
          invoicesQuery = invoicesQuery.eq('doctor_id', profile.id);
        }
      }

      const { data: allInvoices, error } = await invoicesQuery;

      if (error) throw error;

      const query = searchQuery.toLowerCase().trim();
      const filtered = (allInvoices || []).filter(invoice => {
        const patientName = invoice.patients?.full_name?.toLowerCase() || '';
        const patientNameAr = invoice.patients?.full_name_ar?.toLowerCase() || '';
        const patientPhone = invoice.patients?.phone || '';
        const invoiceDate = new Date(invoice.invoice_date).toLocaleDateString();
        const invoiceNumber = invoice.invoice_number.toLowerCase();

        return (
          patientName.includes(query) ||
          patientNameAr.includes(query) ||
          patientPhone.includes(query) ||
          invoiceDate.includes(query) ||
          invoiceNumber.includes(query)
        );
      });

      setFilteredInvoices(filtered);
    } catch (error) {
      console.error('Error searching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    if (!profile?.clinic_id || !profile?.id) return;

    try {
      let patientsQuery = supabase
        .from('patients')
        .select('id, full_name, patient_number')
        .eq('clinic_id', profile.clinic_id);

      if (profile.role === 'doctor') {
        const { data: perms } = await supabase
          .from('staff_permissions')
          .select('view_all_patients')
          .eq('user_id', profile.id)
          .maybeSingle();

        if (perms && perms.view_all_patients === false) {
          patientsQuery = patientsQuery.eq('assigned_doctor_id', profile.id);
        }
      }

      const patientsRes = await patientsQuery;

      const [treatmentTypesRes, clinicRes, doctorsRes] = await Promise.all([
        supabase
          .from('treatment_types')
          .select('id, name, name_ar, cost')
          .eq('clinic_id', profile.clinic_id)
          .eq('is_active', true)
          .order('name', { ascending: true }),

        supabase
          .from('clinics')
          .select('*')
          .eq('id', profile.clinic_id)
          .single(),

        supabase
          .from('users')
          .select('id, full_name, full_name_ar')
          .eq('clinic_id', profile.clinic_id)
          .eq('role', 'doctor')
          .eq('is_active', true)
          .order('full_name', { ascending: true })
      ]);

      setPatients(patientsRes.data || []);
      setTreatmentTypes(treatmentTypesRes.data || []);
      setDoctors(doctorsRes.data || []);
      setClinic(clinicRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  useEffect(() => {
    if (profile?.clinic_id) {
      loadData();
    }
  }, [profile?.clinic_id]);

  const calculateTotals = () => {
    const subtotal = newInvoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const total = subtotal - newInvoice.discount;
    return { subtotal, total };
  };

  const handleAddInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.clinic_id || !profile?.id) return;

    try {
      const { subtotal, total } = calculateTotals();
      const invoiceNumber = `INV${Date.now()}`;

      const paymentStatus =
        newInvoice.paid_amount >= total ? 'paid' :
        newInvoice.paid_amount > 0 ? 'partial' : 'unpaid';

      let doctorId = newInvoice.doctor_id || null;
      if (profile.role === 'doctor') {
        doctorId = profile.id;
      }

      const { error } = await supabase.from('invoices').insert({
        clinic_id: profile.clinic_id,
        patient_id: newInvoice.patient_id,
        invoice_number: invoiceNumber,
        items: newInvoice.items,
        subtotal,
        tax: 0,
        discount: newInvoice.discount,
        total,
        paid_amount: newInvoice.paid_amount,
        payment_status: paymentStatus,
        payment_method: newInvoice.payment_method,
        doctor_id: doctorId,
        created_by: profile.id
      });

      if (error) throw error;

      setShowAddModal(false);
      setNewInvoice({
        patient_id: '',
        doctor_id: '',
        items: [],
        discount: 0,
        payment_method: 'cash',
        paid_amount: 0
      });
      setAddItemStep('none');
      setSelectedTooth(null);
      setSearchQuery('');
      setHasSearched(false);
      setInitialLoad(true);
      setFilteredInvoices([]);
    } catch (error) {
      console.error('Error adding invoice:', error);
    }
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    try {
      if (!clinic) {
        alert('Clinic information is not available. Please refresh the page.');
        return;
      }

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

      generateInvoicePDF(invoiceData);
    } catch (error) {
      console.error('Error in handlePrintInvoice:', error);
      alert('Failed to generate invoice. Please try again.');
    }
  };

  const startAddingItem = () => {
    setSelectedTooth(null);
    setAddItemStep('tooth');
  };

  const handleToothSelect = (toothNumber: number) => {
    setSelectedTooth(toothNumber);
    setAddItemStep('treatment');
  };

  const handleTreatmentSelect = (treatment: TreatmentType) => {
    const newItem: InvoiceItem = {
      description: treatment.name + (treatment.name_ar ? ` (${treatment.name_ar})` : ''),
      quantity: 1,
      unitPrice: parseFloat(treatment.cost.toString()),
      treatment_type_id: treatment.id,
      toothNumber: selectedTooth || undefined
    };

    setNewInvoice({
      ...newInvoice,
      items: [...newInvoice.items, newItem]
    });

    setAddItemStep('none');
    setSelectedTooth(null);
  };

  const updateItemQuantity = (index: number, quantity: number) => {
    const items = [...newInvoice.items];
    items[index] = { ...items[index], quantity };
    setNewInvoice({ ...newInvoice, items });
  };

  const removeItem = (index: number) => {
    const items = newInvoice.items.filter((_, i) => i !== index);
    setNewInvoice({ ...newInvoice, items });
  };

  const { subtotal, total } = calculateTotals();

  if (loading) return <div className="text-center py-12">Loading invoices...</div>;

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t('invoices')}</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white px-6 py-3 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
        >
          <Sparkles className="w-5 h-5" />
          <span className="font-semibold">{t('create_invoice')}</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={t('search_by_name_phone_date') || 'Search by name, phone, or date...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !searchQuery.trim()}
            className="px-6 py-3 bg-sky-600 hover:bg-sky-700 text-white rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed font-medium whitespace-nowrap"
          >
            {loading ? t('searching') : t('search')}
          </button>
        </div>
      </div>

      {!hasSearched && filteredInvoices.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('searchForInvoices')}</h3>
          <p className="text-gray-600">{t('enterSearchTermToFindInvoices')}</p>
        </div>
      )}

      {hasSearched && filteredInvoices.length === 0 && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-gray-400 mb-2 text-5xl">🔍</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">{t('noResultsFound')}</h3>
          <p className="text-gray-600">{t('tryDifferentSearchTerm')}</p>
        </div>
      )}

      {filteredInvoices.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Invoice #
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Patient
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Total ({currencySymbol})
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Paid ({currencySymbol})
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="hover:bg-sky-50 transition cursor-pointer"
                  onClick={() => setSelectedInvoice(invoice)}
                >
                  <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-gray-900">
                    {invoice.invoice_number}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(invoice.invoice_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {invoice.patients?.full_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.paid_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        invoice.payment_status === 'paid'
                          ? 'bg-green-100 text-green-800'
                          : invoice.payment_status === 'partial'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {invoice.payment_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrintInvoice(invoice);
                      }}
                      className="p-2 text-sky-600 hover:bg-sky-100 rounded-lg transition"
                      title="Download PDF"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden divide-y divide-gray-200">
          {filteredInvoices.map((invoice) => (
            <div
              key={invoice.id}
              className="p-4 hover:bg-sky-50 cursor-pointer transition"
              onClick={() => setSelectedInvoice(invoice)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-900 mb-1">
                    {invoice.patients?.full_name}
                  </div>
                  <div className="text-xs font-mono text-gray-500">
                    {invoice.invoice_number}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(invoice.invoice_date).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex flex-col items-end space-y-2 ml-3">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      invoice.payment_status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : invoice.payment_status === 'partial'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {invoice.payment_status}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrintInvoice(invoice);
                    }}
                    className="p-2 text-sky-600 hover:bg-sky-100 rounded-lg transition"
                  >
                    <FileText className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-500">Total:</span>
                  <div className="text-gray-900 font-semibold">
                    {formatNumber(invoice.total)} {currencySymbol}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Paid:</span>
                  <div className="text-gray-900 font-semibold">
                    {formatNumber(invoice.paid_amount)} {currencySymbol}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-y-auto">
              <div className="sticky top-0 bg-gradient-to-r from-sky-600 to-blue-600 px-6 py-5 flex items-center justify-between z-10 rounded-t-2xl">
                <div>
                  <h2 className="text-2xl font-bold text-white">{t('create_new_invoice')}</h2>
                  <p className="text-sky-100 text-sm mt-1">{t('add_treatments_manage_billing')}</p>
                </div>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setAddItemStep('none');
                    setSelectedTooth(null);
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleAddInvoice} className="p-6 space-y-6">
                <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-xl p-5 border-2 border-sky-200">
                  <label className="block text-sm font-bold text-gray-900 mb-3">
                    Select Patient *
                  </label>
                  <select
                    required
                    value={newInvoice.patient_id}
                    onChange={(e) => setNewInvoice({ ...newInvoice, patient_id: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-sky-300 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white text-lg font-medium"
                  >
                    <option value="">Choose a patient...</option>
                    {patients.map((patient) => (
                      <option key={patient.id} value={patient.id}>
                        {patient.full_name} ({patient.patient_number})
                      </option>
                    ))}
                  </select>
                </div>

                {profile?.role !== 'doctor' && (
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-200">
                    <label className="block text-sm font-bold text-gray-900 mb-3">
                      {t('assign_to_doctor')} (Optional)
                    </label>
                    <select
                      value={newInvoice.doctor_id}
                      onChange={(e) => setNewInvoice({ ...newInvoice, doctor_id: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-green-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-lg font-medium"
                    >
                      <option value="">{t('no_doctor_assigned')}</option>
                      {doctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {language === 'ar' && doctor.full_name_ar ? doctor.full_name_ar : doctor.full_name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-600 mt-2">
                      {t('doctor_commission_note')}
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">{t('invoice_items')}</h3>
                    <span className="px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-sm font-semibold">
                      {newInvoice.items.length} {newInvoice.items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>

                  {newInvoice.items.length > 0 && (
                    <div className="space-y-3">
                      {newInvoice.items.map((item, index) => (
                        <div key={index} className="bg-gradient-to-r from-white to-gray-50 border-2 border-gray-200 rounded-xl p-4 hover:shadow-md transition-all">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {item.toothNumber && (
                                  <div className="flex items-center gap-2 px-3 py-1 bg-sky-500 text-white rounded-full text-sm font-bold">
                                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                                      <path d="M8 1 C5 1, 3 3, 3 5 C3 7, 4 9, 8 11 C12 9, 13 7, 13 5 C13 3, 11 1, 8 1 Z" />
                                    </svg>
                                    #{item.toothNumber}
                                  </div>
                                )}
                                <h4 className="font-bold text-gray-900">{item.description}</h4>
                              </div>
                              <div className="flex items-center gap-4 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <label className="text-sm text-gray-600 font-medium">Qty:</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => updateItemQuantity(index, parseInt(e.target.value) || 1)}
                                    className="w-20 px-3 py-1 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-center font-semibold"
                                  />
                                </div>
                                <div className="text-sm">
                                  <span className="text-gray-600">Price: </span>
                                  <span className="font-bold text-gray-900">{formatNumber(item.unitPrice)} {currencySymbol}</span>
                                </div>
                                <div className="text-sm">
                                  <span className="text-gray-600">Total: </span>
                                  <span className="font-bold text-sky-600">{(item.quantity * item.unitPrice).toLocaleString()} {currencySymbol}</span>
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(index)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {addItemStep === 'none' && (
                    <button
                      type="button"
                      onClick={startAddingItem}
                      className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-xl transition-all shadow-lg hover:shadow-xl font-bold text-lg group"
                    >
                      <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
                      <span>{t('add_treatment_item')}</span>
                    </button>
                  )}

                  {addItemStep === 'tooth' && (
                    <div className="space-y-4">
                      <ToothSelector
                        onSelect={handleToothSelect}
                        selectedTooth={selectedTooth}
                      />
                      <button
                        type="button"
                        onClick={() => setAddItemStep('none')}
                        className="w-full px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  {addItemStep === 'treatment' && selectedTooth && (
                    <div className="space-y-4">
                      <TreatmentSelector
                        treatments={treatmentTypes}
                        onSelect={handleTreatmentSelect}
                        toothNumber={selectedTooth}
                        language={language}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setAddItemStep('tooth');
                          setSelectedTooth(null);
                        }}
                        className="w-full px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                      >
                        Back to Tooth Selection
                      </button>
                    </div>
                  )}
                </div>

                {newInvoice.items.length > 0 && addItemStep === 'none' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Discount ({currencySymbol})
                        </label>
                        <input
                          type="number"
                          value={newInvoice.discount}
                          onChange={(e) => setNewInvoice({ ...newInvoice, discount: parseFloat(e.target.value) || 0 })}
                          min="0"
                          step="0.01"
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Method
                        </label>
                        <select
                          value={newInvoice.payment_method}
                          onChange={(e) => setNewInvoice({ ...newInvoice, payment_method: e.target.value })}
                          className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500"
                        >
                          <option value="cash">{t('payment_method_cash')}</option>
                          <option value="card">{t('payment_method_card')}</option>
                          <option value="transfer">{t('payment_method_transfer')}</option>
                        </select>
                      </div>
                    </div>

                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl border-2 border-gray-200 space-y-3">
                      <div className="flex justify-between text-base">
                        <span className="text-gray-700 font-medium">Subtotal:</span>
                        <span className="font-bold text-gray-900">{formatNumber(subtotal)} {currencySymbol}</span>
                      </div>
                      {newInvoice.discount > 0 && (
                        <div className="flex justify-between text-base">
                          <span className="text-gray-700 font-medium">Discount:</span>
                          <span className="font-bold text-yellow-600">-{formatNumber(newInvoice.discount)} {currencySymbol}</span>
                        </div>
                      )}
                      <div className="border-t-2 border-gray-300 pt-3"></div>
                      <div className="flex justify-between text-2xl">
                        <span className="text-gray-900 font-bold">Total:</span>
                        <span className="font-bold text-sky-600">{formatNumber(total)} {currencySymbol}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewInvoice({ ...newInvoice, paid_amount: total })}
                        className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-xl transition-all shadow-lg hover:shadow-xl font-bold"
                      >
                        <Check className="w-5 h-5" />
                        <span>Pay Full Amount ({formatNumber(total)} {currencySymbol})</span>
                      </button>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Paid Amount ({currencySymbol})
                      </label>
                      <input
                        type="number"
                        value={newInvoice.paid_amount}
                        onChange={(e) => setNewInvoice({ ...newInvoice, paid_amount: parseFloat(e.target.value) || 0 })}
                        min="0"
                        max={total}
                        step="0.01"
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-lg font-semibold"
                      />
                      {newInvoice.paid_amount < total && total > 0 && (
                        <div className="mt-3 p-3 bg-amber-50 border-2 border-amber-200 rounded-lg">
                          <p className="text-amber-800 font-semibold">
                            Remaining Balance: {(total - newInvoice.paid_amount).toLocaleString()} {currencySymbol}
                          </p>
                        </div>
                      )}
                      {newInvoice.paid_amount >= total && total > 0 && (
                        <div className="mt-3 p-3 bg-green-50 border-2 border-green-200 rounded-lg flex items-center gap-2">
                          <Check className="w-5 h-5 text-green-600" />
                          <p className="text-green-800 font-semibold">
                            Paid in Full
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 pt-4 border-t-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddModal(false);
                          setAddItemStep('none');
                          setSelectedTooth(null);
                        }}
                        className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white rounded-xl transition-all shadow-lg hover:shadow-xl font-bold text-lg"
                      >
                        <Check className="w-5 h-5" />
                        <span>{t('create_invoice')}</span>
                      </button>
                    </div>
                  </>
                )}
              </form>
            </div>
          </div>
        </div>
      )}

      {selectedInvoice && clinic && (
        <InvoiceDetailsModal
          invoice={selectedInvoice}
          clinic={clinic}
          onClose={() => setSelectedInvoice(null)}
        />
      )}
    </div>
  );
}
