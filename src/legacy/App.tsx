// @ts-nocheck
import React, { useState, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { DynamicHead } from './components/DynamicHead';
import { ComingSoonPage } from './components/ComingSoonPage';
import { LoginPage } from './components/LoginPage';
import { ChangePasswordGate } from './components/ChangePasswordGate';

import { Layout } from './components/Layout';
import { SuperAdminDashboard } from './components/dashboards/SuperAdminDashboard';
import { ClinicDashboard } from './components/dashboards/ClinicDashboard';
import { supabase } from './lib/supabase';

const ClinicsModule = lazy(() => import('./components/modules/ClinicsModule').then(m => ({ default: m.ClinicsModule })));
const SubscriptionsModule = lazy(() => import('./components/modules/SubscriptionsModule').then(m => ({ default: m.SubscriptionsModule })));
const AppointmentsModule = lazy(() => import('./components/modules/AppointmentsModule').then(m => ({ default: m.AppointmentsModule })));
const PatientsModule = lazy(() => import('./components/modules/PatientsModule').then(m => ({ default: m.PatientsModule })));
const TreatmentsModule = lazy(() => import('./components/modules/TreatmentsModule').then(m => ({ default: m.TreatmentsModule })));
const TreatmentPlansModule = lazy(() => import('./components/modules/TreatmentPlansModule').then(m => ({ default: m.TreatmentPlansModule })));
const InventoryModule = lazy(() => import('./components/modules/InventoryModule').then(m => ({ default: m.InventoryModule })));
const AccountingModule = lazy(() => import('./components/modules/AccountingModule').then(m => ({ default: m.AccountingModule })));
const InvoicesModule = lazy(() => import('./components/modules/InvoicesModule').then(m => ({ default: m.InvoicesModule })));
const StaffModule = lazy(() => import('./components/modules/StaffModule').then(m => ({ default: m.StaffModule })));
const SettingsModule = lazy(() => import('./components/modules/SettingsModule').then(m => ({ default: m.SettingsModule })));
const PrescriptionsModule = lazy(() => import('./components/modules/PrescriptionsModule').then(m => ({ default: m.PrescriptionsModule })));
const NotificationsModule = lazy(() => import('./components/modules/NotificationsModule').then(m => ({ default: m.NotificationsModule })));
const TranslationsModule = lazy(() => import('./components/modules/TranslationsModule').then(m => ({ default: m.TranslationsModule })));
const CommissionModule = lazy(() => import('./components/modules/CommissionModule').then(m => ({ default: m.CommissionModule })));
const MyCommissionModule = lazy(() => import('./components/modules/MyCommissionModule').then(m => ({ default: m.MyCommissionModule })));
const ReceptionistDashboard = lazy(() => import('./components/modules/ReceptionistDashboard').then(m => ({ default: m.ReceptionistDashboard })));
const ReceptionistPaymentModule = lazy(() => import('./components/modules/ReceptionistPaymentModule').then(m => ({ default: m.ReceptionistPaymentModule })));
const ReceptionistPrescriptionModule = lazy(() => import('./components/modules/ReceptionistPrescriptionModule').then(m => ({ default: m.ReceptionistPrescriptionModule })));
const ReceptionistVisitModule = lazy(() => import('./components/modules/ReceptionistVisitModule').then(m => ({ default: m.ReceptionistVisitModule })));
const BillingManagementModule = lazy(() => import('./components/modules/BillingManagementModule'));
const ClinicSubscriptionModule = lazy(() => import('./components/modules/ClinicSubscriptionModule'));
const DatabaseManagementModule = lazy(() => import('./components/modules/DatabaseManagementModule'));
const ComingSoonSettingsModule = lazy(() => import('./components/modules/ComingSoonSettingsModule').then(m => ({ default: m.ComingSoonSettingsModule })));
const BillingModelsModule = lazy(() => import('./components/modules/BillingModelsModule'));
const ClinicTypesModule = lazy(() => import('./components/modules/ClinicTypesModule'));
const GoogleDriveBackupModule = lazy(() => import('./components/modules/GoogleDriveBackupModule'));
const WebAppSettingsModule = lazy(() => import('./components/modules/WebAppSettingsModule'));
const SuperAdminTemplatesModule = lazy(() => import('./components/modules/SuperAdminTemplatesModule').then(m => ({ default: m.SuperAdminTemplatesModule })));
const CurrencyManagementModule = lazy(() => import('./components/modules/CurrencyManagementModule'));
const LanguageManagementModule = lazy(() => import('./components/modules/LanguageManagementModule').then(m => ({ default: m.LanguageManagementModule })));
const WhatsAppSettingsModule = lazy(() => import('./components/modules/WhatsAppSettingsModule').then(m => ({ default: m.WhatsAppSettingsModule })));
const WhatsAppRemindersModule = lazy(() => import('./components/modules/WhatsAppRemindersModule').then(m => ({ default: m.WhatsAppRemindersModule })));
const DoctorTreatmentPlansModule = lazy(() => import('./components/modules/DoctorTreatmentPlansModule').then(m => ({ default: m.DoctorTreatmentPlansModule })));
const TodayBoardModule = lazy(() => import('./components/modules/TodayBoardModule').then(m => ({ default: m.TodayBoardModule })));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
);

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [comingSoonEnabled, setComingSoonEnabled] = useState<boolean | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [pageParams, setPageParams] = useState<Record<string, any>>({});
  const [passwordChanged, setPasswordChanged] = useState(false);


  React.useEffect(() => {
    // Floor roles land on the shared "Today" visit board
    if ((profile?.role === 'receptionist' || profile?.role === 'doctor') && currentPage === 'dashboard') {
      setCurrentPage('today');
    }
  }, [profile?.role]);

  React.useEffect(() => {
    checkComingSoonStatus();
  }, []);

  const checkComingSoonStatus = async () => {
    try {
      const { data } = await supabase
        .from('coming_soon_settings')
        .select('is_enabled')
        .maybeSingle();

      setComingSoonEnabled(data?.is_enabled || false);
    } catch (error) {
      console.error('Error checking coming soon status:', error);
      setComingSoonEnabled(false);
    }
  };

  const hostname = window.location.hostname;
  const isMainDomain = !hostname.includes('.') ||
                       hostname.split('.').length === 2 ||
                       hostname === 'localhost' ||
                       hostname.startsWith('192.168') ||
                       hostname.startsWith('127.0.0');

  const isSuperAdmin = profile?.role === 'super_admin';

  if (loading || comingSoonEnabled === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (comingSoonEnabled && isMainDomain && !user && !isSuperAdmin) {
    return <ComingSoonPage />;
  }

  if (!user || !profile) {
    return <LoginPage />;
  }

  if (profile.must_change_password && !passwordChanged) {
    return <ChangePasswordGate onDone={() => setPasswordChanged(true)} />;
  }


  const handleNavigation = (pageWithParams: string) => {
    // Parse page and parameters from format: "page?param1=value1&param2=value2"
    const [page, queryString] = pageWithParams.split('?');
    const params: Record<string, any> = {};

    if (queryString) {
      queryString.split('&').forEach(param => {
        const [key, value] = param.split('=');
        params[key] = value;
      });
    }

    setCurrentPage(page);
    setPageParams(params);
  };

  const renderPage = () => {
    if (isSuperAdmin) {
      switch (currentPage) {
        case 'dashboard':
          return <SuperAdminDashboard onNavigate={handleNavigation} />;
        case 'clinics':
          return <Suspense fallback={<LoadingSpinner />}><ClinicsModule /></Suspense>;
        case 'billing-models':
          return <Suspense fallback={<LoadingSpinner />}><BillingModelsModule /></Suspense>;
        case 'clinic-types':
          return <Suspense fallback={<LoadingSpinner />}><ClinicTypesModule /></Suspense>;
        case 'billing-system':
          return <Suspense fallback={<LoadingSpinner />}><BillingManagementModule /></Suspense>;
        case 'subscriptions':
          return <Suspense fallback={<LoadingSpinner />}><SubscriptionsModule /></Suspense>;
        case 'currencies':
          return <Suspense fallback={<LoadingSpinner />}><CurrencyManagementModule /></Suspense>;
        case 'translations':
          return <Suspense fallback={<LoadingSpinner />}><TranslationsModule /></Suspense>;
        case 'backup':
          return <Suspense fallback={<LoadingSpinner />}><DatabaseManagementModule /></Suspense>;
        case 'google-drive':
          return <Suspense fallback={<LoadingSpinner />}><GoogleDriveBackupModule /></Suspense>;
        case 'webapp':
          return <Suspense fallback={<LoadingSpinner />}><WebAppSettingsModule /></Suspense>;
        case 'coming-soon':
          return <Suspense fallback={<LoadingSpinner />}><ComingSoonSettingsModule /></Suspense>;
        case 'templates':
          return <Suspense fallback={<LoadingSpinner />}><SuperAdminTemplatesModule /></Suspense>;
        case 'languages':
          return <Suspense fallback={<LoadingSpinner />}><LanguageManagementModule /></Suspense>;
        case 'settings':
          return <Suspense fallback={<LoadingSpinner />}><SettingsModule /></Suspense>;
        default:
          return <SuperAdminDashboard onNavigate={handleNavigation} />;
      }
    } else {
      switch (currentPage) {
        case 'dashboard':
          if (profile?.role === 'receptionist') {
            return <Suspense fallback={<LoadingSpinner />}><ReceptionistDashboard onNavigate={setCurrentPage} /></Suspense>;
          }
          return <ClinicDashboard onNavigate={handleNavigation} />;
        case 'today':
          return <Suspense fallback={<LoadingSpinner />}><TodayBoardModule onNavigate={handleNavigation} /></Suspense>;
        case 'appointments':
          return <Suspense fallback={<LoadingSpinner />}><AppointmentsModule /></Suspense>;
        case 'patients':
          return <Suspense fallback={<LoadingSpinner />}><PatientsModule /></Suspense>;
        case 'treatments':
          if (profile?.role === 'doctor') {
            return <Suspense fallback={<LoadingSpinner />}><DoctorTreatmentPlansModule onNavigate={handleNavigation} patientId={pageParams.patientId} /></Suspense>;
          }
          return <Suspense fallback={<LoadingSpinner />}><TreatmentsModule /></Suspense>;
        case 'treatment-plans':
          if (profile?.role === 'doctor') {
            return <Suspense fallback={<LoadingSpinner />}><DoctorTreatmentPlansModule onNavigate={handleNavigation} patientId={pageParams.patientId} /></Suspense>;
          }
          return <Suspense fallback={<LoadingSpinner />}><TreatmentPlansModule
            initialView={pageParams.view as 'list' | 'new' | 'details' || 'list'}
            initialFilter={pageParams.filter || 'all'}
          /></Suspense>;
        case 'inventory':
          return <Suspense fallback={<LoadingSpinner />}><InventoryModule /></Suspense>;
        case 'accounting':
          return <Suspense fallback={<LoadingSpinner />}><AccountingModule /></Suspense>;
        case 'commissions':
          return <Suspense fallback={<LoadingSpinner />}><CommissionModule /></Suspense>;
        case 'my-commission':
          return <Suspense fallback={<LoadingSpinner />}><MyCommissionModule /></Suspense>;
        case 'receptionist':
          return <Suspense fallback={<LoadingSpinner />}><ReceptionistDashboard onNavigate={setCurrentPage} /></Suspense>;
        case 'receptionist-payments':
          return <Suspense fallback={<LoadingSpinner />}><ReceptionistPaymentModule /></Suspense>;
        case 'receptionist-prescriptions':
          return <Suspense fallback={<LoadingSpinner />}><ReceptionistPrescriptionModule /></Suspense>;
        case 'receptionist-visits':
          return <Suspense fallback={<LoadingSpinner />}><ReceptionistVisitModule /></Suspense>;
        case 'invoices':
          if (profile?.role === 'doctor') {
            return <Suspense fallback={<LoadingSpinner />}><DoctorTreatmentPlansModule onNavigate={handleNavigation} /></Suspense>;
          }
          return <Suspense fallback={<LoadingSpinner />}><InvoicesModule /></Suspense>;
        case 'clinic-subscription':
          return <Suspense fallback={<LoadingSpinner />}><ClinicSubscriptionModule /></Suspense>;
        case 'staff':
          return <Suspense fallback={<LoadingSpinner />}><StaffModule /></Suspense>;
        case 'prescriptions':
          return <Suspense fallback={<LoadingSpinner />}><PrescriptionsModule /></Suspense>;
        case 'notifications':
          return <Suspense fallback={<LoadingSpinner />}><NotificationsModule /></Suspense>;
        case 'backup':
          return <Suspense fallback={<LoadingSpinner />}><DatabaseManagementModule /></Suspense>;
        case 'whatsapp':
        case 'whatsapp-settings':
          return <Suspense fallback={<LoadingSpinner />}><WhatsAppSettingsModule /></Suspense>;
        case 'whatsapp-reminders':
          return <Suspense fallback={<LoadingSpinner />}><WhatsAppRemindersModule /></Suspense>;
        case 'settings':
          return <Suspense fallback={<LoadingSpinner />}><SettingsModule onNavigate={setCurrentPage} /></Suspense>;
        default:
          if (profile?.role === 'receptionist' || profile?.role === 'doctor') {
            return <Suspense fallback={<LoadingSpinner />}><TodayBoardModule onNavigate={handleNavigation} /></Suspense>;
          }
          return <ClinicDashboard onNavigate={handleNavigation} />;
      }
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigation}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <DynamicHead />
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
}

export default App;
