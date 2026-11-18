import React, { useState } from 'react';
import { Bluetooth, Check, Copy, FileDown, Printer, Share2, X } from 'lucide-react';
import {
  buildWhatsAppReceiptText,
  downloadReceiptPDF,
  printThermalEscPos,
} from '../../services/exportService';
import type { Order, OutletProfile } from '../../types/pos';
import { formatDateTimeWIB, formatRupiah } from '../../utils/posCalculations';

interface Props {
  order: Order;
  outlet: OutletProfile;
  onClose: () => void;
}

const ORDER_TYPE_LABEL: Record<Order['orderType'], string> = {
  dine_in: 'Makan di Tempat',
  takeaway: 'Bawa Pulang',
  delivery: 'Delivery',
};

const PAYMENT_LABEL: Record<string, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  transfer: 'Transfer Bank',
  ewallet: 'E-Wallet',
};

export const ReceiptModal: React.FC<Props> = ({ order, outlet, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [printerNotice, setPrinterNotice] = useState<string | null>(null);
  const [printingBle, setPrintingBle] = useState(false);

  const waText = buildWhatsAppReceiptText(order, outlet);
  const waHref = `https://wa.me/?text=${encodeURIComponent(waText)}`;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(waText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setPrinterNotice('Gagal menyalin teks struk.');
    }
  };

  const handleThermalPrint = async () => {
    setPrintingBle(true);
    setPrinterNotice(null);
    const res = await printThermalEscPos(order, outlet);
    setPrinterNotice(res.message);
    setPrintingBle(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="receipt-modal-title"
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 max-h-[92vh] flex flex-col overflow-hidden"
      >
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
          <div>
            <h3 id="receipt-modal-title" className="text-base font-bold text-stone-900 dark:text-stone-100">
              Struk Transaksi
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 font-mono">
              {order.orderNumber} · Antrean #{order.queueNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup struk"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 bg-stone-100 dark:bg-stone-950/60">
          {/* Printable Receipt Paper */}
          <div
            id="thermal-receipt-printable"
            className="mx-auto max-w-xs rounded-xl bg-white text-stone-900 p-5 border border-stone-200 font-mono text-xs space-y-3"
          >
            <div className="text-center space-y-1">
              <p className="text-sm font-bold">{outlet.name}</p>
              <p className="text-[11px] text-stone-600">{outlet.address}</p>
              <p className="text-[11px] text-stone-600">Telp: {outlet.phone}</p>
              {outlet.npwp && <p className="text-[10px] text-stone-500">NPWP: {outlet.npwp}</p>}
              {outlet.receiptHeader && (
                <p className="text-[11px] text-stone-700 pt-1">{outlet.receiptHeader}</p>
              )}
            </div>

            <div className="border-t border-dashed border-stone-300 pt-2 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>No Struk</span>
                <span className="font-semibold">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Antrean</span>
                <span className="font-semibold">#{order.queueNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>Waktu</span>
                <span>{formatDateTimeWIB(order.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Kasir</span>
                <span>{order.userName}</span>
              </div>
              <div className="flex justify-between">
                <span>Layanan</span>
                <span>
                  {ORDER_TYPE_LABEL[order.orderType]}
                  {order.tableOrCustomerName ? ` (${order.tableOrCustomerName})` : ''}
                </span>
              </div>
            </div>

            <div className="border-t border-dashed border-stone-300 pt-2 space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="space-y-0.5">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold">
                      {item.qty}x {item.productNameSnapshot}
                    </span>
                    <span className="tabular-nums shrink-0">{formatRupiah(item.lineTotal)}</span>
                  </div>
                  {item.modifiers.length > 0 && (
                    <p className="text-[10px] text-stone-600 pl-3">
                      + {item.modifiers.map((m) => m.nameSnapshot).join(', ')}
                    </p>
                  )}
                  {item.note && (
                    <p className="text-[10px] text-stone-500 pl-3 italic">Catatan: {item.note}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-stone-300 pt-2 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatRupiah(order.subtotal)}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Diskon ({order.discountName || 'Promo'})</span>
                  <span className="tabular-nums">-{formatRupiah(order.discountAmount)}</span>
                </div>
              )}
              {order.serviceAmount > 0 && (
                <div className="flex justify-between">
                  <span>Layanan ({outlet.serviceChargePercent}%)</span>
                  <span className="tabular-nums">{formatRupiah(order.serviceAmount)}</span>
                </div>
              )}
              {order.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span>Pajak ({outlet.taxPercent}%)</span>
                  <span className="tabular-nums">{formatRupiah(order.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-stone-200">
                <span>TOTAL</span>
                <span className="tabular-nums">{formatRupiah(order.total)}</span>
              </div>
              {order.payments.map((p) => (
                <div key={p.id} className="flex justify-between">
                  <span>Bayar ({PAYMENT_LABEL[p.method] || p.method})</span>
                  <span className="tabular-nums">{formatRupiah(p.amount)}</span>
                </div>
              ))}
              {order.changeAmount > 0 && (
                <div className="flex justify-between font-semibold">
                  <span>Kembalian</span>
                  <span className="tabular-nums">{formatRupiah(order.changeAmount)}</span>
                </div>
              )}
            </div>

            {order.status === 'void' && (
              <div className="rounded bg-red-100 text-red-800 p-2 text-center font-bold">
                TRANSAKSI VOID — {order.voidReason}
              </div>
            )}

            <p className="border-t border-dashed border-stone-300 pt-2 text-center text-[10px] text-stone-600">
              {outlet.receiptFooter}
            </p>
          </div>

          {printerNotice && (
            <p className="mt-3 text-center text-xs text-stone-600 dark:text-stone-300 bg-white dark:bg-stone-900 rounded-xl p-2.5 border border-stone-200 dark:border-stone-800">
              {printerNotice}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-stone-200 dark:border-stone-800 space-y-2.5 bg-white dark:bg-stone-900">
          <div className="grid grid-cols-2 gap-2">
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-emerald-100"
            >
              <Share2 className="w-4 h-4" />
              Kirim WhatsApp
            </a>
            <button
              type="button"
              onClick={() => downloadReceiptPDF(order, outlet)}
              className="min-h-[44px] rounded-xl border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-stone-50 dark:hover:bg-stone-800"
            >
              <FileDown className="w-4 h-4" />
              Simpan PDF
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-[44px] rounded-xl border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-stone-50 dark:hover:bg-stone-800"
            >
              <Printer className="w-4 h-4" />
              Cetak Browser
            </button>
            <button
              type="button"
              onClick={handleThermalPrint}
              disabled={printingBle}
              className="min-h-[44px] rounded-xl border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-50"
            >
              <Bluetooth className="w-4 h-4" />
              {printingBle ? 'Menghubungkan...' : 'Printer Thermal'}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopyText}
              className="min-h-[48px] px-4 rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-stone-50 dark:hover:bg-stone-800"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Tersalin' : 'Salin Teks'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[48px] rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold"
            >
              Selesai
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
