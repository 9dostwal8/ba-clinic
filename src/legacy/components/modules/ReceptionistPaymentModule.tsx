// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { DollarSign, Search, Calendar, User, FileText, Download, CheckCircle, Clock, Eye, X, CreditCard, Wallet, Receipt, AlertCircle, TrendingUp, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCurrency } from '../../hooks/useCurrency';
import { generateInvoicePDF } from '../../utils/pdfGenerator';
import { generateCustomInvoicePDF, getCustomTemplate } from '../../utils/customTemplateRenderer';
import { formatNumber } from '../../utils/numberFormatter';
import { buildReceiptData, printReceipt, type ReceiptData } from '../../utils/paymentReceipt';


interface Invoice {
  id: string;
  invoice_number: string;
  patient_id: string;
  doctor_id: string;
  invoice_date: string;
  total: number;
  paid_amount: number;
  payment_status: string;
  payment_method?: string;
  notes?: string;
  patient?: {
    full_name: string;
    full_name_ar?: string;
    phone: string;
  } | null;
  doctor?: {
    full_name: string;
    full_name_ar?: string;
  } | null;
  items: Array<{
    description: string;
    quantity: number;
    unitprice: number;
    total: number;
  }>;
}

interface TreatmentVisit {
  id: string;
  treatment_plan_id: string;
  visit_number: number;
  visit_date: string;
  visit_cost: number;
  payment_received: number;
  status: string;
  procedure_performed?: string;
  notes?: string;
  patient_id: string;
  doctor_id: string;
  invoice_id?: string | null;
  payment_collected_by?: string | null;
  payment_collected_at?: string | null;
  payment_locked?: boolean;
  patient: {
    full_name: string;
    full_name_ar?: string;
    phone: string;
  };
  doctor: {
    full_name: string;
    full_name_ar?: string;
  };
  treatment_plan: {
    treatment_category: string;
    total_cost: number;
    treatment_types?: {
      id: string;
      name: string;
      name_ar: string | null;
    };
  } | null;
}

interface DashboardStats {
  todayRevenue: number;
  pendingAmount: number;
  todayPayments: number;
  unpaidVisits: number;
}

export function ReceptionistPaymentModule() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const { currencySymbol } = useCurrency();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [visits, setVisits] = useState<TreatmentVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('today');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid' | 'partial'>('all');
  const [selectedTab, setSelectedTab] = useState<'quick-collect' | 'invoices'>('quick-collect');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<TreatmentVisit | null>(null);
  const [payInvoice, setPayInvoice] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [stats, setStats] = useState<DashboardStats>({
    todayRevenue: 0,
    pendingAmount: 0,
    todayPayments: 0,
    unpaidVisits: 0
  });

  useEffect(() => {
    if (profile?.clinic_id) {
      loadData();
    }
  }, [profile?.clinic_id, dateFilter, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      let startDate = todayStr;
      if (dateFilter === 'week') {
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString();
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        startDate = monthAgo.toISOString();
      }

      let invoiceQuery = supabase
        .from('invoices')
        .select(`
          *,
          patient:patients(full_name, full_name_ar, phone),
          doctor:users!invoices_doctor_id_fkey(full_name, full_name_ar)
        `)
        .eq('clinic_id', profile.clinic_id)
        .order('invoice_date', { ascending: false });

      if (dateFilter !== 'all') {
        invoiceQuery = invoiceQuery.gte('invoice_date', startDate);
      }

      if (statusFilter !== 'all') {
        invoiceQuery = invoiceQuery.eq('payment_status', statusFilter);
      }

      const { data: invoiceData, error: invoiceError } = await invoiceQuery;

      if (invoiceError) throw invoiceError;

      const processedInvoices = (invoiceData || []).map(inv => ({
        ...inv,
        items: typeof inv.items === 'string'
          ? JSON.parse(inv.items)
          : inv.items
      }));

      setInvoices(processedInvoices);

      let visitsQuery = supabase
        .from('treatment_visits')
        .select(`
          *,
          patient:patients(full_name, full_name_ar, phone),
          doctor:users!treatment_visits_doctor_id_fkey(full_name, full_name_ar),
          treatment_plan:treatment_plans(
            treatment_category,
            total_cost,
            treatment_types(id, name, name_ar)
          )
        `)
        .eq('clinic_id', profile.clinic_id)
        .order('visit_date', { ascending: false });

      if (dateFilter !== 'all') {
        visitsQuery = visitsQuery.gte('visit_date', startDate);
      }

      const { data: visitsData, error: visitsError } = await visitsQuery;

      if (visitsError) throw visitsError;

      setVisits(visitsData || []);

      const todayInvoices = processedInvoices.filter(inv =>
        new Date(inv.invoice_date).toDateString() === today.toDateString()
      );

      // Calculate today's revenue from payment transactions
      const { data: todayTransactions } = await supabase
        .from('payment_transactions')
        .select('amount')
        .eq('clinic_id', profile.clinic_id)
        .gte('collected_at', todayStr);

      const todayRevenue = (todayTransactions || []).reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);
      const todayPayments = (todayTransactions || []).length;

      const pendingAmount = processedInvoices
        .filter(inv => inv.payment_status !== 'paid')
        .reduce((sum, inv) => sum + (inv.total - inv.paid_amount), 0);
      const unpaidVisits = (visitsData || []).filter(v =>
        v.payment_received < v.visit_cost
      ).length;

      setStats({
        todayRevenue,
        pendingAmount,
        todayPayments,
        unpaidVisits
      });

    } catch (error: any) {
      console.error('Error loading data:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPayment = async (visit: TreatmentVisit) => {
    setSelectedVisit(visit);
    const remaining = visit.visit_cost - visit.payment_received;
    setPaymentAmount(remaining.toString());
    setShowPaymentModal(true);
  };

  const recordPayment = async () => {
    if (!selectedVisit || !paymentAmount) return;

    try {
      const amount = parseFloat(paymentAmount);
      if (isNaN(amount) || amount <= 0) {
        alert(language === 'ar' ? 'الرجاء إدخال مبلغ صحيح' : 'Please enter a valid amount');
        return;
      }

      const newPaymentReceived = selectedVisit.payment_received + amount;
      const newVisitStatus = newPaymentReceived >= selectedVisit.visit_cost ? 'completed' : 'partial';
      const newInvoiceStatus = newPaymentReceived >= selectedVisit.visit_cost ? 'paid' : 'partial';

      let invoiceId = selectedVisit.invoice_id;

      if (!invoiceId) {
        const { data: allInvoices } = await supabase
          .from('invoices')
          .select('invoice_number')
          .eq('clinic_id', profile.clinic_id)
          .order('created_at', { ascending: false });

        let maxNumber = 0;
        if (allInvoices && allInvoices.length > 0) {
          allInvoices.forEach(inv => {
            const parts = inv.invoice_number.split('-');
            if (parts.length >= 2) {
              const num = parseInt(parts[1]);
              if (!isNaN(num) && num > maxNumber) {
                maxNumber = num;
              }
            }
          });
        }

        const newInvoiceNumber = `INV-${String(maxNumber + 1).padStart(6, '0')}`;
        console.log('Generated invoice number:', newInvoiceNumber);

        // Use treatment type name for invoice description
        let treatmentName = 'Treatment';
        if (selectedVisit.treatment_plan?.treatment_types) {
          const treatmentType = selectedVisit.treatment_plan.treatment_types;
          treatmentName = language === 'ar' && treatmentType.name_ar
            ? treatmentType.name_ar
            : treatmentType.name;
        } else if (selectedVisit.procedure_performed) {
          treatmentName = selectedVisit.procedure_performed;
        }

        const invoiceItems = [{
          description: `${treatmentName} - V${selectedVisit.visit_number}`,
          quantity: 1,
          unitPrice: selectedVisit.visit_cost,
          total: selectedVisit.visit_cost
        }];

        const { data: invoiceData, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            clinic_id: profile.clinic_id,
            invoice_number: newInvoiceNumber,
            patient_id: selectedVisit.patient_id,
            doctor_id: selectedVisit.doctor_id,
            invoice_date: new Date().toISOString(),
            total: selectedVisit.visit_cost,
            paid_amount: amount,
            payment_status: newInvoiceStatus,
            payment_method: paymentMethod,
            items: JSON.stringify(invoiceItems)
          })
          .select()
          .single();

        if (invoiceError) throw invoiceError;
        invoiceId = invoiceData.id;
      } else {
        const invoice = invoices.find(inv => inv.id === invoiceId);
        if (invoice) {
          const newPaidAmount = invoice.paid_amount + amount;
          const newInvoiceStatus = newPaidAmount >= invoice.total ? 'paid' : 'partial';

          const { error: invoiceUpdateError } = await supabase
            .from('invoices')
            .update({
              paid_amount: newPaidAmount,
              payment_status: newInvoiceStatus,
              payment_method: paymentMethod
            })
            .eq('id', invoiceId);

          if (invoiceUpdateError) throw invoiceUpdateError;
        }
      }

      console.log('Updating treatment visit:', {
        id: selectedVisit.id,
        newPaymentReceived,
        newVisitStatus,
        invoiceId,
        payment_locked: newVisitStatus === 'completed'
      });

      const { data: updateData, error: updateError } = await supabase
        .from('treatment_visits')
        .update({
          payment_received: newPaymentReceived,
          status: newVisitStatus,
          invoice_id: invoiceId,
          payment_collected_by: profile.id,
          payment_collected_at: new Date().toISOString(),
          payment_locked: newVisitStatus === 'completed'
        })
        .eq('id', selectedVisit.id)
        .select();

      console.log('Update result:', { data: updateData, error: updateError });

      if (updateError) throw updateError;

      // Create payment transaction record
      const { error: transactionError } = await supabase
        .from('payment_transactions')
        .insert({
          clinic_id: profile.clinic_id,
          invoice_id: invoiceId,
          visit_id: selectedVisit.id,
          patient_id: selectedVisit.patient_id,
          amount: amount,
          payment_method: paymentMethod,
          collected_by: profile.id,
          collected_at: new Date().toISOString()
        });

      if (transactionError) {
        console.error('Error creating payment transaction:', transactionError);
        // Don't fail the whole operation if transaction logging fails
      }

      const visitTotal = Number(selectedVisit.visit_cost || 0);
      const receiptData = await buildReceiptData({
        clinicId: profile.clinic_id,
        patientId: selectedVisit.patient_id,
        patientName: selectedVisit.patient?.full_name || '',
        patientPhone: selectedVisit.patient?.phone,
        doctorName: selectedVisit.doctor?.full_name,
        amountPaid: amount,
        paymentMethod,
        total: visitTotal,
        previouslyPaid: Number(selectedVisit.payment_received || 0),
        remaining: Math.max(0, visitTotal - newPaymentReceived),
        collectedBy: profile?.full_name || '',
        currencySymbol,
        treatmentPlanId: selectedVisit.treatment_plan_id,
        visitLines: [
          { label: 'Visit', value: `#${selectedVisit.visit_number}` },
          {
            label: 'Treatment',
            value:
              selectedVisit.treatment_plan?.treatment_types?.name ||
              selectedVisit.treatment_plan?.treatment_category ||
              selectedVisit.procedure_performed ||
              'Treatment',
          },
          { label: 'Visit date', value: new Date(selectedVisit.visit_date).toLocaleString() },
          ...(selectedVisit.procedure_performed
            ? [{ label: 'Work done', value: selectedVisit.procedure_performed }]
            : []),
          ...(selectedVisit.notes ? [{ label: 'Notes', value: selectedVisit.notes }] : []),
        ],
      });
      setReceipt(receiptData);
      setShowPaymentModal(false);
      setSelectedVisit(null);
      setPaymentAmount('');
      await loadData();

    } catch (error: any) {
      console.error('Error recording payment:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const openInvoicePayment = (invoice: Invoice) => {
    const remaining = Number(invoice.total || 0) - Number(invoice.paid_amount || 0);
    setPayInvoice(invoice);
    setPaymentAmount(remaining > 0 ? remaining.toFixed(2) : '');
  };

  const recordInvoicePayment = async () => {
    if (!payInvoice) return;
    const amount = parseFloat(paymentAmount);
    const total = Number(payInvoice.total || 0);
    const alreadyPaid = Number(payInvoice.paid_amount || 0);
    const remaining = total - alreadyPaid;

    if (isNaN(amount) || amount <= 0) {
      alert(language === 'ar' ? 'الرجاء إدخال مبلغ صحيح' : 'Please enter a valid amount');
      return;
    }
    if (amount > remaining + 0.001) {
      alert(
        language === 'ar'
          ? `المبلغ أكبر من المتبقي (${remaining.toFixed(2)})`
          : `Amount is more than the remaining balance (${remaining.toFixed(2)})`
      );
      return;
    }

    try {
      setSaving(true);
      const newPaid = alreadyPaid + amount;
      const newStatus = newPaid >= total - 0.001 ? 'paid' : 'partial';

      const { error: updateError } = await supabase
        .from('invoices')
        .update({
          paid_amount: newPaid,
          payment_status: newStatus,
          payment_method: paymentMethod,
        })
        .eq('id', payInvoice.id);

      if (updateError) throw updateError;

      const { error: txError } = await supabase.from('payment_transactions').insert({
        clinic_id: profile.clinic_id,
        invoice_id: payInvoice.id,
        patient_id: payInvoice.patient_id,
        amount,
        payment_method: paymentMethod,
        collected_by: profile.id,
        collected_at: new Date().toISOString(),
      });

      if (txError) throw txError;

      const items = Array.isArray(payInvoice.items)
        ? payInvoice.items
        : typeof payInvoice.items === 'string'
          ? (() => { try { return JSON.parse(payInvoice.items); } catch { return []; } })()
          : [];

      const receiptData = await buildReceiptData({
        clinicId: profile.clinic_id,
        patientId: payInvoice.patient_id,
        patientName: payInvoice.patient?.full_name || '',
        patientPhone: payInvoice.patient?.phone,
        doctorName: payInvoice.doctor?.full_name,
        amountPaid: amount,
        paymentMethod,
        invoiceNumber: payInvoice.invoice_number,
        total,
        previouslyPaid: alreadyPaid,
        remaining: Math.max(0, total - newPaid),
        collectedBy: profile?.full_name || '',
        currencySymbol,
        visitLines: (items || []).map((it: any, i: number) => ({
          label: `Item ${i + 1}`,
          value: `${it.description || ''} × ${it.quantity || 1} — ${currencySymbol}${Number(it.total || 0).toFixed(2)}`,
        })),
      });
      setReceipt(receiptData);
      setPayInvoice(null);
      setPaymentAmount('');
      await loadData();

    } catch (error: any) {
      console.error('Error recording invoice payment:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadInvoice = async (invoice: Invoice) => {
    try {
      const { data: clinicData } = await supabase
        .from('clinics')
        .select('name, name_ar, address, phone, logo_url')
        .eq('id', profile.clinic_id)
        .single();

      const items = Array.isArray(invoice.items)
        ? invoice.items
        : typeof invoice.items === 'string'
          ? JSON.parse(invoice.items)
          : [];

      const parsedItems = items.map((item: any) => ({
        description: item.description || '',
        quantity: item.quantity || 1,
        unitPrice: item.unitPrice || item.unitprice || 0,
        total: item.total || 0
      }));

      const invoiceData = {
        invoiceNumber: invoice.invoice_number,
        invoiceDate: invoice.invoice_date,
        clinicName: clinicData?.name || '',
        clinicNameAr: clinicData?.name_ar || '',
        clinicAddress: clinicData?.address || '',
        clinicPhone: clinicData?.phone || '',
        clinicLogo: clinicData?.logo_url || '',
        patientName: invoice.patient?.full_name || '',
        patientNameAr: invoice.patient?.full_name_ar || '',
        patientPhone: invoice.patient?.phone || '',
        doctorName: invoice.doctor?.full_name || '',
        doctorNameAr: invoice.doctor?.full_name_ar || '',
        items: parsedItems,
        subtotal: invoice.total,
        tax: 0,
        discount: 0,
        total: invoice.total,
        paidAmount: invoice.paid_amount,
        remainingAmount: invoice.total - invoice.paid_amount
      };

      const template = await getCustomTemplate(profile.clinic_id, 'invoice');

      if (template) {
        await generateCustomInvoicePDF(profile.clinic_id, invoiceData);
      } else {
        await generateInvoicePDF(invoiceData);
      }
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      alert(`Error: ${error.message}`);
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    const patientName = language === 'ar' && invoice.patient?.full_name_ar
      ? invoice.patient.full_name_ar
      : invoice.patient?.full_name || '';
    const matchesSearch = patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const filteredVisits = visits.filter(visit => {
    const patientName = language === 'ar' && visit.patient?.full_name_ar
      ? visit.patient.full_name_ar
      : visit.patient?.full_name || '';
    const matchesSearch = patientName.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'paid') return visit.payment_received >= visit.visit_cost && matchesSearch;
    if (statusFilter === 'unpaid') return visit.payment_received === 0 && matchesSearch;
    if (statusFilter === 'partial') return visit.payment_received > 0 && visit.payment_received < visit.visit_cost && matchesSearch;

    return matchesSearch;
  });

  // Invoices that still have money to collect (quick collect list)
  const openInvoices = filteredInvoices.filter(
    (inv) => Number(inv.total || 0) - Number(inv.paid_amount || 0) > 0.001
  );


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800 border-green-300';
      case 'unpaid': return 'bg-red-100 text-red-800 border-red-300';
      case 'partial': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />;
      case 'unpaid': return <AlertCircle className="w-4 h-4" />;
      case 'partial': return <Clock className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  const ar = language === 'ar';
  const statusLabel = (s: string) =>
    s === 'paid' ? (ar ? 'مدفوع' : 'Paid') : s === 'partial' ? (ar ? 'جزئي' : 'Partial') : ar ? 'غير مدفوع' : 'Unpaid';
  const statusPill = (s: string) =>
    s === 'paid'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : s === 'partial'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-rose-50 text-rose-700 border-rose-200';

  const kpis = [
    { key: 'rev', label: ar ? 'إيرادات اليوم' : "Today's revenue", value: `${formatNumber(stats.todayRevenue)} ${currencySymbol}`, icon: TrendingUp, tone: 'text-lime-300' },
    { key: 'pend', label: ar ? 'المبالغ المعلقة' : 'Pending', value: `${formatNumber(stats.pendingAmount)} ${currencySymbol}`, icon: Clock, tone: 'text-amber-300' },
    { key: 'pay', label: ar ? 'دفعات اليوم' : "Today's payments", value: String(stats.todayPayments), icon: Receipt, tone: 'text-sky-300' },
    { key: 'unpaid', label: ar ? 'زيارات غير مدفوعة' : 'Unpaid visits', value: String(stats.unpaidVisits), icon: AlertCircle, tone: 'text-rose-300' },
  ];

  const collectCount = openInvoices.length + filteredVisits.filter((v) => v.visit_cost - v.payment_received > 0 && !v.payment_locked).length;

  return (
    <div className="pb-24 sm:pb-6">
      {/* Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 mb-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-900 text-lime-300 shadow-lift">
            <Wallet className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate font-display text-xl font-bold text-gray-900 sm:text-2xl">
              {ar ? 'المدفوعات والفواتير' : 'Payments & invoices'}
            </h2>
            <p className="truncate text-xs text-gray-500 sm:text-sm">
              {ar ? 'تحصيل سريع وإصدار الفواتير' : 'Collect fast, invoice cleanly'}
            </p>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="-mx-4 mb-4 overflow-x-auto px-4 sm:mx-0 sm:overflow-visible sm:px-0">
        <div className="flex min-w-max gap-3 sm:grid sm:min-w-0 sm:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.key} className="w-[9.5rem] shrink-0 rounded-2xl bg-blue-900 p-3.5 text-white shadow-lift sm:w-auto">
              <div className="flex items-center justify-between">
                <p className="eyebrow text-white/50">{k.label}</p>
                <k.icon className={`h-4 w-4 shrink-0 ${k.tone}`} />
              </div>
              <p className="mt-2 font-display text-lg font-bold leading-tight sm:text-xl">{k.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sticky control bar */}
      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:px-4 sm:shadow-panel">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1">
          <button
            onClick={() => setSelectedTab('quick-collect')}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-colors ${
              selectedTab === 'quick-collect' ? 'bg-blue-900 text-white shadow-sm' : 'text-gray-600'
            }`}
          >
            <Wallet className="h-4 w-4" />
            <span>{ar ? 'تحصيل سريع' : 'Collect'}</span>
            {collectCount > 0 && (
              <span className={`rounded-full px-1.5 text-[11px] font-bold ${selectedTab === 'quick-collect' ? 'bg-lime-300 text-blue-900' : 'bg-gray-200 text-gray-700'}`}>
                {collectCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setSelectedTab('invoices')}
            className={`flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-semibold transition-colors ${
              selectedTab === 'invoices' ? 'bg-blue-900 text-white shadow-sm' : 'text-gray-600'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>{ar ? 'الفواتير' : 'Invoices'}</span>
          </button>
        </div>

        <div className="relative mt-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={ar ? 'بحث بالاسم أو رقم الفاتورة...' : 'Search name or invoice #...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-9 text-sm text-gray-900 placeholder:text-gray-400 focus:border-blue-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/15"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:flex-wrap sm:px-0">
          {([
            ['today', ar ? 'اليوم' : 'Today'],
            ['week', ar ? 'الأسبوع' : 'Week'],
            ['month', ar ? 'الشهر' : 'Month'],
            ['all', ar ? 'الكل' : 'All'],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setDateFilter(val as any)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                dateFilter === val ? 'bg-blue-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
            </button>
          ))}
          <span className="mx-1 shrink-0 self-center text-gray-200">|</span>
          {([
            ['all', ar ? 'كل الحالات' : 'All'],
            ['unpaid', ar ? 'غير مدفوع' : 'Unpaid'],
            ['partial', ar ? 'جزئي' : 'Partial'],
            ['paid', ar ? 'مدفوع' : 'Paid'],
          ] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setStatusFilter(val as any)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === val ? 'border-blue-900 bg-blue-900/5 text-blue-900' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {selectedTab === 'quick-collect' ? (
        <div className="space-y-3">
          {openInvoices.map((invoice) => {
            const total = Number(invoice.total || 0);
            const paid = Number(invoice.paid_amount || 0);
            const remaining = total - paid;
            return (
              <div key={`inv-${invoice.id}`} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-panel transition-shadow hover:shadow-lift">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-bold text-gray-900">
                      {ar && invoice.patient?.full_name_ar ? invoice.patient.full_name_ar : invoice.patient?.full_name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {invoice.invoice_number} · {new Date(invoice.invoice_date).toLocaleDateString()}
                      {invoice.patient?.phone ? ` · ${invoice.patient.phone}` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusPill(invoice.payment_status)}`}>
                    {statusLabel(invoice.payment_status)}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-3 text-center">
                  <div>
                    <p className="eyebrow text-gray-400">{ar ? 'الإجمالي' : 'Total'}</p>
                    <p className="mt-1 text-sm font-bold text-gray-900">{formatNumber(total)}</p>
                  </div>
                  <div className="border-x border-gray-200">
                    <p className="eyebrow text-gray-400">{ar ? 'المدفوع' : 'Paid'}</p>
                    <p className="mt-1 text-sm font-bold text-emerald-600">{formatNumber(paid)}</p>
                  </div>
                  <div>
                    <p className="eyebrow text-gray-400">{ar ? 'المتبقي' : 'Due'}</p>
                    <p className="mt-1 text-sm font-bold text-amber-600">{formatNumber(remaining)} {currencySymbol}</p>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => openInvoicePayment(invoice)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
                  >
                    <CreditCard className="h-4 w-4" />
                    {ar ? 'تحصيل' : 'Collect'} {formatNumber(remaining)} {currencySymbol}
                  </button>
                  <button
                    onClick={() => setSelectedInvoice(invoice)}
                    className="rounded-xl border border-gray-200 p-2.5 text-gray-600 transition-colors hover:bg-gray-50"
                    title={ar ? 'عرض التفاصيل' : 'View details'}
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredVisits.length === 0 && openInvoices.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-14 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gray-50">
                <CheckCircle className="h-7 w-7 text-emerald-500" />
              </div>
              <p className="mt-3 font-display text-base font-semibold text-gray-900">{ar ? 'لا توجد مبالغ للتحصيل' : 'Nothing to collect'}</p>
              <p className="mt-1 text-sm text-gray-500">{ar ? 'كل شيء مسدَّد لهذه الفترة' : 'All settled for this period'}</p>
            </div>
          ) : (
            filteredVisits.map((visit) => {
              const remaining = visit.visit_cost - visit.payment_received;
              const paymentStatus = visit.payment_received >= visit.visit_cost ? 'paid' : visit.payment_received > 0 ? 'partial' : 'unpaid';
              const treatmentTypes = visit.treatment_plan?.treatment_types;
              const treatmentName =
                (ar && treatmentTypes?.name_ar ? treatmentTypes.name_ar : treatmentTypes?.name) ||
                visit.treatment_plan?.treatment_category ||
                'Treatment';

              return (
                <div key={visit.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-panel transition-shadow hover:shadow-lift">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-display text-base font-bold text-gray-900">
                        {ar && visit.patient?.full_name_ar ? visit.patient.full_name_ar : visit.patient?.full_name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {treatmentName} · V{visit.visit_number} · {new Date(visit.visit_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusPill(paymentStatus)}`}>
                      {statusLabel(paymentStatus)}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-3 text-center">
                    <div>
                      <p className="eyebrow text-gray-400">{ar ? 'التكلفة' : 'Cost'}</p>
                      <p className="mt-1 text-sm font-bold text-gray-900">{formatNumber(visit.visit_cost)}</p>
                    </div>
                    <div className="border-x border-gray-200">
                      <p className="eyebrow text-gray-400">{ar ? 'المدفوع' : 'Paid'}</p>
                      <p className="mt-1 text-sm font-bold text-emerald-600">{formatNumber(visit.payment_received)}</p>
                    </div>
                    <div>
                      <p className="eyebrow text-gray-400">{ar ? 'المتبقي' : 'Due'}</p>
                      <p className="mt-1 text-sm font-bold text-amber-600">{formatNumber(remaining)} {currencySymbol}</p>
                    </div>
                  </div>

                  {remaining > 0 && !visit.payment_locked && (
                    <button
                      onClick={() => handleQuickPayment(visit)}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
                    >
                      <CreditCard className="h-4 w-4" />
                      {ar ? 'تحصيل' : 'Collect'} {formatNumber(remaining)} {currencySymbol}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white py-14 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gray-50">
            <FileText className="h-7 w-7 text-gray-400" />
          </div>
          <p className="mt-3 font-display text-base font-semibold text-gray-900">{ar ? 'لا توجد فواتير' : 'No invoices found'}</p>
          <p className="mt-1 text-sm text-gray-500">{ar ? 'جرّب تغيير الفترة أو البحث' : 'Try another period or search'}</p>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {filteredInvoices.map((invoice) => {
              const due = Number(invoice.total || 0) - Number(invoice.paid_amount || 0);
              return (
                <div key={invoice.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-panel">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-display text-base font-bold text-gray-900">
                        {ar && invoice.patient?.full_name_ar ? invoice.patient.full_name_ar : invoice.patient?.full_name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500">
                        {invoice.invoice_number} · {new Date(invoice.invoice_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusPill(invoice.payment_status)}`}>
                      {statusLabel(invoice.payment_status)}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-gray-50 p-3 text-center">
                    <div>
                      <p className="eyebrow text-gray-400">{ar ? 'الإجمالي' : 'Total'}</p>
                      <p className="mt-1 text-sm font-bold text-gray-900">{formatNumber(invoice.total)}</p>
                    </div>
                    <div className="border-x border-gray-200">
                      <p className="eyebrow text-gray-400">{ar ? 'المدفوع' : 'Paid'}</p>
                      <p className="mt-1 text-sm font-bold text-emerald-600">{formatNumber(invoice.paid_amount)}</p>
                    </div>
                    <div>
                      <p className="eyebrow text-gray-400">{ar ? 'المتبقي' : 'Due'}</p>
                      <p className="mt-1 text-sm font-bold text-amber-600">{formatNumber(Math.max(0, due))} {currencySymbol}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    {due > 0.001 && (
                      <button
                        onClick={() => openInvoicePayment(invoice)}
                        className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                      >
                        <CreditCard className="h-4 w-4" />
                        {ar ? 'تحصيل' : 'Collect'}
                      </button>
                    )}
                    <button onClick={() => setSelectedInvoice(invoice)} className="rounded-xl border border-gray-200 p-2.5 text-gray-600 hover:bg-gray-50">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDownloadInvoice(invoice)} className="rounded-xl border border-gray-200 p-2.5 text-gray-600 hover:bg-gray-50">
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-panel lg:block">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-5 py-3 text-left eyebrow text-gray-400">{ar ? 'رقم الفاتورة' : 'Invoice #'}</th>
                  <th className="px-5 py-3 text-left eyebrow text-gray-400">{ar ? 'المريض' : 'Patient'}</th>
                  <th className="px-5 py-3 text-left eyebrow text-gray-400">{ar ? 'التاريخ' : 'Date'}</th>
                  <th className="px-5 py-3 text-right eyebrow text-gray-400">{ar ? 'المبلغ' : 'Total'}</th>
                  <th className="px-5 py-3 text-right eyebrow text-gray-400">{ar ? 'المدفوع' : 'Paid'}</th>
                  <th className="px-5 py-3 text-center eyebrow text-gray-400">{ar ? 'الحالة' : 'Status'}</th>
                  <th className="px-5 py-3 text-center eyebrow text-gray-400">{ar ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-5 py-3.5 text-sm font-semibold text-blue-900">{invoice.invoice_number}</td>
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-semibold text-gray-900">
                        {ar && invoice.patient?.full_name_ar ? invoice.patient.full_name_ar : invoice.patient?.full_name}
                      </div>
                      <div className="text-xs text-gray-500">{invoice.patient?.phone}</div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-sm text-gray-600">{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right text-sm font-bold text-gray-900">{formatNumber(invoice.total)} {currencySymbol}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right text-sm font-semibold text-emerald-600">{formatNumber(invoice.paid_amount)} {currencySymbol}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusPill(invoice.payment_status)}`}>
                        {getStatusIcon(invoice.payment_status)}
                        {statusLabel(invoice.payment_status)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {Number(invoice.total || 0) - Number(invoice.paid_amount || 0) > 0.001 && (
                          <button
                            onClick={() => openInvoicePayment(invoice)}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800"
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            <span>{ar ? 'تحصيل' : 'Collect'}</span>
                          </button>
                        )}
                        <button onClick={() => setSelectedInvoice(invoice)} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100" title={ar ? 'عرض' : 'View'}>
                          <Eye className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDownloadInvoice(invoice)} className="rounded-lg p-2 text-gray-600 hover:bg-gray-100" title={ar ? 'تحميل' : 'Download'}>
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {payInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {language === 'ar' ? 'تحصيل دفعة' : 'Collect Payment'}
                  </h3>
                  <p className="text-sm text-gray-600">{payInvoice.invoice_number}</p>
                </div>
              </div>
              <button
                onClick={() => { setPayInvoice(null); setPaymentAmount(''); }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{language === 'ar' ? 'المريض:' : 'Patient:'}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {language === 'ar' && payInvoice.patient?.full_name_ar
                      ? payInvoice.patient.full_name_ar
                      : payInvoice.patient?.full_name}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="text-sm text-gray-600">{language === 'ar' ? 'الإجمالي:' : 'Total:'}</span>
                  <span className="text-lg font-bold text-gray-900">{formatNumber(Number(payInvoice.total || 0))} {currencySymbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{language === 'ar' ? 'المدفوع:' : 'Already Paid:'}</span>
                  <span className="text-sm font-semibold text-green-600">{formatNumber(Number(payInvoice.paid_amount || 0))} {currencySymbol}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="text-sm font-medium text-gray-900">{language === 'ar' ? 'المتبقي:' : 'Remaining:'}</span>
                  <span className="text-lg font-bold text-yellow-600">
                    {formatNumber(Number(payInvoice.total || 0) - Number(payInvoice.paid_amount || 0))} {currencySymbol}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'ar' ? 'المبلغ المدفوع' : 'Payment Amount'}
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="cash">{language === 'ar' ? 'نقداً' : 'Cash'}</option>
                  <option value="card">{language === 'ar' ? 'بطاقة' : 'Card'}</option>
                  <option value="bank_transfer">{language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => { setPayInvoice(null); setPaymentAmount(''); }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={recordInvoicePayment}
                  disabled={saving}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm disabled:opacity-60"
                >
                  {saving
                    ? (language === 'ar' ? 'جارٍ الحفظ...' : 'Saving...')
                    : (language === 'ar' ? 'تسجيل الدفع' : 'Record Payment')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && selectedVisit && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {language === 'ar' ? 'تسجيل دفعة' : 'Record Payment'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setSelectedVisit(null);
                  setPaymentAmount('');
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{language === 'ar' ? 'المريض:' : 'Patient:'}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {language === 'ar' && selectedVisit.patient?.full_name_ar
                      ? selectedVisit.patient.full_name_ar
                      : selectedVisit.patient?.full_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{language === 'ar' ? 'الإجراء:' : 'Treatment:'}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {selectedVisit.treatment_plan?.treatment_category || 'Treatment'} - V{selectedVisit.visit_number}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                  <span className="text-sm text-gray-600">{language === 'ar' ? 'التكلفة الإجمالية:' : 'Total Cost:'}</span>
                  <span className="text-lg font-bold text-gray-900">{formatNumber(selectedVisit.visit_cost)} {currencySymbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{language === 'ar' ? 'المدفوع:' : 'Already Paid:'}</span>
                  <span className="text-sm font-semibold text-green-600">{formatNumber(selectedVisit.payment_received)} {currencySymbol}</span>
                </div>
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="text-sm font-medium text-gray-900">{language === 'ar' ? 'المتبقي:' : 'Remaining:'}</span>
                  <span className="text-lg font-bold text-yellow-600">
                    {formatNumber(selectedVisit.visit_cost - selectedVisit.payment_received)} {currencySymbol}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'ar' ? 'المبلغ المدفوع' : 'Payment Amount'}
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="cash">{language === 'ar' ? 'نقداً' : 'Cash'}</option>
                  <option value="card">{language === 'ar' ? 'بطاقة' : 'Card'}</option>
                  <option value="bank_transfer">{language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedVisit(null);
                    setPaymentAmount('');
                  }}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  onClick={recordPayment}
                  className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
                >
                  {language === 'ar' ? 'تسجيل الدفع' : 'Record Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedInvoice && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {language === 'ar' ? 'تفاصيل الفاتورة' : 'Invoice Details'}
                  </h3>
                  <p className="text-sm text-gray-600">{selectedInvoice.invoice_number}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'المريض' : 'Patient'}</p>
                  <p className="font-semibold text-gray-900">
                    {language === 'ar' && selectedInvoice.patient?.full_name_ar
                      ? selectedInvoice.patient.full_name_ar
                      : selectedInvoice.patient?.full_name}
                  </p>
                  <p className="text-sm text-gray-600">{selectedInvoice.patient?.phone}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'الطبيب' : 'Doctor'}</p>
                  <p className="font-semibold text-gray-900">
                    {language === 'ar' && selectedInvoice.doctor?.full_name_ar
                      ? selectedInvoice.doctor.full_name_ar
                      : selectedInvoice.doctor?.full_name}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'التاريخ' : 'Date'}</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(selectedInvoice.invoice_date).toLocaleDateString()}
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">{language === 'ar' ? 'الحالة' : 'Status'}</p>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${getStatusColor(selectedInvoice.payment_status)}`}>
                    {getStatusIcon(selectedInvoice.payment_status)}
                    {selectedInvoice.payment_status === 'paid' ? (language === 'ar' ? 'مدفوع' : 'Paid')
                      : selectedInvoice.payment_status === 'partial' ? (language === 'ar' ? 'جزئي' : 'Partial')
                      : (language === 'ar' ? 'غير مدفوع' : 'Unpaid')}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-900 mb-3">{language === 'ar' ? 'البنود' : 'Items'}</h4>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                          {language === 'ar' ? 'الوصف' : 'Description'}
                        </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                          {language === 'ar' ? 'الكمية' : 'Qty'}
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          {language === 'ar' ? 'السعر' : 'Price'}
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                          {language === 'ar' ? 'المجموع' : 'Total'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {selectedInvoice.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                          <td className="px-4 py-3 text-sm text-center text-gray-600">{item.quantity}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">{formatNumber(item.unitprice)} {currencySymbol}</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">{formatNumber(item.total)} {currencySymbol}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 space-y-2">
                <div className="flex justify-between text-base">
                  <span className="text-gray-600">{language === 'ar' ? 'المجموع الكلي:' : 'Total:'}</span>
                  <span className="font-bold text-gray-900">{formatNumber(selectedInvoice.total)} {currencySymbol}</span>
                </div>
                <div className="flex justify-between text-base">
                  <span className="text-gray-600">{language === 'ar' ? 'المدفوع:' : 'Paid:'}</span>
                  <span className="font-bold text-green-600">{formatNumber(selectedInvoice.paid_amount)} {currencySymbol}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                  <span className="text-gray-900">{language === 'ar' ? 'المتبقي:' : 'Balance:'}</span>
                  <span className="text-yellow-600">{formatNumber(selectedInvoice.total - selectedInvoice.paid_amount)} {currencySymbol}</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  {language === 'ar' ? 'إغلاق' : 'Close'}
                </button>
                <button
                  onClick={() => handleDownloadInvoice(selectedInvoice)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
                >
                  <Download className="w-5 h-5" />
                  <span>{language === 'ar' ? 'تحميل الفاتورة' : 'Download Invoice'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {receipt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    {language === 'ar' ? '✓ تم تسجيل الدفع' : 'Payment recorded'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {language === 'ar' ? 'اطبع الإيصال للمريض' : 'Print the receipt for the patient'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{language === 'ar' ? 'المريض' : 'Patient'}</span>
                  <span className="font-medium text-gray-900">{receipt.patientName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">{language === 'ar' ? 'المدفوع الآن' : 'Paid now'}</span>
                  <span className="font-bold text-emerald-600">
                    {formatNumber(receipt.amountPaid)} {currencySymbol}
                  </span>
                </div>
                {receipt.remaining != null && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">{language === 'ar' ? 'المتبقي' : 'Remaining'}</span>
                    <span className="font-medium text-gray-900">
                      {formatNumber(receipt.remaining)} {currencySymbol}
                    </span>
                  </div>
                )}
                <div className="pt-2 border-t border-gray-100">
                  <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-1">
                    {language === 'ar' ? 'الزيارات القادمة' : 'Next visits'}
                  </div>
                  {receipt.nextVisits.length ? (
                    <ul className="space-y-1">
                      {receipt.nextVisits.map((v, i) => (
                        <li key={i} className="flex justify-between text-gray-700">
                          <span>{v.when}</span>
                          <span className="text-gray-500">{v.what}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500">
                      {language === 'ar' ? 'لا توجد زيارة مجدولة' : 'No upcoming visit scheduled'}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setReceipt(null)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  {language === 'ar' ? 'إغلاق' : 'Close'}
                </button>
                <button
                  onClick={() => printReceipt(receipt)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-sm"
                >
                  <Receipt className="w-5 h-5" />
                  <span>{language === 'ar' ? 'طباعة الإيصال' : 'Print receipt'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
