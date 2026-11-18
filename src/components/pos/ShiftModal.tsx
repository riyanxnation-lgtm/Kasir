import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Plus, Receipt, Wallet } from 'lucide-react';
import type { Expense, Order, Shift, StaffUser } from '../../types/pos';
import {
  computeShiftCashDifference,
  computeShiftCashSummary,
  formatDateTimeWIB,
  formatRupiah,
} from '../../utils/posCalculations';

interface Props {
  activeShift: Shift | null;
  shifts: Shift[];
  orders: Order[];
  expenses: Expense[];
  currentUser: StaffUser;
  onOpenShift: (openingCash: number, note: string) => void;
  onCloseShift: (shiftId: string, actualCash: number, expectedCash: number, note: string) => void;
  onAddExpense: (shiftId: string, description: string, amount: number) => void;
}

export const ShiftView: React.FC<Props> = ({
  activeShift,
  shifts,
  orders,
  expenses,
  currentUser,
  onOpenShift,
  onCloseShift,
  onAddExpense,
}) => {
  const [openingCash, setOpeningCash] = useState('300000');
  const [openingNote, setOpeningNote] = useState('');

  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmt, setExpenseAmt] = useState('');
  const [expenseError, setExpenseError] = useState<string | null>(null);

  const [actualCashInput, setActualCashInput] = useState('');
  const [closeNote, setCloseNote] = useState('');
  const [closeError, setCloseError] = useState<string | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const activeSummary = useMemo(() => {
    if (!activeShift) return null;
    return computeShiftCashSummary(activeShift, orders, expenses);
  }, [activeShift, orders, expenses]);

  const activeExpenses = useMemo(() => {
    if (!activeShift) return [];
    return expenses
      .filter((e) => e.shiftId === activeShift.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [activeShift, expenses]);

  const actualCashNum = actualCashInput === '' ? null : Math.max(0, Number(actualCashInput) || 0);
  const difference =
    activeSummary && actualCashNum !== null
      ? computeShiftCashDifference(activeSummary.expectedCash, actualCashNum)
      : null;

  const handleOpenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cash = Math.max(0, Number(openingCash) || 0);
    onOpenShift(cash, openingNote.trim());
    setOpeningNote('');
  };

  const handleExpenseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseError(null);
    if (!activeShift) return;
    const amt = Number(expenseAmt);
    if (!expenseDesc.trim() || !amt || amt <= 0) {
      setExpenseError('Isi keterangan dan nominal pengeluaran lebih dari Rp 0.');
      return;
    }
    onAddExpense(activeShift.id, expenseDesc.trim(), amt);
    setExpenseDesc('');
    setExpenseAmt('');
  };

  const handleCloseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCloseError(null);
    if (!activeShift || !activeSummary) return;
    if (actualCashInput.trim() === '') {
      setCloseError('Masukkan jumlah kas aktual di laci kas sebelum menutup shift.');
      return;
    }
    const actual = Math.max(0, Number(actualCashInput) || 0);
    onCloseShift(activeShift.id, actual, activeSummary.expectedCash, closeNote.trim());
    setActualCashInput('');
    setCloseNote('');
    setShowCloseConfirm(false);
  };

  const closedShifts = useMemo(
    () =>
      shifts
        .filter((s) => s.status === 'closed')
        .sort((a, b) => (b.closedAt || b.openedAt).localeCompare(a.closedAt || a.openedAt)),
    [shifts]
  );

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Shift & Laci Kas</h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Kelola modal awal, pengeluaran kas kecil, dan rekonsiliasi kas tutup shift.
        </p>
      </div>

      {!activeShift ? (
        <form
          onSubmit={handleOpenSubmit}
          className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-6 max-w-lg space-y-5"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">Buka Shift Baru</h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Operator: {currentUser.name}
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="opening-cash-input" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              Modal Awal Kas (Rp)
            </label>
            <input
              id="opening-cash-input"
              type="number"
              min={0}
              step={1000}
              value={openingCash}
              onChange={(e) => setOpeningCash(e.target.value)}
              className="w-full min-h-[48px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-lg font-bold tabular-nums"
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {[200000, 300000, 500000, 1000000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setOpeningCash(String(v))}
                  className="min-h-[38px] px-3 rounded-lg border border-stone-200 dark:border-stone-700 text-xs font-semibold tabular-nums hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  {formatRupiah(v)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="opening-note" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              Catatan Buka Shift (Opsional)
            </label>
            <input
              id="opening-note"
              type="text"
              value={openingNote}
              onChange={(e) => setOpeningNote(e.target.value)}
              placeholder="Contoh: Uang pecah 10rb & 5rb cukup"
              className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm"
            />
          </div>

          <button
            type="submit"
            className="w-full min-h-[48px] rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm transition-colors"
          >
            Mulai Shift Kasir
          </button>
        </form>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Active Shift Summary & Close */}
          <div className="lg:col-span-7 space-y-5">
            <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-200 dark:border-stone-800">
                <div>
                  <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    Shift Aktif · {activeShift.userName}
                  </span>
                  <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                    Dibuka {formatDateTimeWIB(activeShift.openedAt)}
                  </p>
                </div>
                {!showCloseConfirm && (
                  <button
                    type="button"
                    onClick={() => setShowCloseConfirm(true)}
                    className="min-h-[44px] px-4 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-semibold hover:opacity-90"
                  >
                    Tutup Shift
                  </button>
                )}
              </div>

              {activeSummary && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Modal Awal</p>
                    <p className="text-base font-bold tabular-nums text-stone-900 dark:text-stone-100">
                      {formatRupiah(activeSummary.openingCash)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Penjualan Tunai</p>
                    <p className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      +{formatRupiah(activeSummary.cashSalesTotal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Non-Tunai (QRIS/Tf)</p>
                    <p className="text-base font-bold tabular-nums text-stone-900 dark:text-stone-100">
                      {formatRupiah(activeSummary.nonCashSalesTotal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Kas Keluar / Biaya</p>
                    <p className="text-base font-bold tabular-nums text-red-600 dark:text-red-400">
                      -{formatRupiah(activeSummary.expensesTotal)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-500 dark:text-stone-400">Transaksi Selesai</p>
                    <p className="text-base font-bold tabular-nums text-stone-900 dark:text-stone-100">
                      {activeSummary.completedOrderCount} pesanan
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                      Kas Seharusnya di Laci
                    </p>
                    <p className="text-lg font-bold tabular-nums text-orange-600 dark:text-orange-400">
                      {formatRupiah(activeSummary.expectedCash)}
                    </p>
                  </div>
                </div>
              )}

              {showCloseConfirm && activeSummary && (
                <form
                  onSubmit={handleCloseSubmit}
                  className="pt-4 border-t border-stone-200 dark:border-stone-800 space-y-4"
                >
                  <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    Hitung Kas Aktual Tutup Shift
                  </h4>

                  {closeError && (
                    <div role="alert" className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-300">
                      {closeError}
                    </div>
                  )}

                  <div>
                    <label htmlFor="actual-cash-input" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Jumlah Uang Tunai Aktual di Laci (Rp)
                    </label>
                    <input
                      id="actual-cash-input"
                      type="number"
                      min={0}
                      value={actualCashInput}
                      onChange={(e) => {
                        setActualCashInput(e.target.value);
                        setCloseError(null);
                      }}
                      placeholder={String(activeSummary.expectedCash)}
                      className="w-full min-h-[48px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-lg font-bold tabular-nums"
                    />
                  </div>

                  {difference !== null && (
                    <div
                      className={`rounded-xl p-3 border flex items-center justify-between text-sm ${
                        difference === 0
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                          : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                      }`}
                    >
                      <span className="flex items-center gap-2 font-semibold">
                        {difference === 0 ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {difference === 0 ? 'Kas Sesuai Sistem' : difference > 0 ? 'Selisih Lebih' : 'Selisih Kurang'}
                      </span>
                      <span className="font-bold tabular-nums">{formatRupiah(difference)}</span>
                    </div>
                  )}

                  <div>
                    <label htmlFor="close-shift-note" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                      Catatan Penutupan (Opsional)
                    </label>
                    <input
                      id="close-shift-note"
                      type="text"
                      value={closeNote}
                      onChange={(e) => setCloseNote(e.target.value)}
                      placeholder="Contoh: Setoran tunai ke brankas"
                      className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCloseConfirm(false)}
                      className="min-h-[48px] px-4 rounded-xl border border-stone-200 dark:border-stone-700 text-sm font-semibold"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 min-h-[48px] rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold"
                    >
                      Konfirmasi Tutup Shift
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Petty Cash Expenses */}
          <div className="lg:col-span-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4 text-orange-600" />
              <h3 className="text-base font-bold text-stone-900 dark:text-stone-100">
                Catat Pengeluaran Kas
              </h3>
            </div>

            <form onSubmit={handleExpenseSubmit} className="space-y-3">
              {expenseError && (
                <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                  {expenseError}
                </p>
              )}
              <div>
                <label htmlFor="exp-desc" className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                  Keperluan
                </label>
                <input
                  id="exp-desc"
                  type="text"
                  value={expenseDesc}
                  onChange={(e) => setExpenseDesc(e.target.value)}
                  placeholder="Contoh: Beli es batu, gas, plastik"
                  className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm"
                />
              </div>
              <div>
                <label htmlFor="exp-amt" className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                  Nominal (Rp)
                </label>
                <input
                  id="exp-amt"
                  type="number"
                  min={100}
                  value={expenseAmt}
                  onChange={(e) => setExpenseAmt(e.target.value)}
                  placeholder="15000"
                  className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm tabular-nums"
                />
              </div>
              <button
                type="submit"
                className="w-full min-h-[44px] rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Simpan Pengeluaran
              </button>
            </form>

            <div className="pt-3 border-t border-stone-200 dark:border-stone-800 space-y-2">
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                Pengeluaran Shift Ini ({activeExpenses.length})
              </p>
              {activeExpenses.length === 0 ? (
                <p className="text-xs text-stone-400 py-2">Belum ada pengeluaran kas.</p>
              ) : (
                <div className="divide-y divide-stone-100 dark:divide-stone-800 max-h-56 overflow-y-auto">
                  {activeExpenses.map((ex) => (
                    <div key={ex.id} className="py-2 flex items-center justify-between gap-2 text-xs">
                      <div>
                        <p className="font-medium text-stone-800 dark:text-stone-200">{ex.description}</p>
                        <p className="text-stone-400">{formatDateTimeWIB(ex.createdAt)}</p>
                      </div>
                      <span className="font-bold tabular-nums text-red-600 dark:text-red-400">
                        -{formatRupiah(ex.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Closed Shifts History */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center gap-2">
          <Clock className="w-4 h-4 text-stone-500" />
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">Riwayat Tutup Shift</h3>
        </div>
        {closedShifts.length === 0 ? (
          <p className="p-5 text-xs text-stone-500">Belum ada riwayat shift yang ditutup.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Kasir</th>
                  <th className="py-3 px-4 font-semibold">Waktu Tutup</th>
                  <th className="py-3 px-4 font-semibold text-right">Modal Awal</th>
                  <th className="py-3 px-4 font-semibold text-right">Seharusnya</th>
                  <th className="py-3 px-4 font-semibold text-right">Aktual</th>
                  <th className="py-3 px-4 font-semibold text-right">Selisih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {closedShifts.map((s) => (
                  <tr key={s.id} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40">
                    <td className="py-3 px-4 font-medium text-stone-900 dark:text-stone-100">{s.userName}</td>
                    <td className="py-3 px-4 text-stone-500 dark:text-stone-400">
                      {s.closedAt ? formatDateTimeWIB(s.closedAt) : '-'}
                    </td>
                    <td className="py-3 px-4 text-right tabular-nums">{formatRupiah(s.openingCash)}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{formatRupiah(s.expectedCash || 0)}</td>
                    <td className="py-3 px-4 text-right tabular-nums">{formatRupiah(s.actualCash || 0)}</td>
                    <td
                      className={`py-3 px-4 text-right font-bold tabular-nums ${
                        (s.cashDifference || 0) === 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {formatRupiah(s.cashDifference || 0)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
