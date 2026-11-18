import React, { useState } from 'react';
import { Delete, KeyRound, Lock, Mail, ShieldCheck, Store } from 'lucide-react';
import { signInWithEmail, signInWithGooglePopup } from '../../firebase/config';
import type { OutletProfile, StaffUser } from '../../types/pos';
import { hashPinSync } from '../../utils/posCalculations';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface Props {
  outlet: OutletProfile;
  users: StaffUser[];
  onPinLogin: (user: StaffUser) => void;
  onFirebaseAuthSuccess: (email: string, displayName: string, uid: string) => void;
}

export const LoginView: React.FC<Props> = ({
  outlet,
  users,
  onPinLogin,
  onFirebaseAuthSuccess,
}) => {
  const [tab, setTab] = useState<'pin' | 'cloud'>('pin');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  const activeUsers = users.filter((u) => u.isActive);

  const handleDigit = (digit: string) => {
    setPinError(null);
    if (pin.length >= 6) return;
    const next = pin + digit;
    setPin(next);

    // Auto-submit if matching a 4-digit PIN immediately when exact 4 or 6 digits match
    if (next.length >= 4) {
      const hashed = hashPinSync(next);
      const matched = activeUsers.find((u) => u.pinHash === hashed);
      if (matched) {
        onPinLogin(matched);
      }
    }
  };

  const handlePinSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (pin.length < 4) {
      setPinError('Masukkan minimal 4 digit PIN kasir.');
      return;
    }
    const hashed = hashPinSync(pin);
    const matched = activeUsers.find((u) => u.pinHash === hashed);
    if (!matched) {
      setPinError('PIN tidak dikenali atau akun nonaktif. Coba periksa kembali.');
      setPin('');
      return;
    }
    onPinLogin(matched);
  };

  const handleGoogleLogin = async () => {
    setCloudError(null);
    setCloudLoading(true);
    try {
      const cred = await signInWithGooglePopup();
      const user = cred.user;
      onFirebaseAuthSuccess(
        user.email || '',
        user.displayName || user.email?.split('@')[0] || 'Pengguna',
        user.uid
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal masuk dengan Google.';
      if (msg.includes('popup-closed-by-user')) {
        setCloudError('Jendela masuk Google ditutup sebelum selesai.');
      } else {
        setCloudError(`Gagal masuk dengan Google: ${msg}`);
      }
    } finally {
      setCloudLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setCloudError(null);
    if (!email.trim() || !password) {
      setCloudError('Email dan kata sandi wajib diisi.');
      return;
    }
    setCloudLoading(true);
    try {
      const cred = await signInWithEmail(email.trim(), password);
      const user = cred.user;
      onFirebaseAuthSuccess(
        user.email || email.trim(),
        user.displayName || email.trim().split('@')[0],
        user.uid
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('operation-not-allowed')) {
        setCloudError(
          'Provider Email/Password belum diaktifkan di Firebase Console. Gunakan Masuk dengan Google atau PIN Perangkat.'
        );
      } else if (msg.includes('invalid-credential') || msg.includes('wrong-password')) {
        setCloudError('Email atau kata sandi salah.');
      } else {
        setCloudError(`Gagal masuk: ${msg}`);
      }
    } finally {
      setCloudLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 rounded-2xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden shadow-sm">
        {/* Left Brand Panel */}
        <div className="lg:col-span-5 bg-stone-900 dark:bg-stone-950 text-stone-100 p-6 sm:p-8 flex flex-col justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-orange-600 flex items-center justify-center text-white shrink-0">
                <Store className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight text-white">DapurKasir</h1>
                <p className="text-xs text-stone-400">Point of Sale Kuliner</p>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-800 space-y-1">
              <p className="text-xs font-medium text-orange-400">Outlet Aktif</p>
              <p className="text-lg font-semibold text-white">{outlet.name}</p>
              <p className="text-xs text-stone-400 leading-relaxed">{outlet.address}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-stone-800 bg-stone-900/70 p-4 space-y-2">
              <p className="text-xs font-semibold text-stone-200 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-orange-400 shrink-0" />
                Akses Cepat Perangkat (PIN Awal)
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setTab('pin');
                    const owner = activeUsers.find((u) => u.role === 'owner');
                    if (owner) onPinLogin(owner);
                  }}
                  className="min-h-[44px] rounded-lg border border-stone-700 hover:border-orange-500 px-2 py-1.5 text-left transition-colors"
                >
                  <span className="block font-semibold text-white">Owner</span>
                  <span className="font-mono text-stone-400">PIN 1234</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('pin');
                    const mgr = activeUsers.find((u) => u.role === 'manager');
                    if (mgr) onPinLogin(mgr);
                  }}
                  className="min-h-[44px] rounded-lg border border-stone-700 hover:border-orange-500 px-2 py-1.5 text-left transition-colors"
                >
                  <span className="block font-semibold text-white">Manajer</span>
                  <span className="font-mono text-stone-400">PIN 2222</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTab('pin');
                    const cashier = activeUsers.find((u) => u.role === 'cashier');
                    if (cashier) onPinLogin(cashier);
                  }}
                  className="min-h-[44px] rounded-lg border border-stone-700 hover:border-orange-500 px-2 py-1.5 text-left transition-colors"
                >
                  <span className="block font-semibold text-white">Kasir</span>
                  <span className="font-mono text-stone-400">PIN 0000</span>
                </button>
              </div>
            </div>

            <PWAInstallButton />
          </div>
        </div>

        {/* Right Auth Form Panel */}
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-center">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800 mb-6">
            <button
              type="button"
              onClick={() => setTab('pin')}
              className={`flex-1 min-h-[44px] rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                tab === 'pin'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              PIN Kasir
            </button>
            <button
              type="button"
              onClick={() => setTab('cloud')}
              className={`flex-1 min-h-[44px] rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                tab === 'cloud'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
              }`}
            >
              <Mail className="w-4 h-4" />
              Akun Cloud (Firebase)
            </button>
          </div>

          {tab === 'pin' ? (
            <form onSubmit={handlePinSubmit} className="space-y-5 max-w-sm mx-auto w-full">
              <div className="text-center space-y-1">
                <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                  Masukkan PIN Perangkat
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Ketuk 4–6 digit PIN untuk membuka layar kasir.
                </p>
              </div>

              {/* PIN Dots Display */}
              <div
                aria-label="Tampilan digit PIN"
                className="flex items-center justify-center gap-3 py-3"
              >
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className={`w-3.5 h-3.5 rounded-full border transition-colors ${
                      i < pin.length
                        ? 'bg-orange-600 border-orange-600'
                        : i < 4
                          ? 'border-stone-300 dark:border-stone-600 bg-transparent'
                          : 'border-stone-200 dark:border-stone-800 bg-transparent opacity-40'
                    }`}
                  />
                ))}
              </div>

              {pinError && (
                <div
                  role="alert"
                  className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-300 text-center"
                >
                  {pinError}
                </div>
              )}

              {/* Keypad */}
              <div className="grid grid-cols-3 gap-2.5">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleDigit(d)}
                    className="min-h-[52px] rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-lg font-bold text-stone-900 dark:text-stone-100 tabular-nums transition-colors active:scale-95"
                  >
                    {d}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setPin('');
                    setPinError(null);
                  }}
                  className="min-h-[52px] rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => handleDigit('0')}
                  className="min-h-[52px] rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-lg font-bold text-stone-900 dark:text-stone-100 tabular-nums transition-colors active:scale-95"
                >
                  0
                </button>
                <button
                  type="button"
                  aria-label="Hapus digit PIN"
                  onClick={() => {
                    setPin((p) => p.slice(0, -1));
                    setPinError(null);
                  }}
                  className="min-h-[52px] rounded-xl border border-stone-200 dark:border-stone-700 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                >
                  <Delete className="w-5 h-5" />
                </button>
              </div>

              <button
                type="submit"
                className="w-full min-h-[48px] rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm transition-colors"
              >
                Masuk ke Kasir
              </button>
            </form>
          ) : (
            <div className="space-y-5 max-w-sm mx-auto w-full">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-stone-900 dark:text-stone-100">
                  Masuk ke Akun Cloud
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Sinkronkan data menu, shift, dan transaksi secara real-time dengan Firestore.
                </p>
              </div>

              {cloudError && (
                <div
                  role="alert"
                  className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-3 py-2.5 text-xs text-red-700 dark:text-red-300"
                >
                  {cloudError}
                </div>
              )}

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={cloudLoading}
                className="w-full min-h-[48px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center justify-center gap-3 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M12 10.2v3.9h5.5c-.2 1.3-1.5 3.9-5.5 3.9-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.9 9.1-9.3 0-.6-.1-1.1-.2-1.6H12z"
                  />
                </svg>
                {cloudLoading ? 'Memproses...' : 'Masuk dengan Google'}
              </button>

              <div className="relative flex items-center py-1">
                <div className="flex-grow border-t border-stone-200 dark:border-stone-800" />
                <span className="shrink-0 mx-3 text-xs text-stone-400">atau Email & Sandi</span>
                <div className="flex-grow border-t border-stone-200 dark:border-stone-800" />
              </div>

              <form onSubmit={handleEmailLogin} className="space-y-3">
                <div>
                  <label htmlFor="login-email" className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@outletkuliner.id"
                    className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <div>
                  <label htmlFor="login-password" className="block text-xs font-medium text-stone-700 dark:text-stone-300 mb-1">
                    Kata Sandi
                  </label>
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={cloudLoading}
                  className="w-full min-h-[48px] rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  Masuk dengan Email
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
