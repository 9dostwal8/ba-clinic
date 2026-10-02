// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Percent, TrendingUp, Download, RefreshCw, CheckCircle, Wallet, Stethoscope, FileText, Receipt } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatNumber } from '../../utils/numberFormatter';
import { useCurrency } from '../../hooks/useCurrency';
import { generateCommissionReportPDF, CommissionReportData } from '../../utils/commissionPdfGenerator';

interface CommissionSummary {
  total_revenue: number;
  total_commission: number;
  commission_rate: number;
  treatment_count: number;
  from_treatment_plans: number;
  from_invoices: number;
}

interface CommissionDetail {
  source_type: string;
  source_id: string;
  patient_id: string;
  patient_name: string;
  treatment_date: string;
  amount: number;
  commission_rate: number;
  commission_amount: number;
  description: string;
  is_paid?: boolean;
  payment_id?: string;
}

export function MyCommissionModule() {
  const { profile, user } = useAuth();
  const { t, language } = useLanguage();
  const { currencySymbol } = useCurrency();
  const [summary, setSummary] = useState<CommissionSummary | null>(null);
  const [details, setDetails] = useState<CommissionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [commissionRate, setCommissionRate] = useState<number>(30);

  useEffect(() => {
    if (profile?.clinic_id && user?.id) {
      loadCommissionRate();
      loadCommissionData();
    }
  }, [profile?.clinic_id, user?.id, startDate, endDate]);

  const loadCommissionRate = async () => {
    try {
      const { data, error } = await supabase
        .from('staff_permissions')
        .select('commission_rate')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setCommissionRate(data?.commission_rate || 30);
    } catch (error: any) {
      console.error('Error loading commission rate:', error);
    }
  };

  const loadCommissionData = async () => {
    if (!user?.id || !profile?.clinic_id) return;

    try {
      setLoading(true);

      const { data: summaryData, error: summaryError } = await supabase
        .rpc('get_doctor_commission_summary', {
          p_clinic_id: profile.clinic_id,
          p_doctor_id: user.id,
          p_start_date: startDate,
          p_end_date: endDate
        });

      if (summaryError) throw summaryError;
      setSummary(summaryData?.[0] || null);

      const { data: detailsData, error: detailsError } = await supabase
        .rpc('get_doctor_commission_details', {
          p_clinic_id: profile.clinic_id,
          p_doctor_id: user.id,
          p_start_date: startDate,
          p_end_date: endDate
        });

      if (detailsError) throw detailsError;

      const { data: paidItems } = await supabase
        .from('commission_payment_items')
        .select('source_id, payment_id')
        .in('payment_id',
          (await supabase
            .from('commission_payments')
            .select('id')
            .eq('doctor_id', user.id)
            .eq('status', 'paid')
          ).data?.map(p => p.id) || []
        );

      const paidSourceIds = new Set(paidItems?.map(item => item.source_id) || []);

      const detailsWithPaymentStatus = (detailsData || []).map(detail => ({
        ...detail,
        is_paid: paidSourceIds.has(detail.source_id)
      }));

      setDetails(detailsWithPaymentStatus);
    } catch (error: any) {
      console.error('Error loading commission data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!summary || !profile?.clinic_id || !user) return;

    try {
      const { data: clinicData } = await supabase
        .from('clinics')
        .select('name, name_ar')
        .eq('id', profile.clinic_id)
        .single();

      const reportData: CommissionReportData = {
        doctorName: profile.full_name || 'Doctor',
        doctorNameAr: profile.full_name_ar,
        clinicName: clinicData?.name || 'Clinic',
        clinicNameAr: clinicData?.name_ar,
        periodStart: startDate,
        periodEnd: endDate,
        items: details.map(d => ({
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
        totalRevenue: summary.total_revenue,
        totalCommission: summary.total_commission,
        totalTreatments: summary.treatment_count
      };

      await generateCommissionReportPDF(reportData);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      alert(`Error generating PDF: ${error.message}`);
    }
  };

  const ar = language === 'ar';
  const paidTotal = details.filter(d => d.is_paid).reduce((s, d) => s + (d.commission_amount || 0), 0);
  const pendingTotal = (summary?.total_commission || 0) - paidTotal;

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 text-xl font-black text-slate-900 sm:text-2xl">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white shadow-sm">
              <Percent className="h-4.5 w-4.5" strokeWidth={2.5} />
            </span>
            <span className="truncate">{ar ? 'عمولاتي' : 'My Commissions'}</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            {ar ? 'عرض تفاصيل عمولاتك' : 'Your earnings for the selected period'}
          </p>
        </div>
        {summary && details.length > 0 && (
          <button
            onClick={handleDownloadReport}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 sm:px-4 sm:text-sm"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">{ar ? 'تحميل التقرير' : 'Download Report'}</span>
            <span className="sm:hidden">PDF</span>
          </button>
        )}
      </div>

      {/* Period filter */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end sm:gap-3">
          <div className="min-w-0">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {ar ? 'من تاريخ' : 'From'}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <div className="min-w-0">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {ar ? 'إلى تاريخ' : 'To'}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            />
          </div>
          <button
            onClick={loadCommissionData}
            className="col-span-2 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 sm:col-span-1"
          >
            <RefreshCw className="h-4 w-4" />
            {ar ? 'تحديث' : 'Refresh'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <>
          {/* KPI strip */}
          <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-600 to-emerald-500 p-4 text-white shadow-sm">
              <div className="flex items-center justify-between">
                <Wallet className="h-5 w-5 opacity-80" />
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">{commissionRate}%</span>
              </div>
              <p className="mt-3 text-xl font-black tabular-nums sm:text-2xl">
                {formatNumber(summary?.total_commission || 0)}
                <span className="ml-1 text-xs font-semibold opacity-80">{currencySymbol}</span>
              </p>
              <p className="mt-0.5 text-[11px] font-medium opacity-90">{ar ? 'إجمالي العمولة' : 'Total commission'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <TrendingUp className="h-5 w-5 text-sky-600" />
              <p className="mt-3 text-xl font-black tabular-nums text-slate-900 sm:text-2xl">
                {formatNumber(summary?.total_revenue || 0)}
                <span className="ml-1 text-xs font-semibold text-slate-400">{currencySymbol}</span>
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">{ar ? 'إجمالي الإيرادات' : 'Revenue generated'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <Stethoscope className="h-5 w-5 text-violet-600" />
              <p className="mt-3 text-xl font-black tabular-nums text-slate-900 sm:text-2xl">{summary?.treatment_count || 0}</p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">{ar ? 'عدد العلاجات' : 'Treatments'}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <p className="mt-3 text-xl font-black tabular-nums text-slate-900 sm:text-2xl">
                {formatNumber(paidTotal)}
                <span className="ml-1 text-xs font-semibold text-slate-400">{currencySymbol}</span>
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                {ar ? 'مدفوع' : 'Paid out'}
                {pendingTotal > 0 && <span className="text-amber-600"> · {formatNumber(pendingTotal)} {ar ? 'معلق' : 'pending'}</span>}
              </p>
            </div>
          </div>

          {/* Details */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-bold text-slate-900">{ar ? 'تفاصيل العمولة' : 'Commission details'}</h2>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                {details.length} {ar ? 'عنصر' : 'items'}
              </span>
            </div>

            {details.length === 0 ? (
              <div className="p-10 text-center">
                <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                  <Percent className="h-7 w-7" />
                </span>
                <h3 className="text-sm font-bold text-slate-900">{ar ? 'لا توجد عمولات' : 'No commissions yet'}</h3>
                <p className="mt-1 text-xs text-slate-500">
                  {ar ? 'لم يتم حساب أي عمولات في هذه الفترة' : 'No commissions calculated for this period'}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {details.map((detail, index) => (
                  <li key={index} className="px-4 py-3 transition hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                        detail.source_type === 'treatment_visit' ? 'bg-sky-50 text-sky-600' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {detail.source_type === 'treatment_visit' ? <FileText className="h-4 w-4" /> : <Receipt className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{detail.patient_name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {detail.description} · {new Date(detail.treatment_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-black tabular-nums text-emerald-600">
                          +{formatNumber(detail.commission_amount)} {currencySymbol}
                        </p>
                        <div className="mt-0.5 flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-semibold">{detail.commission_rate}%</span>
                          <span>{formatNumber(detail.amount)} {currencySymbol}</span>
                          {detail.is_paid && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 font-semibold text-emerald-700">
                              <CheckCircle className="h-2.5 w-2.5" /> {ar ? 'مدفوع' : 'Paid'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {details.length > 0 && (
              <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-xs font-semibold text-slate-500">
                  {ar ? 'إجمالي الإيرادات' : 'Revenue'}: <span className="tabular-nums text-slate-900">{formatNumber(summary?.total_revenue || 0)} {currencySymbol}</span>
                </p>
                <p className="text-sm font-black tabular-nums text-emerald-600">
                  {formatNumber(summary?.total_commission || 0)} {currencySymbol}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
