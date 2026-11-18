import React, { useMemo, useState } from 'react';
import { Banknote, CheckCircle2, CreditCard, QrCode, Split, Users, X } from 'lucide-react';
import type { OutletProfile, PaymentEntry, PaymentMethod } from '../../types/pos';
import { computeCashChange, formatRupiah } from '../../utils/posCalculations';

interface Props {
  total: number;
  outlet: OutletProfile;
  cashierId: string;
  onClose: () => void;
  onConfirmPayment: (payments: PaymentEntry[], paidAmount: number, changeAmount: number) => void;
}

type PaymentMode = 'cash' | 'qris' | 'mixed' | 'other';

export const PaymentModal: React.FC<Props> = ({
  total,
  outlet,
  cashierId,
  onClose,
  onConfirmPayment,
}) => {
  const [mode, setMode] = useState<PaymentMode>('cash');
  const [cashInput, setCashInput] = useState<string>(String(total));
  const [qrisRef, setQrisRef] = useState<string>('');
  const [otherMethod, setOtherMethod] = useState<'transfer' | 'ewallet'>('transfer');
  const [otherRef, setOtherRef] = useState<string>('');

  // Mixed payment state
  const [mixedCash, setMixedCash] = useState<string>(String(Math.floor(total / 2)));
  const [mixedNonCashMethod, setMixedNonCashMethod] = useState<'qris' | 'transfer' | 'ewallet'>('qris');
  const [mixedRef, setMixedRef] = useState<string>('');

  // Split bill helper
  const [splitPeople, setSplitPeople] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);

  const cashNumeric = Math.max(0, Number(cashInput.replace(/\D/g, '')) || 0);
  const cashCalc = useMemo(() => computeCashChange(total, cashNumeric), [total, cashNumeric]);

  const mixedCashNum = Math.max(0, Number(mixedCash.replace(/\D/g, '')) || 0);
  const mixedNonCashNum = Math.max(0, total - mixedCashNum);

  const quickCashAmounts = useMemo(() => {
    const presets = [total, 20000, 50000, 100000, 150000, 200000];
    return Array.from(new Set(presets.filter((v) => v >= total || v === total))).slice(0, 5);
  }, [total]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const now = new Date().toISOString();

    if (mode === 'cash') {
      if (!cashCalc.isEnough) {
        setError(`Uang tunai kurang ${formatRupiah(cashCalc.shortfall)}.`);
        return;
      }
      onConfirmPayment(
        [
          {
            id: `pay_${Date.now()}`,
            method: 'cash',
            amount: cashNumeric,
            reference: '',
            paidAt: now,
            receivedBy: cashierId,
          },
        ],
        cashNumeric,
        cashCalc.changeAmount
      );
      return;
    }

    if (mode === 'qris') {
      onConfirmPayment(
        [
          {
            id: `pay_${Date.now()}`,
            method: 'qris',
            amount: total,
            reference: qrisRef.trim() || `QRIS-${Date.now().toString().slice(-6)}`,
            paidAt: now,
            receivedBy: cashierId,
          },
        ],
        total,
        0
      );
      return;
    }

    if (mode === 'other') {
      onConfirmPayment(
        [
          {
            id: `pay_${Date.now()}`,
            method: otherMethod,
            amount: total,
            reference: otherRef.trim() || `${otherMethod.toUpperCase()}-${Date.now().toString().slice(-6)}`,
            paidAt: now,
            receivedBy: cashierId,
          },
        ],
        total,
        0
      );
      return;
    }

    // Mixed payment
    if (mixedCashNum <= 0 && mixedNonCashNum <= 0) {
      setError('Masukkan nominal pembayaran campuran yang valid.');
      return;
    }
    const entries: PaymentEntry[] = [];
    if (mixedCashNum > 0) {
      entries.push({
        id: `pay_${Date.now()}_1`,
        method: 'cash',
        amount: Math.min(total, mixedCashNum),
        reference: '',
        paidAt: now,
        receivedBy: cashierId,
      });
    }
    if (mixedNonCashNum > 0) {
      entries.push({
        id: `pay_${Date.now()}_2`,
        method: mixedNonCashMethod as PaymentMethod,
        amount: mixedNonCashNum,
        reference: mixedRef.trim() || `MIX-${Date.now().toString().slice(-6)}`,
        paidAt: now,
        receivedBy: cashierId,
      });
    }
    const paidTotal = entries.reduce((s, p) => s + p.amount, 0);
    onConfirmPayment(entries, paidTotal, Math.max(0, mixedCashNum - total));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
        className="w-full sm:max-w-xl rounded-t-2xl sm:rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 max-h-[92vh] flex flex-col overflow-hidden"
      >
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div>
            <h3 id="payment-modal-title" className="text-lg font-bold text-stone-900 dark:text-stone-100">
              Pembayaran Pesanan
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Total Tagihan:{' '}
              <span className="font-bold text-base text-orange-600 dark:text-orange-400 tabular-nums">
                {formatRupiah(total)}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pembayaran"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Payment method tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                { id: 'cash', label: 'Tunai', icon: Banknote },
                { id: 'qris', label: 'QRIS', icon: QrCode },
                { id: 'mixed', label: 'Campuran', icon: Split },
                { id: 'other', label: 'Transfer', icon: CreditCard },
              ] as const
            ).map((item) => {
              const Icon = item.icon;
              const active = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setMode(item.id);
                    setError(null);
                  }}
                  className={`min-h-[48px] rounded-xl border px-3 py-2 flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${
                    active
                      ? 'border-orange-600 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300'
                      : 'border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Split Bill Helper */}
          <div className="rounded-xl border border-stone-200 dark:border-stone-800 p-3 flex flex-wrap items-center justify-between gap-2 bg-stone-50 dark:bg-stone-950/40">
            <div className="flex items-center gap-2 text-xs font-medium text-stone-700 dark:text-stone-300">
              <Users className="w-4 h-4 text-stone-500" />
              <span>Kalkulator Patungan (Split Bill)</span>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSplitPeople(n)}
                  className={`min-h-[34px] px-2.5 rounded-lg text-xs font-semibold border transition-colors ${
                    splitPeople === n
                      ? 'border-orange-600 bg-orange-600 text-white'
                      : 'border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                  }`}
                >
                  {n}x
                </button>
              ))}
              {splitPeople > 1 && (
                <span className="text-xs font-bold text-stone-900 dark:text-stone-100 tabular-nums ml-1">
                  {formatRupiah(Math.ceil(total / splitPeople))}/org
                </span>
              )}
            </div>
          </div>

          {error && (
            <div role="alert" className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {mode === 'cash' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="cash-received-input" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
                  Uang Tunai Diterima
                </label>
                <input
                  id="cash-received-input"
                  type="number"
                  min={0}
                  step={500}
                  value={cashInput}
                  onChange={(e) => {
                    setCashInput(e.target.value);
                    setError(null);
                  }}
                  className="w-full min-h-[52px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-4 text-xl font-bold tabular-nums text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                {quickCashAmounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => {
                      setCashInput(String(amt));
                      setError(null);
                    }}
                    className="min-h-[44px] px-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 hover:bg-stone-100 dark:hover:bg-stone-700 text-xs font-semibold tabular-nums text-stone-800 dark:text-stone-200"
                  >
                    {amt === total ? `Uang Pas (${formatRupiah(amt)})` : formatRupiah(amt)}
                  </button>
                ))}
              </div>

              <div
                className={`rounded-xl p-4 border flex items-center justify-between ${
                  cashCalc.isEnough
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                }`}
              >
                <span className="text-sm font-semibold">
                  {cashCalc.isEnough ? 'Kembalian' : 'Kurang Bayar'}
                </span>
                <span className="text-xl font-bold tabular-nums">
                  {formatRupiah(cashCalc.isEnough ? cashCalc.changeAmount : cashCalc.shortfall)}
                </span>
              </div>
            </div>
          )}

          {mode === 'qris' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-stone-200 dark:border-stone-700 p-5 flex flex-col items-center text-center gap-3 bg-stone-50 dark:bg-stone-800/40">
                {outlet.qrisImageUrl ? (
                  <img
                    src={outlet.qrisImageUrl}
                    alt={`QRIS ${outlet.qrisMerchantName}`}
                    className="w-44 h-44 object-contain rounded-lg bg-white p-2 border border-stone-200"
                  />
                ) : (
                  <div className="w-44 h-44 bg-white rounded-xl p-3 border border-stone-200 flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full text-stone-900" aria-label="Kode QRIS Toko">
                      <rect x="6" y="6" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="5" />
                      <rect x="13" y="13" width="12" height="12" fill="currentColor" />
                      <rect x="68" y="6" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="5" />
                      <rect x="75" y="13" width="12" height="12" fill="currentColor" />
                      <rect x="6" y="68" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="5" />
                      <rect x="13" y="75" width="12" height="12" fill="currentColor" />
                      <path
                        d="M40 10h8v8h-8zm12 0h8v14h-8zm-12 16h8v8h-8zm16 8h10v8H56zM10 42h14v8H10zm20 0h12v12H30zm18 4h10v8H48zm16-4h12v10H64zm18 0h8v16h-8zM42 60h10v10H42zm16 0h8v14h-8zm14 4h12v8H72zm-30 16h12v10H42zm18 2h14v8H60zm20-4h10v12H80z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    {outlet.qrisMerchantName || outlet.name}
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Minta pelanggan memindai QRIS lalu pastikan notifikasi dana masuk sesuai nominal{' '}
                    <strong className="text-stone-900 dark:text-stone-100 tabular-nums">{formatRupiah(total)}</strong>.
                  </p>
                </div>
              </div>
              <div>
                <label htmlFor="qris-ref-input" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Nomor Referensi / Approval QRIS (Opsional)
                </label>
                <input
                  id="qris-ref-input"
                  type="text"
                  value={qrisRef}
                  onChange={(e) => setQrisRef(e.target.value)}
                  placeholder="Contoh: 88291044"
                  className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm"
                />
              </div>
            </div>
          )}

          {mode === 'mixed' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="mixed-cash-input" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Nominal Tunai
                </label>
                <input
                  id="mixed-cash-input"
                  type="number"
                  min={0}
                  max={total}
                  value={mixedCash}
                  onChange={(e) => setMixedCash(e.target.value)}
                  className="w-full min-h-[48px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-base font-bold tabular-nums"
                />
              </div>
              <div className="rounded-xl border border-stone-200 dark:border-stone-700 p-3.5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-stone-600 dark:text-stone-400">Sisa Non-Tunai</span>
                  <span className="font-bold text-stone-900 dark:text-stone-100 tabular-nums">
                    {formatRupiah(mixedNonCashNum)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(['qris', 'transfer', 'ewallet'] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMixedNonCashMethod(m)}
                      className={`min-h-[40px] rounded-lg border text-xs font-semibold uppercase ${
                        mixedNonCashMethod === m
                          ? 'border-orange-600 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300'
                          : 'border-stone-200 dark:border-stone-700'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={mixedRef}
                  onChange={(e) => setMixedRef(e.target.value)}
                  placeholder="Referensi non-tunai (opsional)"
                  className="w-full min-h-[42px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-xs"
                />
              </div>
            </div>
          )}

          {mode === 'other' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOtherMethod('transfer')}
                  className={`min-h-[48px] rounded-xl border text-sm font-semibold ${
                    otherMethod === 'transfer'
                      ? 'border-orange-600 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300'
                      : 'border-stone-200 dark:border-stone-700'
                  }`}
                >
                  Transfer Bank
                </button>
                <button
                  type="button"
                  onClick={() => setOtherMethod('ewallet')}
                  className={`min-h-[48px] rounded-xl border text-sm font-semibold ${
                    otherMethod === 'ewallet'
                      ? 'border-orange-600 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300'
                      : 'border-stone-200 dark:border-stone-700'
                  }`}
                >
                  E-Wallet Lainnya
                </button>
              </div>
              <div>
                <label htmlFor="other-ref-input" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                  Catatan / Nomor Referensi Bukti Transfer
                </label>
                <input
                  id="other-ref-input"
                  type="text"
                  value={otherRef}
                  onChange={(e) => setOtherRef(e.target.value)}
                  placeholder="Contoh: BCA a.n. Budi"
                  className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full min-h-[52px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base flex items-center justify-center gap-2 transition-colors"
          >
            <CheckCircle2 className="w-5 h-5" />
            {mode === 'qris' ? 'Konfirmasi Pembayaran QRIS Masuk' : 'Selesaikan Pembayaran'}
          </button>
        </form>
      </div>
    </div>
  );
};
