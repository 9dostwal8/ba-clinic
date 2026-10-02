// @ts-nocheck
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Percent, Calendar, TrendingUp, FileText, Download, ArrowLeft, User, CreditCard,
  CheckCircle, X, Search, Wallet, Clock, RefreshCw, Users, Receipt, Settings2,
  ChevronRight, AlertCircle, BadgeCheck, Banknote
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatNumber } from '../../utils/numberFormatter';
import { useCurrency } from '../../hooks/useCurrency';
import { generateCommissionReportPDF, CommissionReportData } from '../../utils/commissionPdfGenerator';

type Tab = 'payroll' | 'history' | 'rates';

const startOfMonth = () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
const today = () => new Date().toISOString().split('T')[0];

export function CommissionModule() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const { currencySymbol } = useCurrency();
  const ar = language === 'ar';
  const L = (en: string, arv: string) => (ar ? arv : en);

  const [tab, setTab] = useState<Tab>('payroll');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]); // per-doctor aggregates
  const [detailsByDoctor, setDetailsByDoctor] = useState<Record<string, any[]>>({});
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState(startOfMonth());
  const [endDate, setEndDate] = useState(today());
  const [openDoctorId, setOpenDoctorId] = useState<string | null>(null);
  const [detailFilter, setDetailFilter] = useState<'all' | 'unpaid' | 'paid'>('all');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payDoctor, setPayDoctor] = useState<any>(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [savingRateFor, setSavingRateFor] = useState<string | null>(null);
  const [rateDraft, setRateDraft] = useState<Record<string, string>>({});
  const [paymentForm, setPaymentForm] = useState({
    payment_amount: 0,
    payment_date: today(),
    payment_method: 'cash',
    payment_reference: '',
    notes: ''
  });

  const setPeriod = (kind: 'month' | 'last' | 'quarter' | 'year') => {
    const now = new Date();
    if (kind === 'month') { setStartDate(startOfMonth()); setEndDate(today()); }
    if (kind === 'last') {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(s.toISOString().split('T')[0]); setEndDate(e.toISOString().split('T')[0]);
    }
    if (kind === 'quarter') {
      const s = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      setStartDate(s.toISOString().split('T')[0]); setEndDate(today());
    }
    if (kind === 'year') {
      setStartDate(new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]); setEndDate(today());
    }
  };

  const loadDoctors = useCallback(async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, full_name_ar, staff_permissions(commission_rate)')
      .eq('clinic_id', profile?.clinic_id)
      .eq('role', 'doctor')
      .eq('is_active', true)
      .order('full_name');
    if (error) { console.error(error); return []; }
    const list = (data || []).map((d: any) => ({
      id: d.id,
      full_name: d.full_name,
      full_name_ar: d.full_name_ar,
      commission_rate: Number(d.staff_permissions?.[0]?.commission_rate ?? 30)
    }));
    setDoctors(list);
    return list;
  }, [profile?.clinic_id]);

  const loadPayments = useCallback(async () => {
    const { data } = await supabase
      .from('commission_payments')
      .select('*, doctor:doctor_id(full_name, full_name_ar), commission_payment_items(id, source_id, commission_amount)')
      .eq('clinic_id', profile?.clinic_id)
      .order('payment_date', { ascending: false })
      .limit(200);
    setPayments(data || []);
    return data || [];
  }, [profile?.clinic_id]);

  const calculate = useCallback(async (docs?: any[]) => {
    const list = docs || doctors;
    if (!profile?.clinic_id || list.length === 0) { setRows([]); return; }
    setCalculating(true);
    try {
      const pays = await loadPayments();
      const paidSourceIds = new Set<string>();
      const paidByDoctor: Record<string, number> = {};
      (pays || []).forEach((p: any) => {
        if (p.status !== 'paid') return;
        paidByDoctor[p.doctor_id] = (paidByDoctor[p.doctor_id] || 0) + Number(p.payment_amount || 0);
        (p.commission_payment_items || []).forEach((i: any) => paidSourceIds.add(i.source_id));
      });

      const results = await Promise.all(list.map(async (doc: any) => {
        const [{ data: sum }, { data: det }] = await Promise.all([
          supabase.rpc('get_doctor_commission_summary', {
            p_clinic_id: profile.clinic_id, p_doctor_id: doc.id, p_start_date: startDate, p_end_date: endDate
          }),
          supabase.rpc('get_doctor_commission_details', {
            p_clinic_id: profile.clinic_id, p_doctor_id: doc.id, p_start_date: startDate, p_end_date: endDate
          })
        ]);
        const summary = sum?.[0] || null;
        const details = (det || []).map((d: any) => ({ ...d, is_paid: paidSourceIds.has(d.source_id) }));
        const earned = details.reduce((s: number, d: any) => s + Number(d.commission_amount || 0), 0);
        const settled = details.filter((d: any) => d.is_paid).reduce((s: number, d: any) => s + Number(d.commission_amount || 0), 0);
        return {
          doctor: doc,
          summary,
          details,
          revenue: Number(summary?.total_revenue || 0),
          earned,
          settled,
          payable: Math.max(0, earned - settled),
          treatments: Number(summary?.treatment_count || details.length),
          rate: Number(summary?.commission_rate || doc.commission_rate || 0),
          fromPlans: Number(summary?.from_treatment_plans || 0),
          fromInvoices: Number(summary?.from_invoices || 0),
          paidLifetime: paidByDoctor[doc.id] || 0
        };
      }));

      setRows(results.sort((a, b) => b.earned - a.earned));
      const map: Record<string, any[]> = {};
      results.forEach(r => { map[r.doctor.id] = r.details; });
      setDetailsByDoctor(map);
    } catch (e: any) {
      console.error(e);
    } finally {
      setCalculating(false);
    }
  }, [doctors, profile?.clinic_id, startDate, endDate, loadPayments]);

  useEffect(() => {
    if (!profile?.clinic_id) return;
    (async () => {
      setLoading(true);
      const list = await loadDoctors();
      await calculate(list);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.clinic_id]);

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    revenue: acc.revenue + r.revenue,
    earned: acc.earned + r.earned,
    settled: acc.settled + r.settled,
    payable: acc.payable + r.payable,
    treatments: acc.treatments + r.treatments
  }), { revenue: 0, earned: 0, settled: 0, payable: 0, treatments: 0 }), [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r => `${r.doctor.full_name} ${r.doctor.full_name_ar || ''}`.toLowerCase().includes(q));
  }, [rows, search]);

  const openRow = rows.find(r => r.doctor.id === openDoctorId) || null;

  const money = (n: number) => `${formatNumber(Math.round(Number(n) || 0))} ${currencySymbol}`;
  const docName = (d: any) => (ar && d?.full_name_ar ? d.full_name_ar : d?.full_name) || '—';

  const openPay = (row: any) => {
    setPayDoctor(row);
    setPaymentForm({
      payment_amount: Math.round(row.payable),
      payment_date: today(),
      payment_method: 'cash',
      payment_reference: '',
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handleProcessPayment = async () => {
    if (!payDoctor || !profile?.clinic_id) return;
    if (paymentForm.payment_amount <= 0) { alert(L('Enter a payment amount', 'يرجى إدخال مبلغ الدفع')); return; }
    try {
      setProcessingPayment(true);
      const unpaid = (payDoctor.details || []).filter((d: any) => !d.is_paid);
      const { data: payment, error } = await supabase
        .from('commission_payments')
        .insert({
          clinic_id: profile.clinic_id,
          doctor_id: payDoctor.doctor.id,
          period_start: startDate,
          period_end: endDate,
          total_commission: Math.round(payDoctor.earned),
          payment_amount: paymentForm.payment_amount,
          payment_date: paymentForm.payment_date,
          payment_method: paymentForm.payment_method,
          payment_reference: paymentForm.payment_reference,
          notes: paymentForm.notes,
          paid_by: profile.id,
          status: 'paid',
          created_by: profile.id
        })
        .select()
        .single();
      if (error) throw error;

      if (unpaid.length) {
        const items = unpaid.map((d: any) => ({
          payment_id: payment.id,
          source_type: d.source_type,
          source_id: d.source_id,
          patient_id: d.patient_id,
          treatment_date: d.treatment_date,
          amount: Number(d.amount || 0),
          commission_rate: Number(
            d.commission_rate ??
            (d.amount ? Number((((d.commission_amount ?? 0) / d.amount) * 100).toFixed(2)) : payDoctor.rate) ?? 0
          ),
          commission_amount: Number(d.commission_amount || 0),
          description: d.description
        }));
        const { error: itemsError } = await supabase.from('commission_payment_items').insert(items);
        if (itemsError) throw itemsError;
      }

      setShowPaymentModal(false);
      await calculate();
      alert(L(`Payment of ${money(paymentForm.payment_amount)} recorded`, `تم تسجيل دفعة ${money(paymentForm.payment_amount)}`));
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setProcessingPayment(false);
    }
  };

  const saveRate = async (doctorId: string) => {
    const value = parseFloat(rateDraft[doctorId]);
    if (isNaN(value) || value < 0 || value > 100) { alert(L('Rate must be 0-100', 'النسبة يجب أن تكون بين 0 و 100')); return; }
    try {
      setSavingRateFor(doctorId);
      const { data: existing } = await supabase
        .from('staff_permissions').select('id').eq('user_id', doctorId).maybeSingle();
      if (existing) {
        const { error } = await supabase.from('staff_permissions').update({ commission_rate: value }).eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('staff_permissions').insert({ user_id: doctorId, commission_rate: value });
        if (error) throw error;
      }
      const list = await loadDoctors();
      await calculate(list);
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setSavingRateFor(null);
    }
  };

  const downloadReport = async (row: any) => {
    try {
      const { data: clinic } = await supabase.from('clinics').select('name, name_ar').eq('id', profile.clinic_id).single();
      const reportData: CommissionReportData = {
        doctorName: row.doctor.full_name,
        doctorNameAr: row.doctor.full_name_ar,
        clinicName: clinic?.name || 'Clinic',
        clinicNameAr: clinic?.name_ar,
        periodStart: startDate,
        periodEnd: endDate,
        items: (row.details || []).map((d: any) => ({
          date: d.treatment_date,
          patientName: d.patient_name,
          treatmentType: d.description,
          treatmentTypeAr: d.description,
          toothNumber: '',
          quantity: 1,
          unitPrice: d.amount,
          totalAmount: d.amount,
          commissionRate: d.commission_rate,
          commissionType: 'percentage',
          commissionAmount: d.commission_amount,
          isPaid: d.is_paid
        })),
        totalRevenue: row.revenue,
        totalCommission: row.earned,
        totalTreatments: row.treatments
      };
      await generateCommissionReportPDF(reportData);
    } catch (e: any) {
      alert(`Error generating PDF: ${e.message}`);
    }
  };

  /* ---------------- UI pieces ---------------- */

  const Kpi = ({ label, value, sub, icon: Icon, tone = 'slate' }: any) => {
    const tones: any = {
      navy: 'bg-slate-900 text-white border-slate-900',
      lime: 'bg-lime-50 text-slate-900 border-lime-200',
      amber: 'bg-amber-50 text-slate-900 border-amber-200',
      slate: 'bg-white text-slate-900 border-slate-200'
    };
    return (
      <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[11px] font-semibold uppercase tracking-wide ${tone === 'navy' ? 'text-slate-300' : 'text-slate-500'}`}>{label}</span>
          <Icon className={`w-4 h-4 ${tone === 'navy' ? 'text-lime-300' : 'text-slate-400'}`} />
        </div>
        <p className="text-xl sm:text-2xl font-bold leading-tight">{value}</p>
        {sub && <p className={`text-[11px] mt-1 ${tone === 'navy' ? 'text-slate-400' : 'text-slate-500'}`}>{sub}</p>}
      </div>
    );
  };

  const Avatar = ({ name, size = 'md' }: any) => (
    <div className={`${size === 'sm' ? 'w-9 h-9 text-sm' : 'w-11 h-11 text-base'} rounded-xl bg-slate-900 text-lime-300 font-bold flex items-center justify-center shrink-0`}>
      {(name || 'D').charAt(0).toUpperCase()}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-slate-500">
        <RefreshCw className="w-5 h-5 animate-spin mr-2" /> {L('Loading commissions…', 'جاري التحميل…')}
      </div>
    );
  }

  /* ---------------- Doctor detail view ---------------- */
  if (openRow) {
    const details = (detailsByDoctor[openRow.doctor.id] || []).filter(d =>
      detailFilter === 'all' ? true : detailFilter === 'paid' ? d.is_paid : !d.is_paid
    );
    const docPayments = payments.filter(p => p.doctor_id === openRow.doctor.id);
    return (
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5 pb-24">
        <button onClick={() => setOpenDoctorId(null)} className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> {L('All doctors', 'كل الأطباء')}
        </button>

        <div className="rounded-3xl bg-slate-900 text-white p-5 mb-4">
          <div className="flex items-center gap-3">
            <Avatar name={openRow.doctor.full_name} />
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl font-bold truncate">{docName(openRow.doctor)}</h1>
              <p className="text-xs text-slate-400">
                {L('Rate', 'النسبة')} {openRow.rate}% · {new Date(startDate).toLocaleDateString()} → {new Date(endDate).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {[
              [L('Production', 'الإنتاج'), money(openRow.revenue)],
              [L('Earned', 'المستحق'), money(openRow.earned)],
              [L('Settled', 'المدفوع'), money(openRow.settled)],
              [L('Payable', 'المتبقي'), money(openRow.payable)]
            ].map(([l, v], i) => (
              <div key={i} className={`rounded-2xl px-3 py-2.5 ${i === 3 ? 'bg-lime-400 text-slate-900' : 'bg-white/10'}`}>
                <p className={`text-[10px] uppercase font-semibold ${i === 3 ? 'text-slate-700' : 'text-slate-300'}`}>{l}</p>
                <p className="text-base font-bold">{v}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={() => openPay(openRow)} disabled={openRow.payable <= 0}
              className="flex-1 py-2.5 rounded-xl bg-lime-400 text-slate-900 font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2">
              <Banknote className="w-4 h-4" /> {L('Pay', 'دفع')} {money(openRow.payable)}
            </button>
            <button onClick={() => downloadReport(openRow)} className="px-4 py-2.5 rounded-xl bg-white/10 text-sm font-semibold flex items-center gap-2">
              <Download className="w-4 h-4" /> PDF
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 mb-4">
          <h3 className="text-sm font-bold text-slate-900 mb-3">{L('Calculation basis', 'أساس الحساب')}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] text-slate-500">{L('From treatment plans', 'من خطط العلاج')}</p>
              <p className="font-bold text-slate-900">{money(openRow.fromPlans)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] text-slate-500">{L('From invoices', 'من الفواتير')}</p>
              <p className="font-bold text-slate-900">{money(openRow.fromInvoices)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] text-slate-500">{L('Items', 'العناصر')}</p>
              <p className="font-bold text-slate-900">{openRow.treatments}</p>
            </div>
          </div>
          <p className="text-[11px] text-slate-500 mt-3">
            {L('Commission = collected treatment revenue × doctor rate. Only settled items are excluded from payable.',
               'العمولة = الإيراد المحصل × نسبة الطبيب. العناصر المدفوعة تُستثنى من المتبقي.')}
          </p>
        </div>

        <div className="flex items-center gap-2 mb-3">
          {(['all', 'unpaid', 'paid'] as const).map(f => (
            <button key={f} onClick={() => setDetailFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${detailFilter === f ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
              {f === 'all' ? L('All', 'الكل') : f === 'unpaid' ? L('Unpaid', 'غير مدفوع') : L('Paid', 'مدفوع')}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          {details.length === 0 && (
            <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200 text-slate-500 text-sm">
              {L('No commission items for this filter', 'لا توجد عناصر')}
            </div>
          )}
          {details.map((d: any, i: number) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{d.patient_name}</p>
                  <p className="text-xs text-slate-500 truncate">{d.description}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-500">{new Date(d.treatment_date).toLocaleDateString()}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${d.source_type === 'treatment_visit' ? 'bg-slate-100 text-slate-700' : 'bg-indigo-50 text-indigo-700'}`}>
                      {d.source_type === 'treatment_visit' ? L('Plan visit', 'زيارة خطة') : L('Invoice', 'فاتورة')}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-700">{d.commission_rate ?? openRow.rate}%</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[11px] text-slate-500">{money(d.amount)}</p>
                  <p className="font-bold text-slate-900">{money(d.commission_amount)}</p>
                  <span className={`inline-flex items-center gap-1 mt-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${d.is_paid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                    {d.is_paid ? <BadgeCheck className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    {d.is_paid ? L('Paid', 'مدفوع') : L('Due', 'مستحق')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {docPayments.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-bold text-slate-900 mb-2">{L('Payout history', 'سجل الدفعات')}</h3>
            <div className="space-y-2">
              {docPayments.map(p => (
                <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-3.5 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{money(p.payment_amount)}</p>
                    <p className="text-[11px] text-slate-500">
                      {new Date(p.payment_date).toLocaleDateString()} · {p.payment_method} {p.payment_reference ? `· ${p.payment_reference}` : ''}
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700">{p.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {showPaymentModal && renderPaymentModal()}
      </div>
    );
  }

  /* ---------------- Payment modal ---------------- */
  function renderPaymentModal() {
    if (!payDoctor) return null;
    const remaining = Math.max(0, payDoctor.payable - paymentForm.payment_amount);
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto">
          <div className="sticky top-0 bg-slate-900 text-white p-5 sm:rounded-t-3xl">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2"><CreditCard className="w-5 h-5 text-lime-300" /> {L('Pay commission', 'دفع العمولة')}</h2>
                <p className="text-xs text-slate-400 mt-1">{docName(payDoctor.doctor)} · {new Date(startDate).toLocaleDateString()} → {new Date(endDate).toLocaleDateString()}</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 text-center">
              <div className="bg-white/10 rounded-xl py-2">
                <p className="text-[10px] text-slate-300">{L('Earned', 'المستحق')}</p>
                <p className="text-sm font-bold">{money(payDoctor.earned)}</p>
              </div>
              <div className="bg-white/10 rounded-xl py-2">
                <p className="text-[10px] text-slate-300">{L('Settled', 'المدفوع')}</p>
                <p className="text-sm font-bold">{money(payDoctor.settled)}</p>
              </div>
              <div className="bg-lime-400 text-slate-900 rounded-xl py-2">
                <p className="text-[10px]">{L('Payable', 'المتبقي')}</p>
                <p className="text-sm font-bold">{money(payDoctor.payable)}</p>
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">{L('Payment amount', 'مبلغ الدفع')} *</label>
              <input type="number" value={paymentForm.payment_amount}
                onChange={e => setPaymentForm({ ...paymentForm, payment_amount: parseFloat(e.target.value) || 0 })}
                className="w-full px-4 py-3 text-lg font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-lime-400 outline-none" />
              <div className="flex gap-2 mt-2">
                <button onClick={() => setPaymentForm({ ...paymentForm, payment_amount: Math.round(payDoctor.payable) })}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-900 text-white">{L('Full payable', 'كامل المتبقي')}</button>
                <button onClick={() => setPaymentForm({ ...paymentForm, payment_amount: Math.round(payDoctor.payable / 2) })}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">50%</button>
              </div>
              {remaining > 0 && (
                <p className="text-[11px] text-amber-700 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {L('Remaining after this payout', 'المتبقي بعد الدفع')}: {money(remaining)}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">{L('Date', 'التاريخ')} *</label>
                <input type="date" value={paymentForm.payment_date}
                  onChange={e => setPaymentForm({ ...paymentForm, payment_date: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">{L('Method', 'الطريقة')} *</label>
                <select value={paymentForm.payment_method}
                  onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime-400">
                  <option value="cash">{L('Cash', 'نقداً')}</option>
                  <option value="bank_transfer">{L('Bank transfer', 'تحويل بنكي')}</option>
                  <option value="check">{L('Check', 'شيك')}</option>
                  <option value="other">{L('Other', 'أخرى')}</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">{L('Reference', 'رقم المرجع')}</label>
              <input type="text" value={paymentForm.payment_reference}
                onChange={e => setPaymentForm({ ...paymentForm, payment_reference: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime-400"
                placeholder={L('Check no, transfer id…', 'رقم الشيك أو التحويل')} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">{L('Notes', 'ملاحظات')}</label>
              <textarea value={paymentForm.notes} rows={2}
                onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-lime-400" />
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={() => setShowPaymentModal(false)} disabled={processingPayment}
                className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold text-sm">{L('Cancel', 'إلغاء')}</button>
              <button onClick={handleProcessPayment} disabled={processingPayment}
                className="flex-[2] py-3 rounded-xl bg-slate-900 text-lime-300 font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60">
                {processingPayment
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> {L('Processing…', 'جاري المعالجة…')}</>
                  : <><CheckCircle className="w-4 h-4" /> {L('Confirm payout', 'تأكيد الدفع')}</>}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- Main view ---------------- */
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-5 pb-24">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-slate-900 text-lime-300 flex items-center justify-center">
            <Percent className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{L('Commissions', 'العمولات')}</h1>
            <p className="text-xs text-slate-500">{L('Doctor earnings, settlements & payouts', 'أرباح الأطباء والتسويات والدفعات')}</p>
          </div>
        </div>
        <button onClick={() => calculate()} disabled={calculating}
          className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center gap-2 disabled:opacity-60">
          <RefreshCw className={`w-4 h-4 ${calculating ? 'animate-spin' : ''}`} /> {L('Recalculate', 'إعادة الحساب')}
        </button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Kpi tone="navy" label={L('Payable now', 'مستحق الدفع')} value={money(totals.payable)} sub={L('Across all doctors', 'لكل الأطباء')} icon={Wallet} />
        <Kpi tone="lime" label={L('Commission earned', 'العمولة المستحقة')} value={money(totals.earned)} sub={`${totals.treatments} ${L('items', 'عنصر')}`} icon={TrendingUp} />
        <Kpi label={L('Settled', 'المدفوع')} value={money(totals.settled)} sub={L('Paid this period', 'مدفوع خلال الفترة')} icon={BadgeCheck} />
        <Kpi label={L('Production', 'الإنتاج')} value={money(totals.revenue)} sub={`${rows.length} ${L('doctors', 'طبيب')}`} icon={Receipt} />
      </div>

      {/* Sticky controls */}
      <div className="sticky top-0 z-20 -mx-3 sm:mx-0 px-3 sm:px-0 py-2 bg-slate-50/95 backdrop-blur">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 space-y-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {([['payroll', L('Payroll', 'الرواتب'), Users], ['history', L('Payouts', 'الدفعات'), Receipt], ['rates', L('Rates', 'النسب'), Settings2]] as const).map(([k, label, Icon]: any) => (
              <button key={k} onClick={() => setTab(k)}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 border ${tab === k ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'}`}>
                <Icon className="w-3.5 h-3.5" /> {label}
                {k === 'payroll' && <span className="ml-1 px-1.5 rounded-full bg-lime-400 text-slate-900 text-[10px]">{rows.length}</span>}
                {k === 'history' && <span className="ml-1 px-1.5 rounded-full bg-slate-100 text-slate-700 text-[10px]">{payments.length}</span>}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder={L('Search doctor…', 'ابحث عن طبيب…')}
                className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lime-400" />
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                className="px-2 py-2 text-xs border border-slate-200 rounded-xl outline-none" />
              <span className="text-slate-400 text-xs">→</span>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                className="px-2 py-2 text-xs border border-slate-200 rounded-xl outline-none" />
            </div>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {([['month', L('This month', 'هذا الشهر')], ['last', L('Last month', 'الشهر الماضي')], ['quarter', L('90 days', '90 يوم')], ['year', L('This year', 'هذه السنة')]] as const).map(([k, label]) => (
              <button key={k} onClick={() => { setPeriod(k as any); }}
                className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 whitespace-nowrap">{label}</button>
            ))}
            <button onClick={() => calculate()} className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-lime-400 text-slate-900 whitespace-nowrap">
              {L('Apply', 'تطبيق')}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4">
        {calculating && (
          <div className="mb-3 text-xs text-slate-500 flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5 animate-spin" /> {L('Calculating…', 'جاري الحساب…')}</div>
        )}

        {tab === 'payroll' && (
          filteredRows.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-slate-200">
              <User className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-semibold">{L('No doctors found', 'لا يوجد أطباء')}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredRows.map(r => (
                <div key={r.doctor.id} className="rounded-2xl border border-slate-200 bg-white p-4 hover:border-slate-300 transition">
                  <div className="flex items-start gap-3">
                    <Avatar name={r.doctor.full_name} />
                    <div className="flex-1 min-w-0">
                      <button onClick={() => { setOpenDoctorId(r.doctor.id); setDetailFilter('all'); }} className="text-left w-full">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 truncate">{docName(r.doctor)}</p>
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </div>
                        <p className="text-[11px] text-slate-500">{r.rate}% · {r.treatments} {L('items', 'عنصر')} · {money(r.revenue)} {L('production', 'إنتاج')}</p>
                      </button>

                      <div className="grid grid-cols-3 gap-2 mt-3">
                        <div className="rounded-xl bg-slate-50 px-2.5 py-2">
                          <p className="text-[10px] text-slate-500 font-semibold">{L('Earned', 'المستحق')}</p>
                          <p className="text-sm font-bold text-slate-900">{money(r.earned)}</p>
                        </div>
                        <div className="rounded-xl bg-emerald-50 px-2.5 py-2">
                          <p className="text-[10px] text-emerald-700 font-semibold">{L('Settled', 'المدفوع')}</p>
                          <p className="text-sm font-bold text-emerald-800">{money(r.settled)}</p>
                        </div>
                        <div className={`rounded-xl px-2.5 py-2 ${r.payable > 0 ? 'bg-amber-50' : 'bg-slate-50'}`}>
                          <p className={`text-[10px] font-semibold ${r.payable > 0 ? 'text-amber-700' : 'text-slate-500'}`}>{L('Payable', 'المتبقي')}</p>
                          <p className={`text-sm font-bold ${r.payable > 0 ? 'text-amber-800' : 'text-slate-700'}`}>{money(r.payable)}</p>
                        </div>
                      </div>

                      {/* progress */}
                      <div className="mt-3 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full bg-lime-400" style={{ width: `${r.earned > 0 ? Math.min(100, (r.settled / r.earned) * 100) : 0}%` }} />
                      </div>

                      <div className="flex gap-2 mt-3">
                        <button onClick={() => openPay(r)} disabled={r.payable <= 0}
                          className="flex-1 py-2 rounded-xl bg-slate-900 text-lime-300 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40">
                          <Banknote className="w-3.5 h-3.5" /> {r.payable > 0 ? `${L('Pay', 'دفع')} ${money(r.payable)}` : L('Fully settled', 'مسدد بالكامل')}
                        </button>
                        <button onClick={() => downloadReport(r)}
                          className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1.5">
                          <Download className="w-3.5 h-3.5" /> PDF
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'history' && (
          payments.length === 0 ? (
            <div className="text-center py-16 rounded-2xl border border-dashed border-slate-200">
              <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-semibold">{L('No payouts recorded yet', 'لا توجد دفعات')}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {payments
                .filter(p => !search.trim() || `${p.doctor?.full_name || ''} ${p.doctor?.full_name_ar || ''}`.toLowerCase().includes(search.toLowerCase()))
                .map(p => (
                  <div key={p.id} className="rounded-2xl border border-slate-200 bg-white p-4 flex items-start gap-3">
                    <Avatar name={p.doctor?.full_name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-bold text-slate-900 truncate">{docName(p.doctor)}</p>
                        <p className="font-bold text-slate-900 shrink-0">{money(p.payment_amount)}</p>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {new Date(p.payment_date).toLocaleDateString()} · {p.payment_method}
                        {p.payment_reference ? ` · ${p.payment_reference}` : ''}
                        {p.period_start ? ` · ${new Date(p.period_start).toLocaleDateString()} → ${new Date(p.period_end).toLocaleDateString()}` : ''}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700">{p.status}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 text-slate-600">
                          {(p.commission_payment_items || []).length} {L('items', 'عنصر')}
                        </span>
                      </div>
                      {p.notes && <p className="text-[11px] text-slate-500 mt-1.5">{p.notes}</p>}
                    </div>
                  </div>
                ))}
            </div>
          )
        )}

        {tab === 'rates' && (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-sm">{L('Commission rates', 'نسب العمولة')}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {L('The rate applied to each doctor’s collected production.', 'النسبة المطبقة على إنتاج كل طبيب المحصل.')}
              </p>
            </div>
            <div className="divide-y divide-slate-100">
              {doctors.map(d => (
                <div key={d.id} className="p-4 flex items-center gap-3">
                  <Avatar name={d.full_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900 text-sm truncate">{docName(d)}</p>
                    <p className="text-[11px] text-slate-500">{L('Current', 'الحالية')}: {d.commission_rate}%</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="number" min={0} max={100}
                      value={rateDraft[d.id] ?? String(d.commission_rate)}
                      onChange={e => setRateDraft({ ...rateDraft, [d.id]: e.target.value })}
                      className="w-20 px-2 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-lime-400" />
                    <button onClick={() => saveRate(d.id)} disabled={savingRateFor === d.id}
                      className="px-3 py-2 rounded-xl bg-slate-900 text-lime-300 text-xs font-bold disabled:opacity-60">
                      {savingRateFor === d.id ? '…' : L('Save', 'حفظ')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showPaymentModal && renderPaymentModal()}
    </div>
  );
}
