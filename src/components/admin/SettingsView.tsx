import React, { useState } from 'react';
import { Check, Moon, Plus, Sun, Trash2, Users } from 'lucide-react';
import type { OutletProfile, StaffUser, UserRole } from '../../types/pos';
import { hashPinSync } from '../../utils/posCalculations';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface Props {
  outlet: OutletProfile;
  users: StaffUser[];
  currentUser: StaffUser;
  darkMode: boolean;
  largeFont: boolean;
  isCloudSignedIn: boolean;
  pendingSyncCount: number;
  onToggleDarkMode: () => void;
  onToggleLargeFont: () => void;
  onSaveOutlet: (updated: OutletProfile) => void;
  onSaveUser: (user: StaffUser) => void;
  onDeleteUser: (userId: string) => void;
}

export const SettingsView: React.FC<Props> = ({
  outlet,
  users,
  currentUser,
  darkMode,
  largeFont,
  isCloudSignedIn,
  pendingSyncCount,
  onToggleDarkMode,
  onToggleLargeFont,
  onSaveOutlet,
  onSaveUser,
  onDeleteUser,
}) => {
  const isOwner = currentUser.role === 'owner';
  const [tab, setTab] = useState<'outlet' | 'users' | 'appearance'>(
    isOwner ? 'outlet' : 'appearance'
  );

  // Outlet form state
  const [form, setForm] = useState<OutletProfile>(outlet);
  const [savedNotice, setSavedNotice] = useState(false);

  // User form state
  const [uName, setUName] = useState('');
  const [uEmail, setUEmail] = useState('');
  const [uRole, setURole] = useState<UserRole>('cashier');
  const [uPin, setUPin] = useState('');
  const [userError, setUserError] = useState<string | null>(null);

  const handleSaveOutletSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveOutlet({
      ...form,
      updatedAt: new Date().toISOString(),
    });
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2500);
  };

  const handleQrisUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setForm((prev) => ({ ...prev, qrisImageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);
    if (!uName.trim() || !uEmail.trim()) {
      setUserError('Nama dan email wajib diisi.');
      return;
    }
    if (!/^\d{4,6}$/.test(uPin.trim())) {
      setUserError('PIN harus berupa 4 hingga 6 digit angka.');
      return;
    }
    const now = new Date().toISOString();
    onSaveUser({
      id: `staff_${Date.now()}`,
      outletId: 'main',
      name: uName.trim(),
      email: uEmail.trim(),
      role: uRole,
      pinHash: hashPinSync(uPin.trim()),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    setUName('');
    setUEmail('');
    setUPin('');
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Pengaturan</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Profil outlet, pajak & layanan, struk, akun pengguna, serta preferensi tampilan PWA.
        </p>
      </div>

      <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800 w-fit overflow-x-auto">
        {isOwner && (
          <>
            <button
              type="button"
              onClick={() => setTab('outlet')}
              className={`min-h-[40px] px-4 rounded-lg text-xs font-semibold ${
                tab === 'outlet'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              Profil Outlet & Pajak
            </button>
            <button
              type="button"
              onClick={() => setTab('users')}
              className={`min-h-[40px] px-4 rounded-lg text-xs font-semibold ${
                tab === 'users'
                  ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                  : 'text-stone-600 dark:text-stone-400'
              }`}
            >
              Pengguna & PIN ({users.length})
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => setTab('appearance')}
          className={`min-h-[40px] px-4 rounded-lg text-xs font-semibold ${
            tab === 'appearance'
              ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
              : 'text-stone-600 dark:text-stone-400'
          }`}
        >
          Tampilan & PWA
        </button>
      </div>

      {tab === 'outlet' && isOwner && (
        <form
          onSubmit={handleSaveOutletSubmit}
          className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-4 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="out-name" className="block font-semibold mb-1">Nama Outlet</label>
              <input
                id="out-name"
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="out-phone" className="block font-semibold mb-1">Telepon</label>
              <input
                id="out-phone"
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="out-addr" className="block font-semibold mb-1">Alamat Lengkap</label>
              <input
                id="out-addr"
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="out-npwp" className="block font-semibold mb-1">NPWP (Opsional)</label>
              <input
                id="out-npwp"
                type="text"
                value={form.npwp}
                onChange={(e) => setForm({ ...form, npwp: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm font-mono"
              />
            </div>
            <div>
              <label htmlFor="out-hours" className="block font-semibold mb-1">Jam Operasional</label>
              <input
                id="out-hours"
                type="text"
                value={form.operatingHours}
                onChange={(e) => setForm({ ...form, operatingHours: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="out-tax" className="block font-semibold mb-1">Pajak PB1 (%)</label>
              <input
                id="out-tax"
                type="number"
                min={0}
                max={50}
                step={0.5}
                value={form.taxPercent}
                onChange={(e) => setForm({ ...form, taxPercent: Number(e.target.value) || 0 })}
                className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="out-svc" className="block font-semibold mb-1">Biaya Layanan (%)</label>
              <input
                id="out-svc"
                type="number"
                min={0}
                max={50}
                step={0.5}
                value={form.serviceChargePercent}
                onChange={(e) =>
                  setForm({ ...form, serviceChargePercent: Number(e.target.value) || 0 })
                }
                className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm tabular-nums"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="out-header" className="block font-semibold mb-1">Header Struk</label>
              <input
                id="out-header"
                type="text"
                value={form.receiptHeader}
                onChange={(e) => setForm({ ...form, receiptHeader: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="out-footer" className="block font-semibold mb-1">Footer Struk</label>
              <input
                id="out-footer"
                type="text"
                value={form.receiptFooter}
                onChange={(e) => setForm({ ...form, receiptFooter: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="out-qris-name" className="block font-semibold mb-1">Nama Merchant QRIS</label>
              <input
                id="out-qris-name"
                type="text"
                value={form.qrisMerchantName}
                onChange={(e) => setForm({ ...form, qrisMerchantName: e.target.value })}
                className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="out-qris-file" className="block font-semibold mb-1">
                Unggah Gambar QRIS Toko (Opsional)
              </label>
              <input
                id="out-qris-file"
                type="file"
                accept="image/*"
                onChange={handleQrisUpload}
                className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-stone-100 dark:file:bg-stone-800 file:font-semibold"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {savedNotice && (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <Check className="w-4 h-4" /> Pengaturan tersimpan
              </span>
            )}
            <button
              type="submit"
              className="min-h-[46px] px-6 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold"
            >
              Simpan Pengaturan Outlet
            </button>
          </div>
        </form>
      )}

      {tab === 'users' && isOwner && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={handleCreateUser}
            className="lg:col-span-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-3 h-fit"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-600" />
              <h3 className="text-sm font-bold">Tambah Staf / Kasir</h3>
            </div>
            {userError && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                {userError}
              </p>
            )}
            <input
              type="text"
              value={uName}
              onChange={(e) => setUName(e.target.value)}
              placeholder="Nama lengkap"
              className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm"
            />
            <input
              type="email"
              value={uEmail}
              onChange={(e) => setUEmail(e.target.value)}
              placeholder="Email staf"
              className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={uRole}
                onChange={(e) => setURole(e.target.value as UserRole)}
                className="min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-xs"
              >
                <option value="cashier">Kasir</option>
                <option value="manager">Manajer</option>
                <option value="owner">Owner</option>
              </select>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={uPin}
                onChange={(e) => setUPin(e.target.value)}
                placeholder="PIN 4–6 digit"
                className="min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm font-mono"
              />
            </div>
            <button
              type="submit"
              className="w-full min-h-[44px] rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Tambah Pengguna
            </button>
          </form>

          <div className="lg:col-span-8 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 divide-y divide-stone-100 dark:divide-stone-800">
            {users.map((u) => (
              <div key={u.id} className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{u.name}</p>
                  <p className="text-stone-500">
                    {u.email} · <span className="capitalize font-semibold">{u.role}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onSaveUser({ ...u, isActive: !u.isActive, updatedAt: new Date().toISOString() })
                    }
                    className={`min-h-[36px] px-3 rounded-lg border font-semibold ${
                      u.isActive
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                        : 'border-stone-200 bg-stone-100 text-stone-500'
                    }`}
                  >
                    {u.isActive ? 'Aktif' : 'Nonaktif'}
                  </button>
                  {u.id !== currentUser.id && (
                    <button
                      type="button"
                      aria-label={`Hapus pengguna ${u.name}`}
                      onClick={() => onDeleteUser(u.id)}
                      className="min-h-[36px] min-w-[36px] rounded-lg text-red-600 hover:bg-red-50 flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'appearance' && (
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold">Tema Tampilan</p>
              <p className="text-xs text-stone-500">
                Sesuaikan mode terang atau mode gelap untuk kenyamanan kasir.
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleDarkMode}
              className="min-h-[44px] px-4 rounded-xl border border-stone-200 dark:border-stone-700 flex items-center gap-2 text-xs font-semibold"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
              {darkMode ? 'Mode Terang' : 'Mode Gelap'}
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 pt-4 border-t border-stone-100 dark:border-stone-800">
            <div>
              <p className="text-sm font-bold">Ukuran Teks Antarmuka</p>
              <p className="text-xs text-stone-500">
                Perbesar teks tombol dan harga saat layar kasir dilihat dari jauh.
              </p>
            </div>
            <button
              type="button"
              onClick={onToggleLargeFont}
              className="min-h-[44px] px-4 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold"
            >
              {largeFont ? 'Ukuran Normal' : 'Ukuran Besar'}
            </button>
          </div>

          <div className="pt-4 border-t border-stone-100 dark:border-stone-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">Status Sinkronisasi Cloud</span>
              <span className={isCloudSignedIn ? 'text-emerald-600 font-semibold' : 'text-stone-500'}>
                {isCloudSignedIn ? 'Terhubung (Firebase Cloud)' : 'Mode Perangkat Lokal (PIN)'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold">Antrean Sinkronisasi Offline</span>
              <span className="font-mono">{pendingSyncCount} item tertunda</span>
            </div>
            <div className="max-w-xs">
              <PWAInstallButton />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
