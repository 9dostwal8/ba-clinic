// @ts-nocheck
import { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { setOwnPassword } from '@/lib/accounts.functions';
import { useAuth } from '../contexts/AuthContext';

export function ChangePasswordGate({ onDone }: { onDone: () => void }) {
  const { profile, signOut } = useAuth();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await setOwnPassword({ data: { password } });
      onDone();
    } catch (err: any) {
      setError(err?.message || 'Could not update your password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 p-6 sm:p-8">
        <div className="w-12 h-12 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-4">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Set your own password</h1>
        <p className="text-sm text-slate-600 mt-1">
          {profile?.full_name ? `${profile.full_name}, y` : 'Y'}ou signed in with a temporary
          password. Choose a new password to continue.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">New password</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                placeholder="At least 8 characters"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Confirm password</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-sky-500 outline-none"
                placeholder="Repeat new password"
              />
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-sky-600 text-white font-semibold hover:bg-sky-700 disabled:opacity-60"
          >
            {loading ? 'Saving…' : 'Save password and continue'}
          </button>

          <button
            type="button"
            onClick={() => signOut()}
            className="w-full py-2 text-sm text-slate-500 hover:text-slate-700"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
