import React, { useMemo, useState } from 'react';
import { ArrowRight, ChefHat, Clock, PauseCircle, PlayCircle, Trash2 } from 'lucide-react';
import type { Order, OrderStatus } from '../../types/pos';
import { formatDateTimeWIB, formatRupiah } from '../../utils/posCalculations';

interface Props {
  orders: Order[];
  onResumeHoldOrder: (order: Order) => void;
  onUpdateOrderStatus: (orderId: string, nextStatus: OrderStatus) => void;
}

const STATUS_LABEL: Record<OrderStatus, string> = {
  hold: 'Disimpan (Hold)',
  new: 'Pesanan Baru',
  preparing: 'Sedang Dimasak',
  ready: 'Siap Disajikan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
  void: 'Void',
};

const NEXT_STATUS: Partial<Record<OrderStatus, { next: OrderStatus; label: string }>> = {
  new: { next: 'preparing', label: 'Mulai Masak' },
  preparing: { next: 'ready', label: 'Tandai Siap' },
  ready: { next: 'completed', label: 'Selesaikan' },
};

export const KitchenOrdersView: React.FC<Props> = ({
  orders,
  onResumeHoldOrder,
  onUpdateOrderStatus,
}) => {
  const [tab, setTab] = useState<'kitchen' | 'hold'>('kitchen');

  const activeKitchenOrders = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'new' || o.status === 'preparing' || o.status === 'ready')
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [orders]
  );

  const holdOrders = useMemo(
    () =>
      orders
        .filter((o) => o.status === 'hold')
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [orders]
  );

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
            Pesanan Aktif & Dapur
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Pantau status penyajian dapur secara langsung atau lanjutkan pesanan yang di-hold.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
          <button
            type="button"
            onClick={() => setTab('kitchen')}
            className={`min-h-[42px] px-4 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              tab === 'kitchen'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            Layar Dapur ({activeKitchenOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('hold')}
            className={`min-h-[42px] px-4 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors ${
              tab === 'hold'
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            <PauseCircle className="w-4 h-4" />
            Pesanan Hold ({holdOrders.length})
          </button>
        </div>
      </div>

      {tab === 'kitchen' ? (
        activeKitchenOrders.length === 0 ? (
          <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-10 text-center space-y-2">
            <ChefHat className="w-9 h-9 mx-auto text-stone-300 dark:text-stone-700" />
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
              Tidak ada antrean dapur saat ini
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Pesanan baru yang dibuat dari layar kasir akan muncul otomatis di sini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeKitchenOrders.map((order) => {
              const action = NEXT_STATUS[order.status];
              return (
                <div
                  key={order.id}
                  className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 flex flex-col justify-between gap-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2 pb-3 border-b border-stone-100 dark:border-stone-800">
                      <div>
                        <p className="text-base font-bold text-stone-900 dark:text-stone-100">
                          Antrean #{order.queueNumber}
                        </p>
                        <p className="text-xs text-stone-500 dark:text-stone-400">
                          {order.tableOrCustomerName || 'Tanpa Nama'} · {order.orderType === 'dine_in' ? 'Dine-In' : order.orderType === 'takeaway' ? 'Bawa Pulang' : 'Delivery'}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-semibold ${
                          order.status === 'ready'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : order.status === 'preparing'
                              ? 'text-orange-600 dark:text-orange-400'
                              : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {STATUS_LABEL[order.status]}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {order.items.map((it) => (
                        <div key={it.id} className="text-xs space-y-0.5">
                          <p className="font-semibold text-stone-900 dark:text-stone-100">
                            {it.qty}x {it.productNameSnapshot}
                          </p>
                          {it.modifiers.length > 0 && (
                            <p className="text-stone-500 dark:text-stone-400 pl-3">
                              {it.modifiers.map((m) => m.nameSnapshot).join(', ')}
                            </p>
                          )}
                          {it.note && (
                            <p className="text-orange-600 dark:text-orange-400 pl-3">
                              Catatan: {it.note}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between gap-2">
                    <span className="text-xs text-stone-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDateTimeWIB(order.createdAt).split(',')[1] || formatDateTimeWIB(order.createdAt)}
                    </span>
                    {action && (
                      <button
                        type="button"
                        onClick={() => onUpdateOrderStatus(order.id, action.next)}
                        className="min-h-[42px] px-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold flex items-center gap-1.5"
                      >
                        {action.label}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : holdOrders.length === 0 ? (
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-10 text-center space-y-2">
          <PauseCircle className="w-9 h-9 mx-auto text-stone-300 dark:text-stone-700" />
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            Tidak ada pesanan yang disimpan (hold)
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Gunakan tombol Simpan di keranjang kasir untuk menunda pesanan sementara.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {holdOrders.map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      {order.tableOrCustomerName || `Pesanan #${order.queueNumber}`}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {formatDateTimeWIB(order.createdAt)} · {order.items.length} jenis menu
                    </p>
                  </div>
                  <p className="text-sm font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                    {formatRupiah(order.total)}
                  </p>
                </div>

                <div className="text-xs text-stone-600 dark:text-stone-300 space-y-1 pt-2 border-t border-stone-100 dark:border-stone-800">
                  {order.items.map((it) => (
                    <p key={it.id}>
                      {it.qty}x {it.productNameSnapshot}
                    </p>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label={`Batalkan pesanan hold ${order.orderNumber}`}
                  onClick={() => onUpdateOrderStatus(order.id, 'cancelled')}
                  className="min-h-[44px] px-3 rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onResumeHoldOrder(order)}
                  className="flex-1 min-h-[44px] rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <PlayCircle className="w-4 h-4" />
                  Lanjutkan ke Kasir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
