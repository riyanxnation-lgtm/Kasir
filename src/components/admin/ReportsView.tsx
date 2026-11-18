import React, { useMemo, useState } from 'react';
import { FileDown, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import {
  exportSalesReportCSV,
  exportSalesReportExcel,
  exportSalesReportPDF,
} from '../../services/exportService';
import type {
  AuditLog,
  Category,
  Order,
  OutletProfile,
  Product,
  Shift,
} from '../../types/pos';
import {
  computeAnalyticsSummary,
  formatDateTimeWIB,
  formatRupiah,
  getJakartaDateKey,
} from '../../utils/posCalculations';

interface Props {
  outlet: OutletProfile;
  orders: Order[];
  products: Product[];
  categories: Category[];
  shifts: Shift[];
  auditLogs: AuditLog[];
}

export const ReportsView: React.FC<Props> = ({
  outlet,
  orders,
  products,
  categories,
  shifts,
  auditLogs,
}) => {
  const todayKey = useMemo(() => getJakartaDateKey(new Date()), []);
  const [preset, setPreset] = useState<'today' | '7d' | '30d' | 'custom'>('7d');
  const [customStart, setCustomStart] = useState(() =>
    getJakartaDateKey(new Date(Date.now() - 6 * 86400000))
  );
  const [customEnd, setCustomEnd] = useState(todayKey);

  const { startKey, endKey, periodLabel } = useMemo(() => {
    if (preset === 'today') {
      return { startKey: todayKey, endKey: todayKey, periodLabel: 'Hari Ini' };
    }
    if (preset === '7d') {
      const s = getJakartaDateKey(new Date(Date.now() - 6 * 86400000));
      return { startKey: s, endKey: todayKey, periodLabel: '7 Hari Terakhir' };
    }
    if (preset === '30d') {
      const s = getJakartaDateKey(new Date(Date.now() - 29 * 86400000));
      return { startKey: s, endKey: todayKey, periodLabel: '30 Hari Terakhir' };
    }
    return {
      startKey: customStart,
      endKey: customEnd,
      periodLabel: `${customStart} s/d ${customEnd}`,
    };
  }, [preset, todayKey, customStart, customEnd]);

  const summary = useMemo(
    () => computeAnalyticsSummary(orders, products, categories, startKey, endKey),
    [orders, products, categories, startKey, endKey]
  );

  const filteredOrders = useMemo(
    () =>
      orders.filter((o) => {
        if (o.status === 'hold') return false;
        const dk = getJakartaDateKey(new Date(o.createdAt));
        return dk >= startKey && dk <= endKey;
      }),
    [orders, startKey, endKey]
  );

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
            Laporan & Analitik Penjualan
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Analisis penjualan per kategori, metode bayar, tipe layanan, kasir, serta ekspor dokumen.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportSalesReportCSV(filteredOrders)}
            className="min-h-[44px] px-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-semibold flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Ekspor CSV
          </button>
          <button
            type="button"
            onClick={() => exportSalesReportExcel(filteredOrders, shifts, summary, periodLabel)}
            className="min-h-[44px] px-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-semibold flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Ekspor Excel
          </button>
          <button
            type="button"
            onClick={() => exportSalesReportPDF(outlet, summary, periodLabel)}
            className="min-h-[44px] px-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <FileDown className="w-4 h-4" />
            Ekspor PDF
          </button>
        </div>
      </div>

      {/* Period Bar */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'today', label: 'Hari Ini' },
              { id: '7d', label: '7 Hari' },
              { id: '30d', label: '30 Hari' },
              { id: 'custom', label: 'Rentang Kustom' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPreset(p.id)}
              className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold transition-colors ${
                preset === p.id
                  ? 'bg-orange-600 text-white'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <input
              type="date"
              aria-label="Tanggal mulai"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="min-h-[40px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3"
            />
            <span>s/d</span>
            <input
              type="date"
              aria-label="Tanggal akhir"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="min-h-[40px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3"
            />
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
          <p className="text-xs text-stone-500">Total Omzet</p>
          <p className="text-xl font-bold tabular-nums mt-1">{formatRupiah(summary.totalRevenue)}</p>
        </div>
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
          <p className="text-xs text-stone-500">Transaksi Berhasil</p>
          <p className="text-xl font-bold tabular-nums mt-1">{summary.orderCount} pesanan</p>
        </div>
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
          <p className="text-xs text-stone-500">Estimasi Laba Kotor</p>
          <p className="text-xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
            {formatRupiah(summary.grossProfit)}
          </p>
        </div>
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4">
          <p className="text-xs text-stone-500">Transaksi Void</p>
          <p className="text-xl font-bold tabular-nums text-red-600 dark:text-red-400 mt-1">
            {summary.voidCount} ({formatRupiah(summary.voidTotal)})
          </p>
        </div>
      </div>

      {/* Breakdowns Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Per Kategori */}
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-3">
          <h3 className="text-sm font-bold">Penjualan per Kategori</h3>
          <div className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
            {summary.byCategory.map((c) => (
              <div key={c.categoryId} className="py-2.5 flex justify-between">
                <span>
                  {c.name} · <span className="text-stone-400">{c.qty} item</span>
                </span>
                <span className="font-bold tabular-nums">{formatRupiah(c.revenue)}</span>
              </div>
            ))}
            {summary.byCategory.length === 0 && (
              <p className="py-3 text-stone-400">Belum ada penjualan.</p>
            )}
          </div>
        </div>

        {/* Per Metode Bayar */}
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-3">
          <h3 className="text-sm font-bold">Penjualan per Metode Pembayaran</h3>
          <div className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
            {summary.byPaymentMethod.map((m) => (
              <div key={m.method} className="py-2.5 flex justify-between">
                <span>
                  {m.label} · <span className="text-stone-400">{m.count}x</span>
                </span>
                <span className="font-bold tabular-nums">{formatRupiah(m.amount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Per Tipe Pesanan */}
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-3">
          <h3 className="text-sm font-bold">Penjualan per Tipe Pesanan</h3>
          <div className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
            {summary.byOrderType.map((t) => (
              <div key={t.orderType} className="py-2.5 flex justify-between">
                <span>
                  {t.label} · <span className="text-stone-400">{t.count} pesanan</span>
                </span>
                <span className="font-bold tabular-nums">{formatRupiah(t.revenue)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Per Kasir */}
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-3">
          <h3 className="text-sm font-bold">Kinerja per Kasir</h3>
          <div className="divide-y divide-stone-100 dark:divide-stone-800 text-xs">
            {summary.byCashier.map((c) => (
              <div key={c.userId} className="py-2.5 flex justify-between">
                <span>
                  {c.userName} · <span className="text-stone-400">{c.count} transaksi</span>
                </span>
                <span className="font-bold tabular-nums">{formatRupiah(c.revenue)}</span>
              </div>
            ))}
            {summary.byCashier.length === 0 && (
              <p className="py-3 text-stone-400">Belum ada transaksi kasir.</p>
            )}
          </div>
        </div>
      </div>

      {/* Audit Log */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-orange-600" />
          <h3 className="text-sm font-bold">Log Aktivitas Sensitif (Audit Trail)</h3>
        </div>
        <div className="divide-y divide-stone-100 dark:divide-stone-800 max-h-72 overflow-y-auto text-xs">
          {auditLogs.slice(0, 25).map((log) => (
            <div key={log.id} className="p-3.5 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-stone-900 dark:text-stone-100">{log.detail}</p>
                <p className="text-stone-500">
                  {log.userName} · {log.action}
                </p>
              </div>
              <span className="text-stone-400 font-mono">{formatDateTimeWIB(log.createdAt)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
