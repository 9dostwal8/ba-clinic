// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { DollarSign, Plus, TrendingDown, Calendar, FileText, Edit2, Trash2, X, Save, Percent, Calculator, Download } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCurrency } from '../../hooks/useCurrency';
import { AnalyticsDashboard } from './AnalyticsDashboard';
import { generateCommissionReportPDF, CommissionReportData } from '../../utils/commissionPdfGenerator';
import { formatNumber } from '../../utils/numberFormatter';

interface Expense {
  id: string;
  expense_date: string;
  category: string;
  description: string;
  description_ar: string;
  amount: number;
  payment_method: string;
  notes: string;
  created_at: string;
}

interface Purchase {
  id: string;
  purchase_date: string;
  supplier: string;
  items: any[];
  total_amount: number;
  payment_status: string;
  payment_method: string;
  invoice_number: string;
  notes: string;
  created_at: string;
}

interface Salary {
  id: string;
  staff_id: string;
  month: string;
  base_salary: number;
  bonuses: number;
  deductions: number;
  net_salary: number;
  payment_date: string;
  payment_status: string;
  notes: string;
  staff?: {
    full_name: string;
    role: string;
  };
}

interface TreatmentDetail {
  treatment_name: string;
  treatment_name_ar: string;
  count: number;
  total_amount: number;
  commission_amount: number;
  commission_percentage: number;
}

interface DoctorCommissionSummary {
  doctor_id: string;
  doctor_name: string;
  total_treatments: number;
  total_revenue: number;
  total_commission: number;
  period_start: string;
  period_end: string;
  treatments: TreatmentDetail[];
}

export function AccountingModule() {
  const { profile } = useAuth();
  const { t, language } = useLanguage();
  const { currencySymbol } = useCurrency();
  const [activeTab, setActiveTab] = useState<'analytics' | 'expenses' | 'purchases' | 'salaries' | 'reports'>('analytics');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [salaries, setSalaries] = useState<Salary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [commissionSummaries, setCommissionSummaries] = useState<DoctorCommissionSummary[]>([]);
  const [commissionStartDate, setCommissionStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [commissionEndDate, setCommissionEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [expandedDoctorId, setExpandedDoctorId] = useState<string | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [selectedDoctorData, setSelectedDoctorData] = useState<DoctorCommissionSummary | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [salaryStatusFilter, setSalaryStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');

  const [expenseForm, setExpenseForm] = useState({
    expense_date: new Date().toISOString().split('T')[0],
    category: 'supplies',
    description: '',
    description_ar: '',
    amount: '',
    payment_method: 'cash',
    notes: '',
  });

  const [salaryForm, setSalaryForm] = useState({
    staff_id: '',
    month: new Date().toISOString().slice(0, 7),
    base_salary: '',
    bonuses: '0',
    deductions: '0',
    payment_date: '',
    payment_status: 'pending',
    notes: '',
  });

  useEffect(() => {
    if (profile?.clinic_id) {
      loadData();
      loadStaff();
      loadDoctors();
      if (activeTab === 'commissions') {
        setSelectedDoctorId(null);
        setSelectedDoctorData(null);
        setLoading(false);
      }
    }
  }, [profile?.clinic_id, activeTab]);

  useEffect(() => {
    if (selectedDoctorId && activeTab === 'commissions') {
      loadDoctorCommissionDetail(selectedDoctorId);
    }
  }, [selectedDoctorId, commissionStartDate, commissionEndDate]);

  const loadData = async () => {
    if (!profile?.clinic_id) return;
    setLoading(true);

    try {
      if (activeTab === 'expenses') {
        const { data, error } = await supabase
          .from('expenses')
          .select('*')
          .eq('clinic_id', profile.clinic_id)
          .order('expense_date', { ascending: false });
        if (error) throw error;
        setExpenses(data || []);
      } else if (activeTab === 'purchases') {
        const { data, error } = await supabase
          .from('purchases')
          .select('*')
          .eq('clinic_id', profile.clinic_id)
          .order('purchase_date', { ascending: false });
        if (error) throw error;
        setPurchases(data || []);
      } else if (activeTab === 'salaries') {
        const { data, error } = await supabase
          .from('staff_salaries')
          .select(`
            *,
            staff:users(full_name, role)
          `)
          .eq('clinic_id', profile.clinic_id)
          .order('month', { ascending: false });
        if (error) throw error;
        setSalaries(data || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStaff = async () => {
    if (!profile?.clinic_id) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, role')
        .eq('clinic_id', profile.clinic_id)
        .eq('is_active', true)
        .in('role', ['clinic_admin', 'doctor', 'receptionist']);
      if (error) throw error;
      setStaff(data || []);
    } catch (error) {
      console.error('Error loading staff:', error);
    }
  };

  const loadDoctors = async () => {
    if (!profile?.clinic_id) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, full_name, full_name_ar')
        .eq('clinic_id', profile.clinic_id)
        .eq('is_active', true)
        .eq('role', 'doctor');
      if (error) throw error;
      setDoctors(data || []);
    } catch (error) {
      console.error('Error loading doctors:', error);
    }
  };

  const loadDoctorCommissionDetail = async (doctorId: string) => {
    if (!profile?.clinic_id) return;
    setLoading(true);

    try {
      const periodStart = commissionStartDate;
      const periodEnd = commissionEndDate;

      const { data: doctor, error: doctorError } = await supabase
        .from('users')
        .select('id, full_name, full_name_ar')
        .eq('id', doctorId)
        .single();

      if (doctorError) throw doctorError;

      const { data: commissionCalcs, error: calcError } = await supabase
        .from('commission_calculations')
        .select(`
          *,
          commission_calculation_items(
            id,
            treatment_amount,
            commission_amount,
            commission_type,
            commission_rate,
            treatment_date,
            treatment_type_id,
            treatment_types(name, name_ar)
          )
        `)
        .eq('clinic_id', profile.clinic_id)
        .eq('doctor_id', doctorId)
        .gte('calculation_period_end', periodStart)
        .lte('calculation_period_start', periodEnd)
        .gt('total_treatments', 0);

      if (calcError) throw calcError;

      console.log('Commission calculations:', commissionCalcs);

      let totalRevenue = 0;
      let totalCommission = 0;
      let treatmentCount = 0;
      const treatmentDetailsMap = new Map<string, TreatmentDetail>();

      for (const calc of commissionCalcs || []) {
        totalRevenue += Number(calc.total_revenue || 0);
        totalCommission += Number(calc.total_commission || 0);
        treatmentCount += Number(calc.total_treatments || 0);

        for (const item of calc.commission_calculation_items || []) {
          const treatmentName = item.treatment_types?.name || 'General Treatment';
          const treatmentNameAr = item.treatment_types?.name_ar || 'علاج عام';
          const key = item.treatment_type_id || 'general';

          if (treatmentDetailsMap.has(key)) {
            const existing = treatmentDetailsMap.get(key)!;
            existing.count += 1;
            existing.total_amount += Number(item.treatment_amount || 0);
            existing.commission_amount += Number(item.commission_amount || 0);
          } else {
            treatmentDetailsMap.set(key, {
              treatment_name: treatmentName,
              treatment_name_ar: treatmentNameAr,
              count: 1,
              total_amount: Number(item.treatment_amount || 0),
              commission_amount: Number(item.commission_amount || 0),
              commission_percentage: Number(item.commission_rate || 0)
            });
          }
        }
      }

      const treatmentDetails = Array.from(treatmentDetailsMap.values());

      const doctorData: DoctorCommissionSummary = {
        doctor_id: doctor.id,
        doctor_name: language === 'ar' && doctor.full_name_ar ? doctor.full_name_ar : doctor.full_name,
        total_treatments: treatmentCount,
        total_revenue: totalRevenue,
        total_commission: totalCommission,
        period_start: periodStart,
        period_end: periodEnd,
        treatments: treatmentDetails
      };

      console.log('Doctor commission data:', doctorData);
      setSelectedDoctorData(doctorData);
    } catch (error) {
      console.error('Error loading doctor commission detail:', error);
      alert(t('error_loading_data'));
    } finally {
      setLoading(false);
    }
  };

  const loadCommissionSummaries = async () => {
    // This function is no longer used, keeping for compatibility
  };

  const loadCommissionSummariesOLD = async () => {
    if (!profile?.clinic_id) return;
    setLoading(true);

    try {
      const periodStart = commissionStartDate;
      const periodEnd = commissionEndDate;

      const { data: doctorsList, error: doctorsError } = await supabase
        .from('users')
        .select('id, full_name, full_name_ar')
        .eq('clinic_id', profile.clinic_id)
        .eq('is_active', true)
        .eq('role', 'doctor');

      if (doctorsError) throw doctorsError;

      console.log('Found doctors:', doctorsList?.length, doctorsList);
      console.log('Period:', periodStart, 'to', periodEnd);

      const summaries: DoctorCommissionSummary[] = [];

      for (const doctor of doctorsList || []) {
        const { data: invoices, error: invoicesError } = await supabase
          .from('invoices')
          .select('id, total, invoice_date, items')
          .eq('clinic_id', profile.clinic_id)
          .eq('doctor_id', doctor.id)
          .in('payment_status', ['paid', 'partial'])
          .gte('invoice_date', periodStart)
          .lte('invoice_date', periodEnd);

        if (invoicesError) {
          console.error('Error loading doctor invoices:', invoicesError);
          continue;
        }

        const { data: commissionRules } = await supabase
          .from('commission_rules')
          .select('*')
          .eq('clinic_id', profile.clinic_id)
          .eq('doctor_id', doctor.id)
          .eq('is_active', true);

        console.log(`Doctor ${doctor.full_name}: ${invoices?.length || 0} invoices, ${commissionRules?.length || 0} commission rules`);

        let totalRevenue = 0;
        let totalCommission = 0;
        let treatmentCount = 0;
        const treatmentDetailsMap = new Map<string, TreatmentDetail>();

        const { data: treatmentTypes } = await supabase
          .from('treatment_types')
          .select('id, name, name_ar')
          .eq('clinic_id', profile.clinic_id);

        const treatmentTypesMap = new Map(treatmentTypes?.map(tt => [tt.id, tt]) || []);

        for (const invoice of invoices || []) {
          const items = invoice.items || [];

          for (const item of items) {
            const treatmentTypeId = item.treatment_type_id;
            const quantity = item.quantity || 1;
            const unitPrice = item.unitPrice || 0;
            const itemTotal = quantity * unitPrice;

            totalRevenue += itemTotal;
            treatmentCount++;

            let matchingRule = null;
            let commissionAmount = 0;
            let commissionPercentage = 0;

            if (treatmentTypeId && commissionRules) {
              matchingRule = commissionRules.find(rule => {
                if (rule.applies_to_all_treatments) {
                  if (rule.excluded_treatment_types && rule.excluded_treatment_types.includes(treatmentTypeId)) {
                    return false;
                  }
                  return true;
                }

                if (rule.treatment_type_id === treatmentTypeId) {
                  return true;
                }

                if (rule.included_treatment_types && rule.included_treatment_types.includes(treatmentTypeId)) {
                  return true;
                }

                return false;
              });
            }

            if (matchingRule) {
              if (matchingRule.commission_type === 'percentage') {
                commissionAmount = (itemTotal * matchingRule.commission_value / 100);
                commissionPercentage = matchingRule.commission_value;
                totalCommission += commissionAmount;
              } else {
                commissionAmount = matchingRule.commission_value;
                totalCommission += commissionAmount;
              }
            }

            const treatmentType = treatmentTypesMap.get(treatmentTypeId);
            const treatmentName = treatmentType?.name || 'Unknown Treatment';
            const treatmentNameAr = treatmentType?.name_ar || 'علاج غير معروف';

            if (treatmentDetailsMap.has(treatmentTypeId)) {
              const existing = treatmentDetailsMap.get(treatmentTypeId)!;
              existing.count += quantity;
              existing.total_amount += itemTotal;
              existing.commission_amount += commissionAmount;
            } else {
              treatmentDetailsMap.set(treatmentTypeId, {
                treatment_name: treatmentName,
                treatment_name_ar: treatmentNameAr,
                count: quantity,
                total_amount: itemTotal,
                commission_amount: commissionAmount,
                commission_percentage: commissionPercentage,
              });
            }
          }
        }

        const treatments = Array.from(treatmentDetailsMap.values()).sort((a, b) => b.total_amount - a.total_amount);

        console.log(`Doctor ${doctor.full_name}: Revenue=${totalRevenue}, Commission=${totalCommission}`);

        summaries.push({
          doctor_id: doctor.id,
          doctor_name: doctor.full_name,
          total_treatments: treatmentCount,
          total_revenue: totalRevenue,
          total_commission: totalCommission,
          period_start: periodStart,
          period_end: periodEnd,
          treatments,
        });
      }

      setCommissionSummaries(summaries);
    } catch (error) {
      console.error('Error loading commission summaries:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDoctorCommission = async (doctorId: string) => {
    if (!profile?.clinic_id) return;

    try {
      const periodStart = commissionStartDate;
      const periodEnd = commissionEndDate;

      const { error } = await supabase.rpc('auto_calculate_doctor_commission', {
        p_clinic_id: profile.clinic_id,
        p_doctor_id: doctorId,
        p_period_start: periodStart,
        p_period_end: periodEnd,
      });

      if (error) throw error;

      alert('Commission calculation created successfully!');
      await loadCommissionSummaries();
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    }
  };

  const downloadCommissionPDF = async (doctorId: string, doctorName: string) => {
    if (!profile?.clinic_id) return;

    try {
      const periodStart = commissionStartDate;
      const periodEnd = commissionEndDate;

      const { data: clinicData } = await supabase
        .from('clinics')
        .select('name, name_ar, logo_url')
        .eq('id', profile.clinic_id)
        .single();

      const { data: doctorData } = await supabase
        .from('users')
        .select('full_name, full_name_ar')
        .eq('id', doctorId)
        .single();

      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, invoice_date, patient_id, items, patients(full_name, full_name_ar)')
        .eq('clinic_id', profile.clinic_id)
        .eq('doctor_id', doctorId)
        .in('payment_status', ['paid', 'partial'])
        .gte('invoice_date', periodStart)
        .lte('invoice_date', periodEnd);

      const { data: commissionRules } = await supabase
        .from('commission_rules')
        .select('*, treatment_types(name, name_ar)')
        .eq('clinic_id', profile.clinic_id)
        .eq('doctor_id', doctorId)
        .eq('is_active', true);

      const items: CommissionReportData['items'] = [];
      let totalRevenue = 0;
      let totalCommission = 0;

      for (const invoice of invoices || []) {
        const invoiceItems = invoice.items || [];

        for (const item of invoiceItems) {
          const treatmentTypeId = item.treatment_type_id;
          const quantity = item.quantity || 1;
          const unitPrice = item.unitPrice || 0;
          const itemTotal = quantity * unitPrice;

          totalRevenue += itemTotal;

          let matchingRule = null;
          let treatmentTypeName = item.description || 'Unknown';
          let treatmentTypeNameAr = '';

          if (treatmentTypeId && commissionRules) {
            matchingRule = commissionRules.find(rule => {
              if (rule.applies_to_all_treatments) {
                if (rule.excluded_treatment_types && rule.excluded_treatment_types.includes(treatmentTypeId)) {
                  return false;
                }
                return true;
              }

              if (rule.treatment_type_id === treatmentTypeId) {
                return true;
              }

              if (rule.included_treatment_types && rule.included_treatment_types.includes(treatmentTypeId)) {
                return true;
              }

              return false;
            });

            if (matchingRule && matchingRule.treatment_types) {
              treatmentTypeName = matchingRule.treatment_types.name;
              treatmentTypeNameAr = matchingRule.treatment_types.name_ar;
            }
          }

          let commissionAmount = 0;
          if (matchingRule) {
            if (matchingRule.commission_type === 'percentage') {
              commissionAmount = (itemTotal * matchingRule.commission_value / 100);
            } else {
              commissionAmount = matchingRule.commission_value;
            }
            totalCommission += commissionAmount;

            items.push({
              date: invoice.invoice_date,
              patientName: (invoice as any).patients?.full_name || 'Unknown',
              treatmentType: treatmentTypeName,
              treatmentTypeAr: treatmentTypeNameAr,
              toothNumber: item.toothNumber?.toString() || '',
              quantity: quantity,
              unitPrice: unitPrice,
              totalAmount: itemTotal,
              commissionRate: matchingRule.commission_value,
              commissionType: matchingRule.commission_type,
              commissionAmount: commissionAmount,
            });
          }
        }
      }

      const reportData: CommissionReportData = {
        doctorName: doctorData?.full_name || doctorName,
        doctorNameAr: doctorData?.full_name_ar,
        clinicName: clinicData?.name || 'Clinic',
        clinicNameAr: clinicData?.name_ar,
        clinicLogo: clinicData?.logo_url,
        periodStart,
        periodEnd,
        items,
        totalRevenue,
        totalCommission,
        totalTreatments: items.length,
      };

      await generateCommissionReportPDF(reportData);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      alert(`Error generating PDF: ${error.message}`);
    }
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.clinic_id || !profile?.id) return;

    try {
      const expenseData = {
        clinic_id: profile.clinic_id,
        expense_date: expenseForm.expense_date,
        category: expenseForm.category,
        description: expenseForm.description,
        description_ar: expenseForm.description_ar || null,
        amount: parseFloat(expenseForm.amount),
        payment_method: expenseForm.payment_method,
        notes: expenseForm.notes || null,
        created_by: profile.id,
      };

      if (editingId) {
        const { error } = await supabase
          .from('expenses')
          .update(expenseData)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('expenses').insert(expenseData);
        if (error) throw error;
      }

      await loadData();
      resetForm();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.clinic_id || !profile?.id) return;

    try {
      const baseSalary = parseFloat(salaryForm.base_salary);
      const bonuses = parseFloat(salaryForm.bonuses);
      const deductions = parseFloat(salaryForm.deductions);
      const netSalary = baseSalary + bonuses - deductions;

      const salaryData = {
        clinic_id: profile.clinic_id,
        staff_id: salaryForm.staff_id,
        month: salaryForm.month + '-01',
        base_salary: baseSalary,
        bonuses: bonuses,
        deductions: deductions,
        net_salary: netSalary,
        payment_date: salaryForm.payment_date || null,
        payment_status: salaryForm.payment_status,
        notes: salaryForm.notes || null,
        created_by: profile.id,
      };

      if (editingId) {
        const { error } = await supabase
          .from('staff_salaries')
          .update(salaryData)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('staff_salaries').insert(salaryData);
        if (error) throw error;
      }

      await loadData();
      resetForm();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDelete = async (id: string, table: string) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      await loadData();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const editExpense = (expense: Expense) => {
    setEditingId(expense.id);
    setExpenseForm({
      expense_date: expense.expense_date.split('T')[0],
      category: expense.category,
      description: expense.description,
      description_ar: expense.description_ar || '',
      amount: expense.amount.toString(),
      payment_method: expense.payment_method,
      notes: expense.notes || '',
    });
    setShowForm(true);
  };

  const editSalary = (salary: Salary) => {
    setEditingId(salary.id);
    setSalaryForm({
      staff_id: salary.staff_id,
      month: salary.month.slice(0, 7),
      base_salary: salary.base_salary.toString(),
      bonuses: salary.bonuses.toString(),
      deductions: salary.deductions.toString(),
      payment_date: salary.payment_date ? salary.payment_date.split('T')[0] : '',
      payment_status: salary.payment_status,
      notes: salary.notes || '',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setExpenseForm({
      expense_date: new Date().toISOString().split('T')[0],
      category: 'supplies',
      description: '',
      description_ar: '',
      amount: '',
      payment_method: 'cash',
      notes: '',
    });
    setSalaryForm({
      staff_id: '',
      month: new Date().toISOString().slice(0, 7),
      base_salary: '',
      bonuses: '0',
      deductions: '0',
      payment_date: '',
      payment_status: 'pending',
      notes: '',
    });
    setEditingId(null);
    setShowForm(false);
  };

  const calculateTotals = () => {
    const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount.toString()), 0);
    const totalPurchases = purchases.reduce((sum, pur) => sum + parseFloat(pur.total_amount.toString()), 0);
    const totalSalaries = salaries
      .filter(s => s.payment_status === 'paid')
      .reduce((sum, sal) => sum + parseFloat(sal.net_salary.toString()), 0);
    return { totalExpenses, totalPurchases, totalSalaries };
  };

  const totals = calculateTotals();

  if (loading && activeTab !== 'reports') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('loading')}</div>
      </div>
    );
  }

  const ar = language === 'ar';
  const outflow = totals.totalExpenses + totals.totalSalaries;
  const monthKey = new Date().toISOString().slice(0, 7);
  const monthExpenses = expenses
    .filter((e) => (e.expense_date || '').slice(0, 7) === monthKey)
    .reduce((s, e) => s + parseFloat(String(e.amount || 0)), 0);
  const pendingSalaries = salaries.filter((s) => s.payment_status !== 'paid');
  const pendingSalaryTotal = pendingSalaries.reduce((s, x) => s + parseFloat(String(x.net_salary || 0)), 0);

  const filteredExpenses = expenses.filter((e) => {
    const q = search.trim().toLowerCase();
    const matchQ =
      !q ||
      (e.description || '').toLowerCase().includes(q) ||
      (e.description_ar || '').toLowerCase().includes(q) ||
      (e.notes || '').toLowerCase().includes(q) ||
      (e.category || '').toLowerCase().includes(q);
    const matchC = categoryFilter === 'all' || e.category === categoryFilter;
    return matchQ && matchC;
  });

  const filteredSalaries = salaries.filter((s) => {
    const q = search.trim().toLowerCase();
    const name = (s.staff?.full_name || '').toLowerCase();
    const matchQ = !q || name.includes(q);
    const matchS = salaryStatusFilter === 'all' || (salaryStatusFilter === 'paid' ? s.payment_status === 'paid' : s.payment_status !== 'paid');
    return matchQ && matchS;
  });

  const tabs: { key: typeof activeTab; label: string; icon: any; count?: number }[] = [
    { key: 'analytics', label: ar ? 'التحليلات' : 'Overview', icon: TrendingDown },
    { key: 'expenses', label: ar ? 'المصروفات' : 'Expenses', icon: FileText, count: expenses.length },
    { key: 'salaries', label: ar ? 'الرواتب' : 'Salaries', icon: DollarSign, count: salaries.length },
    { key: 'reports', label: ar ? 'التقارير' : 'Reports', icon: Calculator },
  ];

  const kpis = [
    { label: ar ? 'مصروفات الشهر' : 'This month', value: monthExpenses, tone: 'navy' },
    { label: ar ? 'إجمالي المصروفات' : 'Total expenses', value: totals.totalExpenses, tone: 'plain' },
    { label: ar ? 'رواتب مدفوعة' : 'Salaries paid', value: totals.totalSalaries, tone: 'plain' },
    { label: ar ? 'إجمالي الصرف' : 'Total outflow', value: outflow, tone: 'plain' },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      {/* Header */}
      <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2.5 text-xl font-black text-slate-900 sm:text-2xl">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-white shadow-sm">
              <Calculator className="h-4.5 w-4.5" strokeWidth={2.5} />
            </span>
            <span className="truncate">{ar ? 'المحاسبة والتقارير' : 'Accounting & finance'}</span>
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            {ar ? 'مصروفات العيادة والرواتب والتقارير المالية' : 'Clinic expenses, payroll and financial reports'}
          </p>
        </div>
        {activeTab !== 'reports' && activeTab !== 'analytics' && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 sm:px-4 sm:text-sm"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">
              {ar ? 'إضافة' : 'Add'} {activeTab === 'expenses' ? (ar ? 'مصروف' : 'expense') : ar ? 'راتب' : 'salary'}
            </span>
            <span className="sm:hidden">{ar ? 'إضافة' : 'Add'}</span>
          </button>
        )}
      </div>

      {/* KPI strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className={`rounded-2xl border p-4 shadow-sm ${
              k.tone === 'navy'
                ? 'border-slate-900 bg-gradient-to-br from-slate-900 to-slate-800 text-white'
                : 'border-slate-200 bg-white'
            }`}
          >
            <p className={`text-xl font-black tabular-nums sm:text-2xl ${k.tone === 'navy' ? '' : 'text-slate-900'}`}>
              {formatNumber(k.value)}
              <span className={`ml-1 text-xs font-semibold ${k.tone === 'navy' ? 'opacity-80' : 'text-slate-400'}`}>{currencySymbol}</span>
            </p>
            <p className={`mt-0.5 text-[11px] font-medium ${k.tone === 'navy' ? 'opacity-90' : 'text-slate-500'}`}>{k.label}</p>
          </div>
        ))}
      </div>

      {pendingSalaryTotal > 0 && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-amber-500 text-white">
            <DollarSign className="h-4 w-4" />
          </span>
          <p className="min-w-0 flex-1 text-xs font-semibold text-amber-900 sm:text-sm">
            {pendingSalaries.length} {ar ? 'راتب معلق' : 'salaries pending'} ·{' '}
            <span className="tabular-nums">{formatNumber(pendingSalaryTotal)} {currencySymbol}</span>
          </p>
          <button
            onClick={() => { setActiveTab('salaries'); setSalaryStatusFilter('pending'); }}
            className="shrink-0 rounded-xl bg-amber-500 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-amber-600"
          >
            {ar ? 'عرض' : 'Review'}
          </button>
        </div>
      )}

      {/* Segmented tabs */}
      <div className="sticky top-0 z-10 -mx-4 mb-5 bg-slate-50/90 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-2xl sm:px-2">
        <div className="flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-sm">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex flex-1 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                  active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? 'bg-white/20' : 'bg-slate-100 text-slate-600'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search & filters */}
      {(activeTab === 'expenses' || activeTab === 'salaries') && (
        <div className="mb-4 space-y-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={activeTab === 'expenses' ? (ar ? 'بحث في المصروفات...' : 'Search expenses...') : ar ? 'بحث باسم الموظف...' : 'Search staff...'}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-100"
          />
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {activeTab === 'expenses'
              ? ['all', 'rent', 'utilities', 'salaries', 'maintenance', 'supplies', 'other'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategoryFilter(c)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold capitalize transition ${
                      categoryFilter === c ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {c === 'all' ? (ar ? 'الكل' : 'All') : c}
                  </button>
                ))
              : (['all', 'pending', 'paid'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSalaryStatusFilter(s)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[11px] font-semibold capitalize transition ${
                      salaryStatusFilter === s ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {s === 'all' ? (ar ? 'الكل' : 'All') : s}
                  </button>
                ))}
          </div>
        </div>
      )}

      {activeTab === 'analytics' && <AnalyticsDashboard />}

      {showForm && activeTab === 'expenses' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingId ? 'Edit Expense' : 'Add New Expense'}
                </h2>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleExpenseSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={expenseForm.expense_date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                    <select
                      required
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    >
                      <option value="rent">{t('expense_category_rent')}</option>
                      <option value="utilities">{t('expense_category_utilities')}</option>
                      <option value="salaries">{t('expense_category_salaries')}</option>
                      <option value="maintenance">{t('expense_category_maintenance')}</option>
                      <option value="supplies">{t('expense_category_supplies')}</option>
                      <option value="other">{t('gender_other')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                    <input
                      type="text"
                      required
                      value={expenseForm.description}
                      onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description (Arabic)</label>
                    <input
                      type="text"
                      dir="rtl"
                      value={expenseForm.description_ar}
                      onChange={(e) => setExpenseForm({ ...expenseForm, description_ar: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount ({currencySymbol}) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                    <select
                      required
                      value={expenseForm.payment_method}
                      onChange={(e) => setExpenseForm({ ...expenseForm, payment_method: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    >
                      <option value="cash">{t('payment_method_cash')}</option>
                      <option value="card">{t('payment_method_card')}</option>
                      <option value="transfer">{t('payment_method_bank_transfer')}</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('notes')}</label>
                    <textarea
                      value={expenseForm.notes}
                      onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
                  >
                    <Save className="w-5 h-5" />
                    {editingId ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showForm && activeTab === 'salaries' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingId ? 'Edit Salary Payment' : 'Add Salary Payment'}
                </h2>
                <button onClick={resetForm} className="text-gray-400 hover:text-gray-600">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSalarySubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member *</label>
                    <select
                      required
                      value={salaryForm.staff_id}
                      onChange={(e) => setSalaryForm({ ...salaryForm, staff_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    >
                      <option value="">{t('select_staff')}</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.full_name} ({s.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Month *</label>
                    <input
                      type="month"
                      required
                      value={salaryForm.month}
                      onChange={(e) => setSalaryForm({ ...salaryForm, month: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Salary ({currencySymbol}) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={salaryForm.base_salary}
                      onChange={(e) => setSalaryForm({ ...salaryForm, base_salary: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bonuses ({currencySymbol})</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={salaryForm.bonuses}
                      onChange={(e) => setSalaryForm({ ...salaryForm, bonuses: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deductions ({currencySymbol})</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={salaryForm.deductions}
                      onChange={(e) => setSalaryForm({ ...salaryForm, deductions: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Net Salary ({currencySymbol})
                    </label>
                    <input
                      type="text"
                      disabled
                      value={(
                        parseFloat(salaryForm.base_salary || '0') +
                        parseFloat(salaryForm.bonuses || '0') -
                        parseFloat(salaryForm.deductions || '0')
                      ).toFixed(2)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status *</label>
                    <select
                      required
                      value={salaryForm.payment_status}
                      onChange={(e) => setSalaryForm({ ...salaryForm, payment_status: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    >
                      <option value="pending">{t('payment_status_pending')}</option>
                      <option value="paid">{t('payment_status_paid')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('payment_date')}</label>
                    <input
                      type="date"
                      value={salaryForm.payment_date}
                      onChange={(e) => setSalaryForm({ ...salaryForm, payment_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('notes')}</label>
                    <textarea
                      value={salaryForm.notes}
                      onChange={(e) => setSalaryForm({ ...salaryForm, notes: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors"
                  >
                    <Save className="w-5 h-5" />
                    {editingId ? 'Update' : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-bold text-slate-900">{ar ? 'المصروفات' : 'Expenses'}</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {formatNumber(filteredExpenses.reduce((s, e) => s + parseFloat(String(e.amount || 0)), 0))} {currencySymbol}
            </span>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="p-10 text-center">
              <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                <TrendingDown className="h-7 w-7" />
              </span>
              <h3 className="text-sm font-bold text-slate-900">{ar ? 'لا توجد مصروفات' : 'No expenses'}</h3>
              <p className="mt-1 text-xs text-slate-500">
                {ar ? 'ابدأ بتسجيل مصروفات العيادة' : 'Start tracking your clinic expenses'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredExpenses.map((expense) => (
                <li key={expense.id} className="px-4 py-3 transition hover:bg-slate-50">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600">
                      <TrendingDown className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{expense.description}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-semibold capitalize">{expense.category}</span>
                        <span>{new Date(expense.expense_date).toLocaleDateString()}</span>
                        <span className="capitalize">· {expense.payment_method}</span>
                      </div>
                      {expense.notes && <p className="mt-1 truncate text-xs text-slate-400">{expense.notes}</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-black tabular-nums text-slate-900">
                        -{formatNumber(expense.amount)} {currencySymbol}
                      </p>
                      <div className="mt-1 flex items-center justify-end gap-1">
                        <button
                          onClick={() => editExpense(expense)}
                          className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id, 'expenses')}
                          className="grid h-7 w-7 place-items-center rounded-lg text-rose-500 transition hover:bg-rose-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'salaries' && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-bold text-slate-900">{ar ? 'الرواتب' : 'Payroll'}</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
              {formatNumber(filteredSalaries.reduce((s, x) => s + parseFloat(String(x.net_salary || 0)), 0))} {currencySymbol}
            </span>
          </div>

          {filteredSalaries.length === 0 ? (
            <div className="p-10 text-center">
              <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
                <DollarSign className="h-7 w-7" />
              </span>
              <h3 className="text-sm font-bold text-slate-900">{ar ? 'لا توجد رواتب' : 'No salary records'}</h3>
              <p className="mt-1 text-xs text-slate-500">{ar ? 'ابدأ بإدارة رواتب الموظفين' : 'Start managing staff salaries'}</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredSalaries.map((salary) => {
                const paid = salary.payment_status === 'paid';
                const name = salary.staff?.full_name || 'Unknown';
                return (
                  <li key={salary.id} className="px-4 py-3 transition hover:bg-slate-50">
                    <div className="flex items-start gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-900 text-xs font-black text-white">
                        {name.slice(0, 2).toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center gap-1.5">
                          <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                          <span
                            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                              paid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {paid ? (ar ? 'مدفوع' : 'Paid') : ar ? 'معلق' : 'Pending'}
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-semibold capitalize">{salary.staff?.role || ''}</span>
                          <span>{new Date(salary.month).toLocaleDateString('en', { year: 'numeric', month: 'short' })}</span>
                          <span>· {ar ? 'أساسي' : 'Base'} {formatNumber(salary.base_salary)}</span>
                          {parseFloat(String(salary.bonuses || 0)) > 0 && (
                            <span className="text-emerald-600">+{formatNumber(salary.bonuses)}</span>
                          )}
                          {parseFloat(String(salary.deductions || 0)) > 0 && (
                            <span className="text-rose-600">-{formatNumber(salary.deductions)}</span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-black tabular-nums text-slate-900">
                          {formatNumber(salary.net_salary)} {currencySymbol}
                        </p>
                        <div className="mt-1 flex items-center justify-end gap-1">
                          <button
                            onClick={() => editSalary(salary)}
                            className="grid h-7 w-7 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(salary.id, 'staff_salaries')}
                            className="grid h-7 w-7 place-items-center rounded-lg text-rose-500 transition hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <TrendingDown className="h-5 w-5 text-rose-600" />
              <p className="mt-3 text-xl font-black tabular-nums text-slate-900 sm:text-2xl">
                {formatNumber(totals.totalExpenses)}
                <span className="ml-1 text-xs font-semibold text-slate-400">{currencySymbol}</span>
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                {ar ? 'إجمالي المصروفات' : 'Total expenses'} · {expenses.length}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <DollarSign className="h-5 w-5 text-violet-600" />
              <p className="mt-3 text-xl font-black tabular-nums text-slate-900 sm:text-2xl">
                {formatNumber(totals.totalSalaries)}
                <span className="ml-1 text-xs font-semibold text-slate-400">{currencySymbol}</span>
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500">
                {ar ? 'الرواتب المدفوعة' : 'Salaries paid'} · {salaries.filter((s) => s.payment_status === 'paid').length}
              </p>
            </div>
            <div className="col-span-2 rounded-2xl border border-slate-900 bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white shadow-sm lg:col-span-1">
              <FileText className="h-5 w-5 opacity-80" />
              <p className="mt-3 text-xl font-black tabular-nums sm:text-2xl">
                {formatNumber(outflow)}
                <span className="ml-1 text-xs font-semibold opacity-80">{currencySymbol}</span>
              </p>
              <p className="mt-0.5 text-[11px] font-medium opacity-90">{ar ? 'إجمالي الصرف' : 'Total outflow'}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="mb-3 text-sm font-bold text-slate-900">
              {ar ? 'تحليل المصروفات حسب الفئة' : 'Expense breakdown by category'}
            </h3>
            <div className="space-y-3">
              {['rent', 'utilities', 'salaries', 'maintenance', 'supplies', 'other'].map((category) => {
                const categoryExpenses = expenses.filter((e) => e.category === category);
                const categoryTotal = categoryExpenses.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
                const percentage = totals.totalExpenses > 0 ? (categoryTotal / totals.totalExpenses) * 100 : 0;

                return (
                  <div key={category}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold capitalize text-slate-600">{category}</span>
                      <span className="font-bold tabular-nums text-slate-900">
                        {formatNumber(categoryTotal)} {currencySymbol}
                        <span className="ml-1 font-medium text-slate-400">{percentage.toFixed(0)}%</span>
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className="h-2 rounded-full bg-slate-900 transition-all" style={{ width: `${percentage}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
