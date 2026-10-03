// @ts-nocheck
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Activity } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';

const DEMO_ACCOUNTS = [
  { group: 'Platform', label: 'Super Admin', email: 'admin@clinic.com', password: 'Admin@12345' },
  { group: 'Clinic Admin', label: 'Aurora Poly Clinic', email: 'admin.clinic1@demo.com', password: 'Clinic@12345' },
  { group: 'Clinic Admin', label: 'Cedar Dental Center', email: 'admin.clinic2@demo.com', password: 'Clinic@12345' },
  { group: 'Dentist', label: 'Aurora Poly Clinic', email: 'dentist1.clinic1@demo.com', password: 'Dentist@12345' },
  { group: 'Dentist', label: 'Cedar Dental Center', email: 'dentist1.clinic2@demo.com', password: 'Dentist@12345' },
  { group: 'Dentist', label: 'Summit Medical Building', email: 'dentist1.clinic5@demo.com', password: 'Dentist@12345' },
  { group: 'Reception', label: 'Aurora Poly Clinic', email: 'reception.clinic1@demo.com', password: 'Staff@12345' },
  { group: 'Reception', label: 'Cedar Dental Center', email: 'reception.clinic2@demo.com', password: 'Staff@12345' },
  { group: 'Reception', label: 'Summit Medical Building', email: 'reception.clinic5@demo.com', password: 'Staff@12345' },
];


interface LoginPageProps {
  onBack?: () => void;
}


export function LoginPage({ onBack }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || t('failed_to_sign_in'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-accent via-background to-secondary flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-4 right-4 rtl:left-4 rtl:right-auto">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-md flex-grow flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-xl mb-4">
              <Activity className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{t('dentalClinicManager')}</h1>
            <p className="text-gray-600 mt-2">{t('signInToAccount')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                {t('emailAddress')}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition"
                placeholder={t('emailPlaceholder')}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                {t('password')}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent transition"
                placeholder={t('enter_your_password')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:opacity-90 text-primary-foreground font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('signing_in') : t('sign_in')}
            </button>
          </form>

          <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Demo accounts — tap to fill
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 max-h-72 overflow-y-auto pr-1">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => {
                    setEmail(acc.email);
                    setPassword(acc.password);
                    setError('');
                  }}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-left transition hover:border-primary/40 hover:bg-accent"
                >
                  <span className="inline-block rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
                    {acc.group}
                  </span>
                  <span className="mt-1 block text-sm font-semibold text-gray-900">{acc.label}</span>
                  <span className="block text-xs text-gray-500 break-all">
                    {acc.email} · {acc.password}
                  </span>
                </button>
              ))}
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
