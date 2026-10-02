// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { X, Plus, Trash2, Check } from 'lucide-react';
import { ToothSelector } from '../ToothSelector';
import { TreatmentSelector } from '../TreatmentSelector';
import { formatNumber } from '../../utils/numberFormatter';

interface NewInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

export function NewInvoiceModal({ isOpen, onClose, onSuccess }: NewInvoiceModalProps) {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [treatmentTypes, setTreatmentTypes] = useState<TreatmentType[]>([]);
  const [addItemStep, setAddItemStep] = useState<AddItemStep>('none');
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [newInvoice, setNewInvoice] = useState({
    patient_id: '',
    doctor_id: '',
    items: [] as InvoiceItem[],
    discount: 0,
    payment_method: 'cash',
    paid_amount: 0
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, profile]);

  const loadData = async () => {
    if (!profile?.clinic_id) return;

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

      const [patientsRes, treatmentTypesRes, doctorsRes] = await Promise.all([
        patientsQuery,
        supabase
          .from('treatment_types')
          .select('id, name, name_ar, cost')
          .eq('clinic_id', profile.clinic_id)
          .eq('is_active', true)
          .order('name', { ascending: true }),
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
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const calculateTotals = () => {
    const subtotal = newInvoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const total = subtotal - newInvoice.discount;
    return { subtotal, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adding invoice:', error);
      alert('Failed to create invoice');
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

  if (!isOpen) return null;

  return (
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
                onClose();
                setAddItemStep('none');
                setSelectedTooth(null);
              }}
              className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
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
                              <span className="font-bold text-gray-900">{item.unitPrice.toLocaleString()} IQD</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-600">Total: </span>
                              <span className="font-bold text-sky-600">{(item.quantity * item.unitPrice).toLocaleString()} IQD</span>
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
                      Discount (IQD)
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
                    <span className="font-bold text-gray-900">{subtotal.toLocaleString()} IQD</span>
                  </div>
                  {newInvoice.discount > 0 && (
                    <div className="flex justify-between text-base">
                      <span className="text-gray-700 font-medium">Discount:</span>
                      <span className="font-bold text-yellow-600">-{formatNumber(newInvoice.discount)} IQD</span>
                    </div>
                  )}
                  <div className="border-t-2 border-gray-300 pt-3"></div>
                  <div className="flex justify-between text-2xl">
                    <span className="text-gray-900 font-bold">Total:</span>
                    <span className="font-bold text-sky-600">{total.toLocaleString()} IQD</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNewInvoice({ ...newInvoice, paid_amount: total })}
                    className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 text-white rounded-xl transition-all shadow-lg hover:shadow-xl font-bold"
                  >
                    <Check className="w-5 h-5" />
                    <span>Pay Full Amount ({total.toLocaleString()} IQD)</span>
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paid Amount (IQD)
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
                        Remaining Balance: {(total - newInvoice.paid_amount).toLocaleString()} IQD
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
                      onClose();
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
  );
}
