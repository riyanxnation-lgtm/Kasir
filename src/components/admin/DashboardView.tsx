import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, Flame, RefreshCw, TrendingUp } from 'lucide-react';
import type { Category, Order, Product } from '../../types/pos';
import {
  computeAnalyticsSummary,
  formatRupiah,
  getJakartaDateKey,
} from '../../utils/posCalculations';

interface Props {
  orders: Order[];
  products: Product[];
  categories: Category[];
  onGoToReports: () => void;
}

const DAYS_LABEL = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const HOURS_LABEL = Array.from({ length: 15 }, (_, i) => String(i + 8).padStart(2, '0'));

export const DashboardView: React.FC<Props> = ({
  orders,
  products,
  categories,
  onGoToReports,
}) => {
  const [insightText, setInsightText] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const todayKey = useMemo(() => getJakartaDateKey(new Date()), []);
  const yesterdayKey = useMemo(
    () => getJakartaDateKey(new Date(Date.now() - 86400000)),
    []
  );
  const sevenDaysAgoKey = useMemo(
    () => getJakartaDateKey(new Date(Date.now() - 6 * 86400000)),
    []
  );

  const todayStats = useMemo(
    () => computeAnalyticsSummary(orders, products, categories, todayKey, todayKey),
    [orders, products, categories, todayKey]
  );

  const yesterdayStats = useMemo(
    () => computeAnalyticsSummary(orders, products, categories, yesterdayKey, yesterdayKey),
    [orders, products, categories, yesterdayKey]
  );

  const weekStats = useMemo(
    () => computeAnalyticsSummary(orders, products, categories, sevenDaysAgoKey, todayKey),
    [orders, products, categories, sevenDaysAgoKey, todayKey]
  );

  const revenueDeltaPct = useMemo(() => {
    if (yesterdayStats.totalRevenue === 0) return null;
    return Math.round(
      ((todayStats.totalRevenue - yesterdayStats.totalRevenue) / yesterdayStats.totalRevenue) * 100
    );
  }, [todayStats.totalRevenue, yesterdayStats.totalRevenue]);

  const maxHeat = useMemo(() => {
    let max = 1;
    for (const row of weekStats.heatmap) {
      for (const cell of row) {
        if (cell > max) max = cell;
      }
    }
    return max;
  }, [weekStats.heatmap]);

  const handleGenerateInsight = async () => {
    setInsightLoading(true);
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodLabel: '7 Hari Terakhir',
          totalRevenue: weekStats.totalRevenue,
          previousRevenue: yesterdayStats.totalRevenue * 7,
          orderCount: weekStats.orderCount,
          avgOrderValue: weekStats.avgOrderValue,
          topProducts: weekStats.topProducts.slice(0, 3).map((p) => ({
            name: p.name,
            qty: p.qty,
            revenue: p.revenue,
          })),
          peakHourLabel: weekStats.peakHourLabel,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { insight?: string };
        setInsightText(data.insight || 'Belum cukup data untuk ringkasan.');
      } else {
        setInsightText(
          `Selama 7 hari terakhir tercatat ${weekStats.orderCount} transaksi dengan omzet ${formatRupiah(weekStats.totalRevenue)}.`
        );
      }
    } catch {
      setInsightText(
        `Selama 7 hari terakhir tercatat ${weekStats.orderCount} transaksi dengan omzet ${formatRupiah(weekStats.totalRevenue)}.`
      );
    } finally {
      setInsightLoading(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
            Dashboard Pemilik
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Ringkasan penjualan hari ini dan tren operasional 7 hari terakhir.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleGenerateInsight}
            disabled={insightLoading}
            className="min-h-[44px] px-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:bg-stone-50 dark:hover:bg-stone-800 text-xs font-semibold flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${insightLoading ? 'animate-spin' : ''}`} />
            {insightLoading ? 'Menganalisis...' : 'Ringkasan Bisnis'}
          </button>
          <button
            type="button"
            onClick={onGoToReports}
            className="min-h-[44px] px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold"
          >
            Laporan & Ekspor
          </button>
        </div>
      </div>

      {insightText && (
        <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50/70 dark:bg-orange-950/30 p-4 text-sm text-stone-800 dark:text-stone-200">
          {insightText}
        </div>
      )}

      {/* KPI Row (4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 space-y-2">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">Omzet Hari Ini</p>
          <p className="text-2xl font-bold tabular-nums text-stone-900 dark:text-stone-100">
            {formatRupiah(todayStats.totalRevenue)}
          </p>
          <div className="text-xs flex items-center gap-1">
            {revenueDeltaPct !== null ? (
              <span
                className={`inline-flex items-center gap-0.5 font-semibold ${
                  revenueDeltaPct >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {revenueDeltaPct >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                )}
                {Math.abs(revenueDeltaPct)}% dibanding kemarin
              </span>
            ) : (
              <span className="text-stone-400">Kemarin: {formatRupiah(yesterdayStats.totalRevenue)}</span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 space-y-2">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">Transaksi Hari Ini</p>
          <p className="text-2xl font-bold tabular-nums text-stone-900 dark:text-stone-100">
            {todayStats.orderCount}
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Kemarin {yesterdayStats.orderCount} · 7 hari {weekStats.orderCount} transaksi
          </p>
        </div>

        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 space-y-2">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Rata-Rata Nilai Pesanan
          </p>
          <p className="text-2xl font-bold tabular-nums text-stone-900 dark:text-stone-100">
            {formatRupiah(todayStats.avgOrderValue || weekStats.avgOrderValue)}
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Jam ramai: {weekStats.peakHourLabel}
          </p>
        </div>

        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 space-y-2">
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400">
            Laba Kotor (7 Hari)
          </p>
          <p className="text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatRupiah(weekStats.grossProfit)}
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Dari total omzet {formatRupiah(weekStats.totalRevenue)}
          </p>
        </div>
      </div>

      {/* Revenue Trend + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-600" />
              <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Tren Omzet 7 Hari Terakhir
              </h3>
            </div>
            <span className="text-xs text-stone-500 tabular-nums">
              Total {formatRupiah(weekStats.totalRevenue)}
            </span>
          </div>

          <div className="h-64 w-full">
            {weekStats.dailyTrend.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-stone-400">
                Belum ada data transaksi pada periode ini.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={weekStats.dailyTrend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EA580C" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#EA580C" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E7E5E4" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716C' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(v: number) => `${Math.round(v / 1000)}rb`}
                    tick={{ fontSize: 11, fill: '#78716C' }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip
                    formatter={(val) => [formatRupiah(Number(val ?? 0)), 'Omzet']}
                    contentStyle={{
                      borderRadius: '12px',
                      border: '1px solid #E7E5E4',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#EA580C"
                    strokeWidth={2.5}
                    fill="url(#revGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top & Bottom Selling Menus */}
        <div className="lg:col-span-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-600" />
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Menu Terlaris (7 Hari)
            </h3>
          </div>

          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {weekStats.topProducts.slice(0, 5).map((item, idx) => (
              <div key={item.productId} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-stone-900 dark:text-stone-100 truncate">
                    {idx + 1}. {item.name}
                  </p>
                  <p className="text-stone-500 dark:text-stone-400">
                    {item.categoryName} · {item.qty} porsi
                  </p>
                </div>
                <span className="font-bold tabular-nums text-stone-900 dark:text-stone-100 shrink-0">
                  {formatRupiah(item.revenue)}
                </span>
              </div>
            ))}
            {weekStats.topProducts.length === 0 && (
              <p className="text-xs text-stone-400 py-4">Belum ada penjualan tercatat.</p>
            )}
          </div>

          {weekStats.leastProducts.length > 0 && (
            <div className="pt-3 border-t border-stone-200 dark:border-stone-800 space-y-1.5">
              <p className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                Paling Sedikit Terjual
              </p>
              <div className="space-y-1 text-xs text-stone-600 dark:text-stone-300">
                {weekStats.leastProducts.slice(0, 3).map((item) => (
                  <div key={item.productId} className="flex justify-between">
                    <span className="truncate pr-2">{item.name}</span>
                    <span className="tabular-nums text-stone-500">{item.qty} porsi</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Busy Hours Heatmap */}
      <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
              Heatmap Jam Ramai (Hari × Jam WIB)
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Distribusi kepadatan pesanan dari pukul 08:00 hingga 22:00 WIB.
            </p>
          </div>
          <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
            Puncak: {weekStats.peakHourLabel}
          </span>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[640px] space-y-1.5">
            <div className="grid grid-cols-16 gap-1 text-[11px] text-stone-400 font-mono">
              <div />
              {HOURS_LABEL.map((hr) => (
                <div key={hr} className="text-center">
                  {hr}
                </div>
              ))}
            </div>
            {DAYS_LABEL.map((day, dIdx) => (
              <div key={day} className="grid grid-cols-16 gap-1 items-center">
                <span className="text-xs font-medium text-stone-600 dark:text-stone-400">{day}</span>
                {weekStats.heatmap[dIdx].map((count, hIdx) => {
                  const intensity = count === 0 ? 0 : Math.max(0.2, count / maxHeat);
                  return (
                    <div
                      key={`${dIdx}-${hIdx}`}
                      title={`${day} ${HOURS_LABEL[hIdx]}:00 — ${count} transaksi`}
                      className="h-7 rounded-md border border-stone-100 dark:border-stone-800 flex items-center justify-center text-[10px] font-mono tabular-nums"
                      style={{
                        backgroundColor:
                          count === 0
                            ? undefined
                            : `rgba(234, 88, 12, ${intensity.toFixed(2)})`,
                        color: intensity > 0.55 ? '#ffffff' : undefined,
                      }}
                    >
                      {count > 0 ? count : ''}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
