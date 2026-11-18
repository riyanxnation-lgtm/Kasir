import React, { useMemo, useState } from 'react';
import { Ban, Printer, Search, ShieldAlert, X } from 'lucide-react';
import type { Order, PaymentMethod, StaffUser } from '../../types/pos';
import {
  formatDateTimeWIB,
  formatRupiah,
  getJakartaDateKey,
  hashPinSync,
} from '../../utils/posCalculations';

interface Props {
  orders: Order[];
  users: StaffUser[];
  currentUser: StaffUser;
  onSelectReceipt: (order: Order) => void;
  onVoidOrder: (orderId: string, reason: string, authorizedByUser: StaffUser) => void;
}

const STATUS_TEXT: Record<Order['status'], { label: string; cls: string }> = {
  hold: { label: 'Hold', cls: 'text-amber-600 dark:text-amber-400' },
  new: { label: 'Baru', cls: 'text-orange-600 dark:text-orange-400' },
  preparing: { label: 'Diproses', cls: 'text-orange-600 dark:text-orange-400' },
  ready: { label: 'Siap', cls: 'text-emerald-600 dark:text-emerald-400' },
  completed: { label: 'Selesai', cls: 'text-emerald-700 dark:text-emerald-400' },
  cancelled: { label: 'Dibatalkan', cls: 'text-stone-500' },
  void: { label: 'Void', cls: 'text-red-600 dark:text-red-400' },
};

const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  transfer: 'Transfer',
  ewallet: 'E-Wallet',
};

export const TransactionsView: React.FC<Props> = ({
  orders,
  users,
  currentUser,
  onSelectReceipt,
  onVoidOrder,
}) => {
  const [search, setSearch] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [cashierFilter, setCashierFilter] = useState<string>('all');

  const [voidTarget, setVoidTarget] = useState<Order | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [authPin, setAuthPin] = useState('');
  const [voidError, setVoidError] = useState<string | null>(null);

  const canDirectVoid = currentUser.role === 'owner' || currentUser.role === 'manager';

  const visibleOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders
      .filter((o) => {
        if (o.status === 'hold') return false;
        // Cashier role only sees their own transactions per PRD Section 3 & 9.4
        if (currentUser.role === 'cashier' && o.userId !== currentUser.id) return false;
        if (statusFilter !== 'all' && o.status !== statusFilter) return false;
        if (cashierFilter !== 'all' && o.userId !== cashierFilter) return false;
        if (dateFilter && getJakartaDateKey(new Date(o.createdAt)) !== dateFilter) return false;
        if (methodFilter !== 'all' && !o.payments.some((p) => p.method === methodFilter)) return false;
        if (q) {
          const hitNum = o.orderNumber.toLowerCase().includes(q);
          const hitCust = (o.tableOrCustomerName || '').toLowerCase().includes(q);
          if (!hitNum && !hitCust) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [orders, currentUser, statusFilter, cashierFilter, dateFilter, methodFilter, search]);

  const handleConfirmVoid = (e: React.FormEvent) => {
    e.preventDefault();
    setVoidError(null);
    if (!voidTarget) return;
    if (voidReason.trim().length < 3) {
      setVoidError('Alasan void wajib diisi minimal 3 karakter.');
      return;
    }

    let authorizer: StaffUser | undefined = canDirectVoid ? currentUser : undefined;
    if (!canDirectVoid) {
      if (!authPin.trim()) {
        setVoidError('Masukkan PIN Manajer atau Owner untuk otorisasi void.');
        return;
      }
      const hashed = hashPinSync(authPin.trim());
      authorizer = users.find(
        (u) => u.isActive && (u.role === 'owner' || u.role === 'manager') && u.pinHash === hashed
      );
      if (!authorizer) {
        setVoidError('PIN otorisasi Manajer/Owner tidak valid.');
        return;
      }
    }

    onVoidOrder(voidTarget.id, voidReason.trim(), authorizer!);
    setVoidTarget(null);
    setVoidReason('');
    setAuthPin('');
  };

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <div>
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Riwayat Transaksi</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          {currentUser.role === 'cashier'
            ? 'Daftar transaksi yang Anda tangani. Cetak ulang struk atau ajukan void dengan otorisasi Manajer/Owner.'
            : 'Filter seluruh transaksi outlet, cetak ulang struk, dan kelola void/refund.'}
        </p>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            aria-label="Cari nomor struk atau nama pelanggan"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari no. struk / meja / pelanggan..."
            className="w-full min-h-[42px] rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 pl-9 pr-3 text-xs"
          />
        </div>
        <input
          type="date"
          aria-label="Filter tanggal"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="min-h-[42px] rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3 text-xs"
        />
        <select
          aria-label="Filter status transaksi"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="min-h-[42px] rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3 text-xs"
        >
          <option value="all">Semua Status</option>
          <option value="completed">Selesai</option>
          <option value="new">Baru / Proses</option>
          <option value="void">Void</option>
          <option value="cancelled">Dibatalkan</option>
        </select>
        <div className="flex gap-2">
          <select
            aria-label="Filter metode bayar"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="flex-1 min-h-[42px] rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3 text-xs"
          >
            <option value="all">Semua Bayar</option>
            <option value="cash">Tunai</option>
            <option value="qris">QRIS</option>
            <option value="transfer">Transfer</option>
            <option value="ewallet">E-Wallet</option>
          </select>
          {currentUser.role !== 'cashier' && (
            <select
              aria-label="Filter kasir"
              value={cashierFilter}
              onChange={(e) => setCashierFilter(e.target.value)}
              className="flex-1 min-h-[42px] rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3 text-xs"
            >
              <option value="all">Semua Kasir</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
        {visibleOrders.length === 0 ? (
          <div className="p-10 text-center text-xs text-stone-500">
            Tidak ada transaksi yang sesuai dengan filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">No. Struk</th>
                  <th className="py-3 px-4 font-semibold">Waktu</th>
                  <th className="py-3 px-4 font-semibold">Kasir · Meja</th>
                  <th className="py-3 px-4 font-semibold">Metode</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold text-right">Total</th>
                  <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {visibleOrders.map((o) => {
                  const st = STATUS_TEXT[o.status] || STATUS_TEXT.completed;
                  const canVoid = o.status !== 'void' && o.status !== 'cancelled';
                  return (
                    <tr key={o.id} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40">
                      <td className="py-3 px-4 font-mono font-semibold text-stone-900 dark:text-stone-100">
                        {o.orderNumber}
                        {o.syncStatus === 'pending' && (
                          <span className="ml-1.5 text-[10px] font-sans text-amber-600">(Antre Sinkron)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-stone-500 dark:text-stone-400 whitespace-nowrap">
                        {formatDateTimeWIB(o.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-stone-700 dark:text-stone-300">
                        {o.userName}
                        {o.tableOrCustomerName ? ` · ${o.tableOrCustomerName}` : ''}
                      </td>
                      <td className="py-3 px-4 text-stone-600 dark:text-stone-300">
                        {o.payments.map((p) => PAYMENT_LABEL[p.method] || p.method).join(' + ') || '-'}
                      </td>
                      <td className={`py-3 px-4 font-semibold ${st.cls}`}>{st.label}</td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums text-stone-900 dark:text-stone-100">
                        {formatRupiah(o.total)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            aria-label={`Struk ${o.orderNumber}`}
                            onClick={() => onSelectReceipt(o)}
                            className="min-h-[36px] px-2.5 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 font-medium inline-flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Struk
                          </button>
                          {canVoid && (
                            <button
                              type="button"
                              aria-label={`Void ${o.orderNumber}`}
                              onClick={() => {
                                setVoidTarget(o);
                                setVoidReason('');
                                setAuthPin('');
                                setVoidError(null);
                              }}
                              className="min-h-[36px] px-2.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-medium inline-flex items-center gap-1"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              Void
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Void Authorization Modal */}
      {voidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="void-modal-title"
            className="w-full max-w-md rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 text-red-600 dark:text-red-400">
                <ShieldAlert className="w-5 h-5 shrink-0" />
                <h3 id="void-modal-title" className="text-base font-bold">
                  Void Transaksi {voidTarget.orderNumber}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Tutup dialog void"
                onClick={() => setVoidTarget(null)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-stone-600 dark:text-stone-300">
              Nilai transaksi sebesar{' '}
              <strong className="tabular-nums">{formatRupiah(voidTarget.total)}</strong> akan dibatalkan dan dicatat ke log aktivitas.
            </p>

            <form onSubmit={handleConfirmVoid} className="space-y-3">
              {voidError && (
                <div role="alert" className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                  {voidError}
                </div>
              )}

              <div>
                <label htmlFor="void-reason-input" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Alasan Void / Refund (Wajib)
                </label>
                <input
                  id="void-reason-input"
                  type="text"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Contoh: Pelanggan membatalkan pesanan / salah input menu"
                  className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm"
                />
              </div>

              {!canDirectVoid && (
                <div>
                  <label htmlFor="void-pin-input" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                    PIN Otorisasi Manajer / Owner
                  </label>
                  <input
                    id="void-pin-input"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={authPin}
                    onChange={(e) => setAuthPin(e.target.value)}
                    placeholder="Masukkan PIN Manajer/Owner"
                    className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm font-mono"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setVoidTarget(null)}
                  className="min-h-[46px] px-4 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[46px] rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
                >
                  Konfirmasi Void Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
