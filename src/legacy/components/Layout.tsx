// @ts-nocheck
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppSettings } from '../hooks/useAppSettings';
import { LanguageSwitcher } from './LanguageSwitcher';
import { LanguageSwitcherHorizontal } from './LanguageSwitcherHorizontal';
import { md3, md3Module } from '../utils/md3Styles';
import {
  Activity,
  Clock,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  Calendar,
  Users,
  Stethoscope,
  Package,
  DollarSign,
  FileText,
  Settings,
  Building2,
  UserCircle,
  Languages,
  Pill,
  Bell,
  Lock,
  CreditCard,
  Database,
  Clipboard,
  Percent,
  Monitor,
  Cloud,
  Rocket,
  Coins
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface ModuleCard {
  name: string;
  icon: React.ElementType;
  color: 'blue' | 'teal' | 'emerald' | 'amber' | 'rose' | 'sky' | 'green' | 'cyan' | 'red' | 'gray';
  page: string;
  description: string;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const { language, setLanguage, t, isRTL } = useLanguage();
  const { getSetting } = useAppSettings();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [doctorCount, setDoctorCount] = useState(0);

  const isSuperAdmin = profile?.role === 'super_admin';
  const isClinicAdmin = profile?.role === 'clinic_admin';
  const isStaff = profile?.role === 'doctor' || profile?.role === 'receptionist';
  // Fallback so staff never see an empty sidebar if their permission row is missing
  const permissions = profile?.permissions ?? (isStaff
    ? {
        can_view_appointments: true,
        can_edit_appointments: true,
        can_view_patients: true,
        can_edit_patients: true,
        can_view_treatments: true,
        can_edit_treatments: true,
        can_view_invoices: true,
        can_edit_invoices: false,
        can_view_inventory: false,
        can_edit_inventory: false,
        can_view_accounting: false,
        can_view_staff: false,
        can_edit_staff: false,
        can_view_settings: false,
        view_all_patients: true,
        view_all_appointments: true,
      }
    : undefined);

  const subscriptionStatus = (profile as any)?.clinic_subscription_status;
  const isSubscriptionSuspended = !isSuperAdmin && (subscriptionStatus === 'suspended' || subscriptionStatus === 'cancelled');

  const lockedModuleAlert = getSetting('locked_module_alert', t('subscriptionSuspendedAlert'));

  React.useEffect(() => {
    const loadDoctorCount = async () => {
      if (!profile?.clinic_id || isSuperAdmin) return;

      const { count, error } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', profile.clinic_id)
        .eq('role', 'doctor')
        .eq('is_active', true);

      if (!error && count !== null) {
        setDoctorCount(count);
      }
    };

    loadDoctorCount();
  }, [profile?.clinic_id, isSuperAdmin]);

  const getModuleCards = (): ModuleCard[] => {
    const cards: ModuleCard[] = [];

    if (isSuperAdmin) {
      return [
        {
          name: t('dashboard'),
          icon: LayoutDashboard,
          color: 'sky' as const,
          page: 'dashboard',
          description: t('overview')
        },
        {
          name: t('clinics'),
          icon: Building2,
          color: 'emerald' as const,
          page: 'clinics',
          description: t('manage_clinics')
        },
        {
          name: 'Billing Models',
          icon: DollarSign,
          color: 'teal' as const,
          page: 'billing-models',
          description: 'Configure billing models'
        },
        {
          name: 'Clinic Types',
          icon: Users,
          color: 'cyan' as const,
          page: 'clinic-types',
          description: 'Manage clinic types'
        },
        {
          name: 'Billing System',
          icon: Activity,
          color: 'green' as const,
          page: 'billing-system',
          description: 'Usage & invoicing'
        },
        {
          name: t('subscriptions'),
          icon: CreditCard,
          color: 'rose' as const,
          page: 'subscriptions',
          description: 'Manage subscription plans'
        },
        {
          name: 'Currencies',
          icon: Coins,
          color: 'amber' as const,
          page: 'currencies',
          description: 'Currency settings'
        },
        {
          name: t('translations'),
          icon: Languages,
          color: 'blue' as const,
          page: 'translations',
          description: 'Manage translations'
        },
        {
          name: t('languageManagement'),
          icon: Languages,
          color: 'teal' as const,
          page: 'languages',
          description: 'Enable/disable languages'
        },
        {
          name: t('backup'),
          icon: Database,
          color: 'red' as const,
          page: 'backup',
          description: 'Database backup & restore'
        },
        {
          name: 'Google Drive',
          icon: Cloud,
          color: 'sky' as const,
          page: 'google-drive',
          description: 'Auto backup to cloud'
        },
        {
          name: 'Web App',
          icon: Monitor,
          color: 'blue' as const,
          page: 'webapp',
          description: 'App settings'
        },
        {
          name: t('coming_soon.title'),
          icon: Rocket,
          color: 'cyan' as const,
          page: 'coming-soon',
          description: 'Landing page settings'
        },
        {
          name: 'Templates',
          icon: FileText,
          color: 'green' as const,
          page: 'templates',
          description: 'Manage document templates'
        }
      ];
    }

    if (isClinicAdmin) {
      return [
        {
          name: t('dashboard'),
          icon: LayoutDashboard,
          color: 'sky' as const,
          page: 'dashboard',
          description: t('overview')
        },
        {
          name: t('appointments'),
          icon: Calendar,
          color: 'blue' as const,
          page: 'appointments',
          description: t('schedule')
        },
        {
          name: t('patients'),
          icon: Users,
          color: 'emerald' as const,
          page: 'patients',
          description: t('patient_records')
        },
        {
          name: t('treatments'),
          icon: Stethoscope,
          color: 'teal' as const,
          page: 'treatments',
          description: t('treatment_history')
        },
        {
          name: t('treatment_plans'),
          icon: Clipboard,
          color: 'cyan' as const,
          page: 'treatment-plans',
          description: t('treatment_plans_management')
        },
        {
          name: t('prescriptions'),
          icon: Pill,
          color: 'rose' as const,
          page: 'prescriptions',
          description: t('drug_prescriptions')
        },
        {
          name: t('notificationSettings'),
          icon: Bell,
          color: 'blue' as const,
          page: 'notifications',
          description: t('smsReminders')
        },
        {
          name: t('inventory'),
          icon: Package,
          color: 'green' as const,
          page: 'inventory',
          description: t('stock')
        },
        {
          name: t('accounting'),
          icon: DollarSign,
          color: 'green' as const,
          page: 'accounting',
          description: t('financial_records')
        },
        ...(doctorCount >= 2 ? [{
          name: language === 'ar' ? 'العمولات' : 'Commissions',
          icon: Percent,
          color: 'emerald' as const,
          page: 'commissions',
          description: language === 'ar' ? 'عمولات الأطباء' : 'Doctor commissions'
        }] : []),
        {
          name: t('invoices'),
          icon: FileText,
          color: 'amber' as const,
          page: 'invoices',
          description: t('billing')
        },
        {
          name: t('subscription_module'),
          icon: CreditCard,
          color: 'cyan' as const,
          page: 'clinic-subscription',
          description: t('subscription_subtitle')
        },
        {
          name: t('staff'),
          icon: UserCircle,
          color: 'cyan' as const,
          page: 'staff',
          description: t('staff_management')
        },
        {
          name: 'Backup & Restore',
          icon: Database,
          color: 'teal' as const,
          page: 'backup',
          description: 'Data backup & restore'
        },
        {
          name: t('settings'),
          icon: Settings,
          color: 'gray' as const,
          page: 'settings',
          description: t('clinic_settings')
        }
      ];
    }

    if (isStaff && permissions) {
      cards.push({
        name: language === 'ar' ? 'اليوم' : 'Today',
        icon: Clock,
        color: 'sky' as const,
        page: 'today',
        description: language === 'ar' ? 'زيارات اليوم' : "Today's visit board"
      });
      // Receptionist gets special dashboard
      if (profile?.role === 'receptionist') {
        cards.push({
          name: language === 'ar' ? 'لوحة الاستقبال' : 'Reception',
          icon: LayoutDashboard,
          color: 'sky' as const,
          page: 'receptionist',
          description: language === 'ar' ? 'لوحة الاستقبال' : 'Reception Dashboard'
        });
        cards.push({
          name: language === 'ar' ? 'المواعيد والزيارات' : 'Appointments & Visits',
          icon: Calendar,
          color: 'emerald' as const,
          page: 'receptionist-visits',
          description: language === 'ar' ? 'عرض وطباعة' : 'View and print'
        });
        cards.push({
          name: language === 'ar' ? 'المدفوعات' : 'Payments',
          icon: DollarSign,
          color: 'amber' as const,
          page: 'receptionist-payments',
          description: language === 'ar' ? 'تحصيل المدفوعات' : 'Collect payments'
        });
        cards.push({
          name: language === 'ar' ? 'الوصفات' : 'Prescriptions',
          icon: Pill,
          color: 'cyan' as const,
          page: 'receptionist-prescriptions',
          description: language === 'ar' ? 'عرض وطباعة' : 'View and print'
        });
      } else {
        cards.push({
          name: t('dashboard'),
          icon: LayoutDashboard,
          color: 'sky' as const,
          page: 'dashboard',
          description: t('overview')
        });
      }

      if (permissions.can_view_appointments) {
        cards.push({
          name: t('appointments'),
          icon: Calendar,
          color: 'blue' as const,
          page: 'appointments',
          description: t('schedule')
        });
      }
      if (permissions.can_view_patients) {
        cards.push({
          name: t('patients'),
          icon: Users,
          color: 'emerald' as const,
          page: 'patients',
          description: t('patient_records')
        });
      }

      if (permissions.can_view_treatments && profile?.role !== 'receptionist') {
        if (profile?.role !== 'doctor') {
          cards.push({
            name: t('treatments'),
            icon: Stethoscope,
            color: 'teal' as const,
            page: 'treatments',
            description: t('treatment_history')
          });
        }
        cards.push({
          name: t('treatment_plans'),
          icon: Clipboard,
          color: 'cyan' as const,
          page: 'treatment-plans',
          description: t('treatment_plans_management')
        });
      }
      if (profile?.role === 'doctor') {
        cards.push({
          name: t('prescriptions'),
          icon: Pill,
          color: 'rose' as const,
          page: 'prescriptions',
          description: t('drug_prescriptions')
        });
        cards.push({
          name: language === 'ar' ? 'عمولتي' : 'My Commission',
          icon: Percent,
          color: 'emerald' as const,
          page: 'my-commission',
          description: language === 'ar' ? 'عرض عمولاتي' : 'View my commissions'
        });
      }
      if (permissions.can_view_invoices && profile?.role !== 'receptionist' && profile?.role !== 'doctor') {
        cards.push({
          name: t('invoices'),
          icon: FileText,
          color: 'amber' as const,
          page: 'invoices',
          description: t('billing')
        });
      }
      if (permissions.can_view_inventory) {
        cards.push({
          name: t('inventory'),
          icon: Package,
          color: 'green' as const,
          page: 'inventory',
          description: t('stock')
        });
      }
      if (permissions.can_view_accounting) {
        cards.push({
          name: t('accounting'),
          icon: DollarSign,
          color: 'green' as const,
          page: 'accounting',
          description: t('financial_records')
        });

        if (doctorCount >= 2) {
          cards.push({
            name: language === 'ar' ? 'العمولات' : 'Commissions',
            icon: Percent,
            color: 'emerald' as const,
            page: 'commissions',
            description: language === 'ar' ? 'عمولات الأطباء' : 'Doctor commissions'
          });
        }
      }
      if (permissions.can_view_staff) {
        cards.push({
          name: t('staff'),
          icon: UserCircle,
          color: 'cyan' as const,
          page: 'staff',
          description: t('staff_management')
        });
      }
      if (permissions.can_view_settings) {
        cards.push({
          name: t('settings'),
          icon: Settings,
          color: 'gray' as const,
          page: 'settings',
          description: t('settings')
        });
      }
    }

    return cards;
  };

  const moduleCards = getModuleCards();

  const GROUPS: Record<string, string[]> = {
    Overview: ['today', 'dashboard', 'receptionist'],
    Clinical: [
      'appointments', 'patients', 'treatments', 'treatment-plans', 'prescriptions',
      'receptionist-visits', 'receptionist-prescriptions'
    ],
    Finance: [
      'accounting', 'invoices', 'commissions', 'my-commission', 'receptionist-payments',
      'billing-system', 'billing-models', 'currencies', 'subscriptions', 'clinic-subscription'
    ],
    Operations: ['inventory', 'staff', 'notifications', 'clinics', 'clinic-types'],
    Administration: [
      'templates', 'translations', 'languages', 'webapp', 'coming-soon',
      'backup', 'google-drive', 'settings'
    ],
  };

  const groupOf = (page: string) =>
    Object.keys(GROUPS).find((g) => GROUPS[g].includes(page)) || 'Operations';

  const ADMIN_QUICK = isSuperAdmin
    ? ['dashboard', 'clinics', 'subscriptions', 'templates', 'webapp', 'backup']
    : ['dashboard', 'appointments', 'patients', 'invoices', 'settings'];

  const quickCards = ADMIN_QUICK
    .map((p) => moduleCards.find((m) => m.page === p))
    .filter(Boolean) as ModuleCard[];

  const grouped = Object.keys(GROUPS)
    .map((g) => ({ group: g, items: moduleCards.filter((m) => groupOf(m.page) === g) }))
    .filter((g) => g.items.length > 0);

  const [query, setQuery] = useState('');
  const searchRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') setQuery('');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const results = query.trim()
    ? moduleCards.filter((m) =>
        `${m.name} ${m.description}`.toLowerCase().includes(query.trim().toLowerCase())
      )
    : [];

  const go = (page: string) => {
    if (isSubscriptionSuspended && page !== 'dashboard') {
      alert(lockedModuleAlert);
      return;
    }
    onNavigate(page);
    setSidebarOpen(false);
    setQuery('');
  };

  const NavItem = ({ module }: { module: ModuleCard }) => {
    const Icon = module.icon;
    const isActive = currentPage === module.page;
    const isLocked = isSubscriptionSuspended && module.page !== 'dashboard';
    return (
      <button
        key={module.page}
        onClick={() => go(module.page)}
        disabled={isLocked}
        title={module.description}
        className={`w-full flex items-center gap-3 rounded-md px-3 py-2 text-start transition-all duration-150 ${
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
            : isLocked
            ? 'opacity-45 cursor-not-allowed'
            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
        }`}
      >
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-md ${
            isActive ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'bg-card text-muted-foreground border border-sidebar-border'
          }`}
        >
          {isLocked ? <Lock className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{module.name}</span>
          <span className={`block truncate text-[11px] ${isActive ? 'text-sidebar-accent-foreground/70' : 'text-muted-foreground'}`}>
            {isLocked ? t('locked') || 'Locked' : module.description}
          </span>
        </span>
      </button>
    );
  };

  const SidebarBody = (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Activity className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="font-display truncate text-sm font-semibold text-foreground">{t('appName')}</h2>
          <p className="eyebrow text-muted-foreground">
            {isSuperAdmin ? t('super_admin') : t('clinic_portal')}
          </p>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto p-3">
        {grouped.map(({ group, items }) => (
          <div key={group} className="space-y-1">
            <p className="eyebrow px-3 pb-1 text-muted-foreground">{group}</p>
            {items.map((m) => (
              <NavItem key={m.page} module={m} />
            ))}
          </div>
        ))}
      </nav>

      <div className="space-y-3 border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserCircle className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{profile?.full_name}</p>
            <p className="text-xs capitalize text-muted-foreground">{profile?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <LanguageSwitcherHorizontal />
        <button
          onClick={async () => {
            try {
              await signOut();
              setSidebarOpen(false);
            } catch (error) {
              console.error('Logout error:', error);
            }
          }}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/15"
        >
          <LogOut className="h-4 w-4" />
          <span>{t('logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={`fixed top-0 z-40 hidden h-screen w-72 lg:block ${
          isRTL ? 'right-0 border-l' : 'left-0 border-r'
        } border-border`}
      >
        {SidebarBody}
      </aside>

      {/* Mobile drawer */}
      <aside
        className={`fixed top-0 z-50 h-screen w-80 max-w-[85vw] transition-transform duration-300 lg:hidden ${
          isRTL ? 'right-0 border-l' : 'left-0 border-r'
        } border-border shadow-2xl ${
          sidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'
        }`}
      >
        {SidebarBody}
      </aside>
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-foreground/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className={isRTL ? 'lg:pr-72' : 'lg:pl-72'}>
        {/* Top bar */}
        <header className="sticky top-0 z-30 border-b border-border bg-panel/85 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 lg:px-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-xl p-2 text-foreground hover:bg-muted lg:hidden"
              aria-label="Menu"
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            <div className="hidden min-w-0 lg:block">
              <p className="eyebrow text-muted-foreground">{groupOf(currentPage)}</p>
              <h1 className="font-display truncate text-base font-semibold text-foreground">
                {moduleCards.find((m) => m.page === currentPage)?.name || t('dashboard')}
              </h1>
            </div>

            <div className="relative min-w-0 flex-1 lg:max-w-md lg:ms-auto">

              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`${t('search') || 'Search'}…  (Ctrl/⌘ K)`}
                className="w-full rounded-xl border border-input bg-background px-4 py-2 text-sm outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-ring/25"
              />
              {results.length > 0 && (
                <div className="absolute inset-x-0 top-full z-40 mt-2 max-h-80 overflow-y-auto rounded-xl border border-border bg-popover p-2 shadow-[var(--shadow-lift)]">
                  {results.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.page}
                        onClick={() => go(m.page)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start hover:bg-muted"
                      >
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">{m.name}</span>
                        <span className="ms-auto truncate text-xs text-muted-foreground">{m.description}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <span className="hidden items-center gap-2 rounded-full bg-primary/8 px-3 py-1.5 text-xs font-medium capitalize text-primary sm:flex">
              {isSuperAdmin ? t('super_admin') : profile?.role?.replace('_', ' ')}
            </span>
          </div>
        </header>


        <main className="min-h-screen p-4 pb-24 lg:p-6 lg:pb-10">{children}</main>
      </div>

      {/* Mobile bottom bar */}
      <nav className="fixed bottom-0 inset-x-0 z-30 flex border-t border-border bg-panel/95 backdrop-blur lg:hidden">
        {quickCards.slice(0, 5).map((m) => {
          const Icon = m.icon;
          const isActive = currentPage === m.page;
          return (
            <button
              key={m.page}
              onClick={() => go(m.page)}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium ${
                isActive ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate px-1">{m.name}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

