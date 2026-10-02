// @ts-nocheck
import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Activity,
  PieChart,
  BarChart3,
  Download,
  Printer,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCurrency } from '../../hooks/useCurrency';

interface AnalyticsData {
  financialOverview: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    previousRevenue: number;
    previousExpenses: number;
  };
  patientStats: {
    newPatients: number;
    returningPatients: number;
    retentionRate: number;
    totalAppointments: number;
    completedAppointments: number;
  };
  staffPerformance: Array<{
    staffId: string;
    name: string;
    appointments: number;
    revenue: number;
    completionRate: number;
  }>;
  monthlyData: Array<{
    month: string;
    revenue: number;
    expenses: number;
    profit: number;
  }>;
  expensesByCategory: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

export function AnalyticsDashboard() {
  const { profile } = useAuth();
  const { t, isRTL } = useLanguage();
  const { currencySymbol } = useCurrency();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('last_30_days');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.clinic_id) {
      loadAnalytics();
    }
  }, [profile?.clinic_id, dateRange]);

  const getDateRange = () => {
    const today = new Date();
    let start = new Date();

    switch (dateRange) {
      case 'last_30_days':
        start.setDate(today.getDate() - 30);
        break;
      case 'last_90_days':
        start.setDate(today.getDate() - 90);
        break;
      case 'last_6_months':
        start.setMonth(today.getMonth() - 6);
        break;
      case 'last_year':
        start.setFullYear(today.getFullYear() - 1);
        break;
      case 'custom':
        return { start: new Date(startDate), end: new Date(endDate) };
    }

    return { start, end: today };
  };

  const loadAnalytics = async () => {
    if (!profile?.clinic_id) return;
    setLoading(true);
    setError(null);

    try {
      const { start, end } = getDateRange();
      const startStr = start.toISOString().split('T')[0];
      const endStr = end.toISOString().split('T')[0];

      console.log('Loading analytics for period:', startStr, 'to', endStr);

      // Get profit margins
      const { data: profitData, error: profitError } = await supabase.rpc(
        'get_profit_margins',
        {
          p_clinic_id: profile.clinic_id,
          p_start_date: startStr,
          p_end_date: endStr,
        }
      );

      if (profitError) {
        console.error('Profit data error:', profitError);
        throw profitError;
      }

      console.log('Profit data:', profitData);

      // Get patient retention stats
      const { data: patientData, error: patientError } = await supabase.rpc(
        'get_patient_retention_stats',
        {
          p_clinic_id: profile.clinic_id,
          p_start_date: startStr,
          p_end_date: endStr,
        }
      );

      if (patientError) throw patientError;

      // Get staff performance
      const { data: staffData, error: staffError } = await supabase
        .from('analytics_staff_performance')
        .select('*')
        .eq('clinic_id', profile.clinic_id)
        .gte('period', startStr)
        .lte('period', endStr);

      if (staffError) throw staffError;

      // Get expense breakdown
      const { data: expenseData, error: expenseError } = await supabase
        .from('analytics_expense_analysis')
        .select('*')
        .eq('clinic_id', profile.clinic_id)
        .gte('period', startStr)
        .lte('period', endStr);

      if (expenseError) throw expenseError;

      // Get appointments stats
      const { data: appointmentData, error: appointmentError } = await supabase
        .from('analytics_appointment_stats')
        .select('*')
        .eq('clinic_id', profile.clinic_id)
        .gte('period', startStr)
        .lte('period', endStr);

      if (appointmentError) throw appointmentError;

      // Process data
      const totalRevenue = profitData?.reduce((sum, p) => sum + Number(p.total_revenue || 0), 0) || 0;
      const totalExpenses = profitData?.reduce((sum, p) => sum + Number(p.total_expenses || 0), 0) || 0;
      const netProfit = totalRevenue - totalExpenses;
      const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      console.log('Calculated totals:', {
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin,
      });

      const newPatients = patientData?.reduce((sum, p) => sum + Number(p.new_patients || 0), 0) || 0;
      const returningPatients = patientData?.reduce((sum, p) => sum + Number(p.returning_patients || 0), 0) || 0;
      const avgRetentionRate = patientData?.length
        ? patientData.reduce((sum, p) => sum + Number(p.retention_rate || 0), 0) / patientData.length
        : 0;

      const totalAppointments = appointmentData?.reduce((sum, a) => sum + Number(a.appointment_count || 0), 0) || 0;
      const completedAppointments = appointmentData
        ?.filter((a) => a.status === 'completed')
        .reduce((sum, a) => sum + Number(a.appointment_count || 0), 0) || 0;

      // Aggregate staff performance
      const staffMap = new Map();
      staffData?.forEach((s) => {
        const key = s.staff_id;
        if (!staffMap.has(key)) {
          staffMap.set(key, {
            staffId: s.staff_id,
            name: isRTL ? s.full_name_ar || s.full_name : s.full_name,
            appointments: 0,
            completedAppointments: 0,
            revenue: 0,
          });
        }
        const staff = staffMap.get(key);
        staff.appointments += Number(s.total_appointments || 0);
        staff.completedAppointments += Number(s.completed_appointments || 0);
        staff.revenue += Number(s.total_revenue_generated || 0);
      });

      const staffPerformance = Array.from(staffMap.values())
        .map((s) => ({
          ...s,
          completionRate: s.appointments > 0 ? (s.completedAppointments / s.appointments) * 100 : 0,
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Monthly data for charts
      const monthlyData = profitData?.map((p) => ({
        month: new Date(p.period).toLocaleDateString(isRTL ? 'ar-IQ' : 'en-US', {
          month: 'short',
          year: 'numeric',
        }),
        revenue: Number(p.total_revenue || 0),
        expenses: Number(p.total_expenses || 0),
        profit: Number(p.profit || 0),
      })) || [];

      // Expenses by category
      const expenseMap = new Map();
      expenseData?.forEach((e) => {
        if (!expenseMap.has(e.category)) {
          expenseMap.set(e.category, 0);
        }
        expenseMap.set(e.category, expenseMap.get(e.category) + Number(e.total_amount || 0));
      });

      const expenseTotal = Array.from(expenseMap.values()).reduce((sum, v) => sum + v, 0);
      const expensesByCategory = Array.from(expenseMap.entries())
        .map(([category, amount]) => ({
          category: t(`expense_category_${category}`) || category,
          amount,
          percentage: expenseTotal > 0 ? (amount / expenseTotal) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      setAnalyticsData({
        financialOverview: {
          totalRevenue,
          totalExpenses,
          netProfit,
          profitMargin,
          previousRevenue: 0,
          previousExpenses: 0,
        },
        patientStats: {
          newPatients,
          returningPatients,
          retentionRate: avgRetentionRate,
          totalAppointments,
          completedAppointments,
        },
        staffPerformance,
        monthlyData,
        expensesByCategory,
      });
    } catch (error: any) {
      console.error('Error loading analytics:', error);
      setError(error.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-IQ' : 'en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-IQ' : 'en-US', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{t('loading_analytics')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800 font-semibold mb-2">Error Loading Analytics</p>
        <p className="text-red-600 text-sm">{error}</p>
        <button
          onClick={() => loadAnalytics()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!analyticsData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">{t('no_data_available')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Date Range Selector */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900">{t('analytics_reporting')}</h2>
          <p className="text-gray-600 mt-1">{t('financial_overview')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent text-sm"
          >
            <option value="last_30_days">{t('last_30_days')}</option>
            <option value="last_90_days">{t('last_90_days')}</option>
            <option value="last_6_months">{t('last_6_months')}</option>
            <option value="last_year">{t('last_year')}</option>
            <option value="custom">{t('custom_range')}</option>
          </select>

          {dateRange === 'custom' && (
            <>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-sm"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 text-sm"
              />
              <button
                onClick={loadAnalytics}
                className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 text-sm"
              >
                {t('apply')}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Date Range Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {t('showing_data_for')}:{' '}
              <strong>
                {(() => {
                  const { start, end } = getDateRange();
                  return `${start.toLocaleDateString(isRTL ? 'ar-IQ' : 'en-US')} - ${end.toLocaleDateString(isRTL ? 'ar-IQ' : 'en-US')}`;
                })()}
              </strong>
            </span>
          </div>
          <span className="text-xs text-blue-700">
            {analyticsData.monthlyData.length > 0
              ? `${analyticsData.monthlyData.length} ${t('months')} of data`
              : t('no_data_in_period')}
          </span>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8 opacity-80" />
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-medium opacity-90">{t('total_revenue')}</h3>
          <p className="text-3xl font-bold mt-2">{formatCurrency(analyticsData.financialOverview.totalRevenue)}</p>
          <p className="text-xs mt-1 opacity-80">{t('iqd')}</p>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <TrendingDown className="w-8 h-8 opacity-80" />
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-medium opacity-90">{t('total_expenses')}</h3>
          <p className="text-3xl font-bold mt-2">{formatCurrency(analyticsData.financialOverview.totalExpenses)}</p>
          <p className="text-xs mt-1 opacity-80">{t('iqd')}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <BarChart3 className="w-8 h-8 opacity-80" />
            <TrendingUp className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-medium opacity-90">{t('net_profit')}</h3>
          <p className="text-3xl font-bold mt-2">{formatCurrency(analyticsData.financialOverview.netProfit)}</p>
          <p className="text-xs mt-1 opacity-80">{t('iqd')}</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <PieChart className="w-8 h-8 opacity-80" />
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-medium opacity-90">{t('avg_profit_margin')}</h3>
          <p className="text-3xl font-bold mt-2">{formatPercentage(analyticsData.financialOverview.profitMargin)}%</p>
          <p className="text-xs mt-1 opacity-80">{t('percentage')}</p>
        </div>
      </div>

      {/* Patient Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-sky-100 rounded-lg">
              <Users className="w-6 h-6 text-sky-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-700">{t('new_patients')}</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{analyticsData.patientStats.newPatients}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Users className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-700">{t('returning_patients')}</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{analyticsData.patientStats.returningPatients}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Activity className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-700">{t('retention_rate')}</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatPercentage(analyticsData.patientStats.retentionRate)}%</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Calendar className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-sm font-medium text-gray-700">{t('total_appointments')}</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{analyticsData.patientStats.totalAppointments}</p>
          <p className="text-sm text-gray-600 mt-1">
            {analyticsData.patientStats.completedAppointments} {t('completed')}
          </p>
        </div>
      </div>

      {/* Monthly Trends Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">{t('revenue_by_month')}</h3>
        <div className="space-y-4">
          {analyticsData.monthlyData.map((month, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{month.month}</span>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">{formatCurrency(month.revenue)} {t('iqd')}</span>
                  <span className="text-yellow-600">{formatCurrency(month.expenses)} {t('iqd')}</span>
                  <span className="text-blue-600 font-semibold">{formatCurrency(month.profit)} {t('iqd')}</span>
                </div>
              </div>
              <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-gray-100">
                <div
                  className="bg-green-500"
                  style={{ width: `${month.revenue > 0 ? (month.revenue / (month.revenue + month.expenses)) * 100 : 0}%` }}
                />
                <div
                  className="bg-red-500"
                  style={{ width: `${month.expenses > 0 ? (month.expenses / (month.revenue + month.expenses)) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Performing Staff */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">{t('top_performing_staff')}</h3>
        <div className="space-y-4">
          {analyticsData.staffPerformance.map((staff, index) => (
            <div key={staff.staffId} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-sky-600 text-white rounded-full flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{staff.name}</p>
                  <p className="text-sm text-gray-600">
                    {staff.appointments} {t('appointments')} • {formatPercentage(staff.completionRate)}% {t('completed')}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-sky-600">{formatCurrency(staff.revenue)}</p>
                <p className="text-xs text-gray-500">{t('iqd')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Expenses by Category */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">{t('expenses_by_category')}</h3>
        <div className="space-y-4">
          {analyticsData.expensesByCategory.map((expense, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">{expense.category}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">{formatPercentage(expense.percentage)}%</span>
                  <span className="text-sm font-semibold text-gray-900">{formatCurrency(expense.amount)} {t('iqd')}</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-sky-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${expense.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
