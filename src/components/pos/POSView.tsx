import React, { useMemo, useState } from 'react';
import {
  Bike,
  ChevronUp,
  Minus,
  PauseCircle,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Trash2,
  UtensilsCrossed,
  Wallet,
  X,
} from 'lucide-react';
import type {
  CartItem,
  Category,
  Discount,
  ModifierGroup,
  Order,
  OrderType,
  OutletProfile,
  Product,
  SelectedModifier,
  Shift,
} from '../../types/pos';
import {
  computeCartItemLineTotal,
  computeOrderTotals,
  formatRupiah,
} from '../../utils/posCalculations';
import { FoodIllustration } from '../common/FoodIllustration';
import { ModifierModal } from './ModifierModal';

interface Props {
  outlet: OutletProfile;
  categories: Category[];
  products: Product[];
  modifierGroups: ModifierGroup[];
  discounts: Discount[];
  activeShift: Shift | null;
  heldOrdersCount: number;
  cart: CartItem[];
  orderType: OrderType;
  tableOrCustomerName: string;
  selectedDiscountId: string;
  orderNote: string;
  onSetOrderType: (t: OrderType) => void;
  onSetTableOrCustomerName: (v: string) => void;
  onSetSelectedDiscountId: (id: string) => void;
  onSetOrderNote: (v: string) => void;
  onAddCartItem: (product: Product, qty: number, note: string, modifiers: SelectedModifier[]) => void;
  onUpdateCartItemQty: (itemId: string, delta: number) => void;
  onUpdateCartItemNote: (itemId: string, note: string) => void;
  onRemoveCartItem: (itemId: string) => void;
  onClearCart: () => void;
  onHoldOrder: () => void;
  onOpenPayment: (total: number) => void;
  onGoToShift: () => void;
  onGoToHoldOrders: () => void;
}

export const POSView: React.FC<Props> = ({
  outlet,
  categories,
  products,
  modifierGroups,
  discounts,
  activeShift,
  heldOrdersCount,
  cart,
  orderType,
  tableOrCustomerName,
  selectedDiscountId,
  orderNote,
  onSetOrderType,
  onSetTableOrCustomerName,
  onSetSelectedDiscountId,
  onSetOrderNote,
  onAddCartItem,
  onUpdateCartItemQty,
  onUpdateCartItemNote,
  onRemoveCartItem,
  onClearCart,
  onHoldOrder,
  onOpenPayment,
  onGoToShift,
  onGoToHoldOrders,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [modifierProduct, setModifierProduct] = useState<Product | null>(null);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  const activeCategories = useMemo(
    () => categories.filter((c) => c.isActive).sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (!p.isActive) return false;
      if (selectedCategoryId !== 'all' && p.categoryId !== selectedCategoryId) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
    });
  }, [products, selectedCategoryId, searchQuery]);

  const activeDiscounts = useMemo(() => discounts.filter((d) => d.isActive), [discounts]);
  const selectedDiscount = useMemo(
    () => activeDiscounts.find((d) => d.id === selectedDiscountId) || null,
    [activeDiscounts, selectedDiscountId]
  );

  const totals = useMemo(
    () =>
      computeOrderTotals({
        items: cart,
        discount: selectedDiscount,
        taxPercent: outlet.taxPercent,
        serviceChargePercent: outlet.serviceChargePercent,
      }),
    [cart, selectedDiscount, outlet.taxPercent, outlet.serviceChargePercent]
  );

  const totalItemCount = useMemo(() => cart.reduce((s, i) => s + i.qty, 0), [cart]);

  const handleProductClick = (product: Product) => {
    if (!product.isAvailable) return;
    if (product.modifierGroupIds.length > 0) {
      setModifierProduct(product);
    } else {
      onAddCartItem(product, 1, '', []);
    }
  };

  const renderCartBody = () => (
    <div className="flex flex-col h-full bg-white dark:bg-stone-900">
      {/* Cart Header */}
      <div className="p-4 border-b border-stone-200 dark:border-stone-800 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">Pesanan Baru</h2>
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 tabular-nums">
              · {totalItemCount} item
            </span>
          </div>
          <div className="flex items-center gap-2">
            {heldOrdersCount > 0 && (
              <button
                type="button"
                onClick={onGoToHoldOrders}
                className="min-h-[36px] px-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1 whitespace-nowrap"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                Hold ({heldOrdersCount})
              </button>
            )}
            {cart.length > 0 && (
              <button
                type="button"
                onClick={onClearCart}
                aria-label="Kosongkan keranjang"
                className="min-h-[36px] px-2.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                Kosongkan
              </button>
            )}
          </div>
        </div>

        {/* Order Type Selector */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-stone-100 dark:bg-stone-800">
          {(
            [
              { id: 'dine_in', label: 'Dine-In', icon: UtensilsCrossed },
              { id: 'takeaway', label: 'Bawa Pulang', icon: ShoppingBag },
              { id: 'delivery', label: 'Delivery', icon: Bike },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = orderType === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSetOrderType(t.id)}
                className={`min-h-[40px] rounded-lg px-2 py-1.5 text-xs font-semibold flex items-center justify-center gap-1 transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-white dark:bg-stone-900 text-orange-600 dark:text-orange-400 shadow-sm'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Table / Customer Name */}
        <input
          type="text"
          aria-label="Nomor meja atau nama pelanggan"
          value={tableOrCustomerName}
          onChange={(e) => onSetTableOrCustomerName(e.target.value)}
          placeholder={orderType === 'dine_in' ? 'No. Meja / Nama Pelanggan (opsional)' : 'Nama Pelanggan / Kurir (opsional)'}
          className="w-full min-h-[42px] rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3 text-xs text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!activeShift && (
          <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3.5 space-y-2">
            <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
              Shift kasir belum dibuka
            </p>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              Buka shift terlebih dahulu untuk mencatat transaksi pembayaran.
            </p>
            <button
              type="button"
              onClick={onGoToShift}
              className="w-full min-h-[40px] rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Wallet className="w-4 h-4" />
              Buka Shift Sekarang
            </button>
          </div>
        )}

        {cart.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <ShoppingCart className="w-9 h-9 mx-auto text-stone-300 dark:text-stone-700" />
            <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
              Keranjang masih kosong
            </p>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Ketuk menu di sebelah kiri untuk menambahkan pesanan.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {cart.map((item) => (
              <div key={item.id} className="py-3 first:pt-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
                      {item.productNameSnapshot}
                    </p>
                    {item.modifiers.length > 0 && (
                      <p className="text-xs text-stone-500 dark:text-stone-400">
                        {item.modifiers.map((m) => m.nameSnapshot).join(' · ')}
                      </p>
                    )}
                    {item.note && editingNoteId !== item.id && (
                      <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                        Catatan: {item.note}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-bold text-stone-900 dark:text-stone-100 tabular-nums shrink-0">
                    {formatRupiah(item.lineTotal)}
                  </p>
                </div>

                {editingNoteId === item.id && (
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={item.note}
                      onChange={(e) => onUpdateCartItemNote(item.id, e.target.value)}
                      placeholder="Catatan item..."
                      className="flex-1 min-h-[36px] rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-2.5 text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setEditingNoteId(null)}
                      className="px-2.5 rounded-lg bg-stone-200 dark:bg-stone-700 text-xs font-semibold"
                    >
                      OK
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label={`Kurangi ${item.productNameSnapshot}`}
                      onClick={() => onUpdateCartItemQty(item.id, -1)}
                      className="min-h-[38px] min-w-[38px] rounded-lg border border-stone-200 dark:border-stone-700 flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 text-center text-xs font-bold tabular-nums">{item.qty}</span>
                    <button
                      type="button"
                      aria-label={`Tambah ${item.productNameSnapshot}`}
                      onClick={() => onUpdateCartItemQty(item.id, 1)}
                      className="min-h-[38px] min-w-[38px] rounded-lg border border-stone-200 dark:border-stone-700 flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingNoteId(editingNoteId === item.id ? null : item.id)}
                      className="min-h-[36px] px-2 rounded-lg text-xs text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
                    >
                      Catatan
                    </button>
                    <button
                      type="button"
                      aria-label={`Hapus ${item.productNameSnapshot}`}
                      onClick={() => onRemoveCartItem(item.id)}
                      className="min-h-[36px] min-w-[36px] rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Footer & Totals */}
      <div className="p-4 border-t border-stone-200 dark:border-stone-800 space-y-3 bg-stone-50/70 dark:bg-stone-950/40">
        {cart.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div className="relative">
                <Tag className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  aria-label="Pilih diskon"
                  value={selectedDiscountId}
                  onChange={(e) => onSetSelectedDiscountId(e.target.value)}
                  className="w-full min-h-[40px] rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 pl-8 pr-2 text-xs text-stone-800 dark:text-stone-200"
                >
                  <option value="">Tanpa Diskon</option>
                  {activeDiscounts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                aria-label="Catatan pesanan"
                value={orderNote}
                onChange={(e) => onSetOrderNote(e.target.value)}
                placeholder="Catatan order..."
                className="w-full min-h-[40px] rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 px-2.5 text-xs"
              />
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-stone-600 dark:text-stone-400">
                <span>Subtotal</span>
                <span className="tabular-nums font-medium">{formatRupiah(totals.subtotal)}</span>
              </div>
              {totals.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                  <span>Diskon ({totals.discountName})</span>
                  <span className="tabular-nums font-medium">-{formatRupiah(totals.discountAmount)}</span>
                </div>
              )}
              {totals.serviceAmount > 0 && (
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>Layanan ({outlet.serviceChargePercent}%)</span>
                  <span className="tabular-nums font-medium">{formatRupiah(totals.serviceAmount)}</span>
                </div>
              )}
              {totals.taxAmount > 0 && (
                <div className="flex justify-between text-stone-600 dark:text-stone-400">
                  <span>Pajak ({outlet.taxPercent}%)</span>
                  <span className="tabular-nums font-medium">{formatRupiah(totals.taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t border-stone-200 dark:border-stone-800">
                <span className="text-sm font-bold text-stone-900 dark:text-stone-100">Total Bayar</span>
                <span className="text-xl font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                  {formatRupiah(totals.total)}
                </span>
              </div>
            </div>
          </>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            disabled={cart.length === 0 || !activeShift}
            onClick={() => {
              onHoldOrder();
              setMobileCartOpen(false);
            }}
            className="min-h-[50px] px-3.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 hover:bg-stone-50 dark:hover:bg-stone-700 disabled:bg-stone-100 disabled:text-stone-400 disabled:border-stone-200 dark:disabled:bg-stone-800/70 dark:disabled:text-stone-500 dark:disabled:border-stone-800 disabled:cursor-not-allowed text-xs font-semibold text-stone-700 dark:text-stone-200 flex items-center justify-center gap-1.5 whitespace-nowrap"
          >
            <PauseCircle className="w-4 h-4" />
            Simpan
          </button>
          <button
            type="button"
            disabled={cart.length === 0 || !activeShift}
            onClick={() => {
              setMobileCartOpen(false);
              onOpenPayment(totals.total);
            }}
            className="flex-1 min-h-[50px] rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-200 disabled:text-stone-500 dark:disabled:bg-stone-800 dark:disabled:text-stone-500 disabled:cursor-not-allowed text-white font-bold text-sm px-4 transition-colors tabular-nums"
          >
            Bayar {cart.length > 0 ? `· ${formatRupiah(totals.total)}` : ''}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      {/* Center Menu Grid */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Search & Category Bar */}
        <div className="p-4 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              aria-label="Cari menu atau SKU"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama menu atau SKU (contoh: Nasi Goreng, Kopi)..."
              className="w-full min-h-[48px] rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 pl-10 pr-4 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pr-4">
            <button
              type="button"
              onClick={() => setSelectedCategoryId('all')}
              className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                selectedCategoryId === 'all'
                  ? 'bg-orange-600 text-white'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
              }`}
            >
              Semua Menu
            </button>
            {activeCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`min-h-[40px] px-3.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  selectedCategoryId === cat.id
                    ? 'bg-orange-600 text-white'
                    : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="lg:hidden flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1.5 text-xs text-stone-600 dark:text-stone-400">
              <span className="font-semibold text-stone-800 dark:text-stone-200">
                {orderType === 'dine_in' ? 'Dine-In' : orderType === 'takeaway' ? 'Bawa Pulang' : 'Delivery'}
              </span>
              {tableOrCustomerName && <span>· {tableOrCustomerName}</span>}
              {heldOrdersCount > 0 && (
                <button
                  type="button"
                  onClick={onGoToHoldOrders}
                  className="ml-1 px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold"
                >
                  Hold ({heldOrdersCount})
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setMobileCartOpen(true)}
              className="min-h-[36px] px-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-xs font-semibold text-stone-800 dark:text-stone-200 flex items-center gap-1.5"
            >
              <ShoppingCart className="w-3.5 h-3.5 text-orange-600" />
              Keranjang ({totalItemCount})
            </button>
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className={`flex-1 overflow-y-auto p-4 lg:pb-6 ${totalItemCount > 0 ? 'pb-36' : 'pb-20'}`}>
          {filteredProducts.length === 0 ? (
            <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-10 text-center space-y-2">
              <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                Menu tidak ditemukan
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Ubah kata kunci pencarian atau pilih kategori lain.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3 auto-rows-fr items-stretch">
              {filteredProducts.map((product) => {
                const inCartQty = cart
                  .filter((i) => i.productId === product.id)
                  .reduce((s, i) => s + i.qty, 0);
                return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={!product.isAvailable}
                    onClick={() => handleProductClick(product)}
                    className={`group text-left rounded-xl border p-3.5 flex flex-col justify-between gap-3 transition-colors min-h-[144px] h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                      product.isAvailable
                        ? 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-orange-500 active:scale-[0.98]'
                        : 'border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-900/50 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 w-full">
                      <FoodIllustration type={product.iconType} className="w-11 h-11" />
                      {inCartQty > 0 && (
                        <span className="min-w-[26px] h-[26px] px-1.5 rounded-lg bg-orange-600 text-white text-xs font-bold flex items-center justify-center tabular-nums">
                          {inCartQty}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1 w-full">
                      <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 line-clamp-2 leading-snug">
                        {product.name}
                      </p>
                      <div className="flex items-center justify-between gap-1 text-xs">
                        <span className="font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                          {formatRupiah(product.price)}
                        </span>
                        {!product.isAvailable ? (
                          <span className="font-semibold text-red-600 dark:text-red-400">Habis</span>
                        ) : product.modifierGroupIds.length > 0 ? (
                          <span className="text-stone-400">+Opsi</span>
                        ) : null}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Desktop Right Cart Panel */}
      <aside
        aria-label="Keranjang Pesanan"
        className="hidden lg:flex lg:w-[360px] xl:w-[390px] shrink-0 border-l border-stone-200 dark:border-stone-800 flex-col overflow-hidden"
      >
        {renderCartBody()}
      </aside>

      {/* Mobile Bottom Cart Summary Bar (only shown when cart has items) */}
      {totalItemCount > 0 && (
        <div className="lg:hidden fixed bottom-16 left-0 right-0 z-30 px-3 pb-2 pointer-events-none">
          <button
            type="button"
            onClick={() => setMobileCartOpen(true)}
            className="pointer-events-auto w-full min-h-[52px] rounded-xl bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 shadow-lg flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 text-left">
              <ShoppingCart className="w-5 h-5 shrink-0" />
              <div>
                <span className="block text-xs font-medium text-orange-100">
                  {totalItemCount} item di keranjang
                </span>
                <span className="block text-sm font-bold tabular-nums">
                  {formatRupiah(totals.total)}
                </span>
              </div>
            </div>
            <span className="flex items-center gap-1 text-xs font-bold">
              Lihat Keranjang
              <ChevronUp className="w-4 h-4" />
            </span>
          </button>
        </div>
      )}

      {/* Mobile Pull-Up Cart Sheet */}
      {mobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 flex flex-col justify-end">
          <div className="bg-white dark:bg-stone-900 rounded-t-2xl max-h-[88vh] flex flex-col overflow-hidden">
            <div className="p-2 flex items-center justify-between border-b border-stone-200 dark:border-stone-800 px-4">
              <span className="text-xs font-semibold text-stone-500">Ringkasan Pesanan</span>
              <button
                type="button"
                aria-label="Tutup keranjang"
                onClick={() => setMobileCartOpen(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{renderCartBody()}</div>
          </div>
        </div>
      )}

      {/* Modifier Modal */}
      {modifierProduct && (
        <ModifierModal
          product={modifierProduct}
          modifierGroups={modifierGroups}
          onClose={() => setModifierProduct(null)}
          onConfirm={(qty, note, modifiers) => {
            onAddCartItem(modifierProduct, qty, note, modifiers);
            setModifierProduct(null);
          }}
        />
      )}
    </div>
  );
};

// Re-export helper for creating CartItem
export function createCartItem(
  product: Product,
  qty: number,
  note: string,
  modifiers: SelectedModifier[]
): CartItem {
  return {
    id: `ci_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    productId: product.id,
    productNameSnapshot: product.name,
    unitPriceSnapshot: product.price,
    costPriceSnapshot: product.costPrice || 0,
    categoryIdSnapshot: product.categoryId,
    qty,
    note,
    modifiers,
    lineTotal: computeCartItemLineTotal(product.price, qty, modifiers),
  };
}
