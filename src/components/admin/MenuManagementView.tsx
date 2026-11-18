import React, { useRef, useState } from 'react';
import { Download, Edit3, Plus, Trash2, Upload, X } from 'lucide-react';
import {
  downloadMenuImportTemplate,
  parseMenuImportFile,
} from '../../services/exportService';
import type {
  Category,
  Discount,
  ModifierGroup,
  ModifierOption,
  Product,
  ProductIconType,
} from '../../types/pos';
import { formatRupiah } from '../../utils/posCalculations';
import { FoodIllustration } from '../common/FoodIllustration';

interface Props {
  categories: Category[];
  products: Product[];
  modifierGroups: ModifierGroup[];
  discounts: Discount[];
  onSaveCategory: (cat: Category) => void;
  onDeleteCategory: (id: string) => void;
  onSaveProduct: (prod: Product) => void;
  onDeleteProduct: (id: string) => void;
  onSaveModifierGroup: (group: ModifierGroup) => void;
  onDeleteModifierGroup: (id: string) => void;
  onSaveDiscount: (disc: Discount) => void;
  onImportMenu: (newCategories: Category[], newProducts: Product[]) => void;
}

const ICON_OPTIONS: Array<{ value: ProductIconType; label: string }> = [
  { value: 'rice', label: 'Nasi / Hidangan Utama' },
  { value: 'noodle', label: 'Mie / Bakmi' },
  { value: 'grill', label: 'Bakar / Panggang' },
  { value: 'soup', label: 'Soto / Kuah' },
  { value: 'coffee', label: 'Kopi' },
  { value: 'tea', label: 'Teh / Matcha' },
  { value: 'juice', label: 'Jus / Minuman Segar' },
  { value: 'snack', label: 'Camilan Gurih' },
  { value: 'dessert', label: 'Camilan Manis' },
];

export const MenuManagementView: React.FC<Props> = ({
  categories,
  products,
  modifierGroups,
  discounts,
  onSaveCategory,
  onDeleteCategory,
  onSaveProduct,
  onDeleteProduct,
  onSaveModifierGroup,
  onDeleteModifierGroup,
  onSaveDiscount,
  onImportMenu,
}) => {
  const [tab, setTab] = useState<'products' | 'categories' | 'modifiers' | 'discounts'>('products');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Product Form Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showProdModal, setShowProdModal] = useState(false);
  const [pName, setPName] = useState('');
  const [pCatId, setPCatId] = useState('');
  const [pSku, setPSku] = useState('');
  const [pPrice, setPPrice] = useState('');
  const [pCost, setPCost] = useState('');
  const [pIcon, setPIcon] = useState<ProductIconType>('rice');
  const [pModIds, setPModIds] = useState<string[]>([]);
  const [pAvail, setPAvail] = useState(true);

  // Category Form
  const [catName, setCatName] = useState('');
  const [catOrder, setCatOrder] = useState('1');

  // Discount Form
  const [discName, setDiscName] = useState('');
  const [discType, setDiscType] = useState<'percent' | 'nominal'>('percent');
  const [discVal, setDiscVal] = useState('');

  // Modifier Group Form
  const [mgName, setMgName] = useState('');
  const [mgRequired, setMgRequired] = useState(false);
  const [mgMax, setMgMax] = useState('1');
  const [mgOptionName, setMgOptionName] = useState('');
  const [mgOptionPrice, setMgOptionPrice] = useState('0');
  const [mgOptions, setMgOptions] = useState<ModifierOption[]>([]);

  const openNewProduct = () => {
    setEditingProduct(null);
    setPName('');
    setPCatId(categories[0]?.id || '');
    setPSku('');
    setPPrice('');
    setPCost('');
    setPIcon('rice');
    setPModIds([]);
    setPAvail(true);
    setShowProdModal(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setPName(p.name);
    setPCatId(p.categoryId);
    setPSku(p.sku);
    setPPrice(String(p.price));
    setPCost(String(p.costPrice || 0));
    setPIcon(p.iconType);
    setPModIds(p.modifierGroupIds);
    setPAvail(p.isAvailable);
    setShowProdModal(true);
  };

  const handleSaveProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim() || !pCatId) return;
    const now = new Date().toISOString();
    const product: Product = {
      id: editingProduct?.id || `prod_${Date.now()}`,
      outletId: 'main',
      categoryId: pCatId,
      name: pName.trim(),
      sku: pSku.trim() || `SKU-${Date.now().toString().slice(-4)}`,
      price: Math.max(0, Number(pPrice) || 0),
      costPrice: Math.max(0, Number(pCost) || 0),
      iconType: pIcon,
      modifierGroupIds: pModIds,
      isAvailable: pAvail,
      isActive: true,
      createdAt: editingProduct?.createdAt || now,
      updatedAt: now,
    };
    onSaveProduct(product);
    setShowProdModal(false);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { newCategories, newProducts } = await parseMenuImportFile(file, categories);
      onImportMenu(newCategories, newProducts);
      setImportStatus(
        `Berhasil mengimpor ${newProducts.length} produk dan ${newCategories.length} kategori baru.`
      );
    } catch {
      setImportStatus('Gagal membaca file CSV/Excel. Gunakan template yang tersedia.');
    }
    e.target.value = '';
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    onSaveCategory({
      id: `cat_${Date.now()}`,
      outletId: 'main',
      name: catName.trim(),
      sortOrder: Math.max(1, Number(catOrder) || categories.length + 1),
      isActive: true,
    });
    setCatName('');
  };

  const handleAddModifierGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mgName.trim() || mgOptions.length === 0) return;
    onSaveModifierGroup({
      id: `mg_${Date.now()}`,
      outletId: 'main',
      name: mgName.trim(),
      isRequired: mgRequired,
      minSelect: mgRequired ? 1 : 0,
      maxSelect: Math.max(1, Number(mgMax) || 1),
      options: mgOptions,
    });
    setMgName('');
    setMgOptions([]);
  };

  const handleAddDiscount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!discName.trim() || !discVal) return;
    onSaveDiscount({
      id: `disc_${Date.now()}`,
      outletId: 'main',
      name: discName.trim(),
      type: discType,
      value: Math.max(0, Number(discVal) || 0),
      isActive: true,
    });
    setDiscName('');
    setDiscVal('');
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Manajemen Menu</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Kelola produk kuliner, kategori, varian/modifier, diskon, dan impor CSV/Excel.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={downloadMenuImportTemplate}
            className="min-h-[44px] px-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-semibold flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" />
            Template Excel
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-[44px] px-3.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-xs font-semibold flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" />
            Impor CSV/Excel
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={openNewProduct}
            className="min-h-[44px] px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Tambah Produk
          </button>
        </div>
      </div>

      {importStatus && (
        <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/40 px-4 py-2.5 text-xs font-medium text-orange-900 dark:text-orange-200 flex items-center justify-between">
          <span>{importStatus}</span>
          <button type="button" onClick={() => setImportStatus(null)} aria-label="Tutup pesan impor">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800 w-fit overflow-x-auto">
        {(
          [
            { id: 'products', label: `Produk (${products.length})` },
            { id: 'categories', label: `Kategori (${categories.length})` },
            { id: 'modifiers', label: `Modifier (${modifierGroups.length})` },
            { id: 'discounts', label: `Diskon (${discounts.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`min-h-[40px] px-4 rounded-lg text-xs font-semibold whitespace-nowrap ${
              tab === t.id
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-600 dark:text-stone-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'products' && (
        <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 dark:bg-stone-800/60 text-stone-500 border-b border-stone-200 dark:border-stone-800">
                <tr>
                  <th className="py-3 px-4 font-semibold">Menu</th>
                  <th className="py-3 px-4 font-semibold">SKU</th>
                  <th className="py-3 px-4 font-semibold">Kategori</th>
                  <th className="py-3 px-4 font-semibold text-right">Harga Jual</th>
                  <th className="py-3 px-4 font-semibold text-right">HPP</th>
                  <th className="py-3 px-4 font-semibold">Ketersediaan</th>
                  <th className="py-3 px-4 font-semibold text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {products.map((p) => {
                  const cat = categories.find((c) => c.id === p.categoryId);
                  return (
                    <tr key={p.id} className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <FoodIllustration type={p.iconType} className="w-9 h-9" />
                          <span className="font-semibold text-stone-900 dark:text-stone-100">
                            {p.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-stone-500">{p.sku}</td>
                      <td className="py-3 px-4 text-stone-600 dark:text-stone-300">
                        {cat?.name || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold tabular-nums">
                        {formatRupiah(p.price)}
                      </td>
                      <td className="py-3 px-4 text-right tabular-nums text-stone-500">
                        {formatRupiah(p.costPrice)}
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => onSaveProduct({ ...p, isAvailable: !p.isAvailable, updatedAt: new Date().toISOString() })}
                          className={`min-h-[34px] px-2.5 rounded-lg text-xs font-semibold border ${
                            p.isAvailable
                              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                              : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                          }`}
                        >
                          {p.isAvailable ? 'Tersedia' : 'Habis'}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            aria-label={`Edit ${p.name}`}
                            onClick={() => openEditProduct(p)}
                            className="min-h-[36px] min-w-[36px] rounded-lg border border-stone-200 dark:border-stone-700 flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-800"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Hapus ${p.name}`}
                            onClick={() => onDeleteProduct(p.id)}
                            className="min-h-[36px] min-w-[36px] rounded-lg border border-red-200 dark:border-red-800 text-red-600 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-950/40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={handleAddCategory}
            className="lg:col-span-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-3 h-fit"
          >
            <h3 className="text-sm font-bold">Tambah Kategori Baru</h3>
            <div>
              <label htmlFor="cat-name" className="block text-xs font-medium mb-1">
                Nama Kategori
              </label>
              <input
                id="cat-name"
                type="text"
                value={catName}
                onChange={(e) => setCatName(e.target.value)}
                placeholder="Contoh: Dessert & Kue"
                className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm"
              />
            </div>
            <div>
              <label htmlFor="cat-order" className="block text-xs font-medium mb-1">
                Urutan Tampil
              </label>
              <input
                id="cat-order"
                type="number"
                value={catOrder}
                onChange={(e) => setCatOrder(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full min-h-[44px] rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold"
            >
              Simpan Kategori
            </button>
          </form>

          <div className="lg:col-span-8 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 divide-y divide-stone-100 dark:divide-stone-800">
            {categories.map((c) => (
              <div key={c.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">{c.name}</p>
                  <p className="text-xs text-stone-500">Urutan #{c.sortOrder}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Hapus kategori ${c.name}`}
                  onClick={() => onDeleteCategory(c.id)}
                  className="min-h-[38px] min-w-[38px] rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'modifiers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={handleAddModifierGroup}
            className="lg:col-span-5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-3 h-fit"
          >
            <h3 className="text-sm font-bold">Buat Grup Varian / Modifier</h3>
            <input
              type="text"
              value={mgName}
              onChange={(e) => setMgName(e.target.value)}
              placeholder="Nama grup (misal: Level Pedas / Topping)"
              className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm"
            />
            <div className="flex items-center justify-between gap-3 text-xs">
              <label className="flex items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={mgRequired}
                  onChange={(e) => setMgRequired(e.target.checked)}
                />
                Wajib dipilih
              </label>
              <div className="flex items-center gap-2">
                <span>Maks pilihan:</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={mgMax}
                  onChange={(e) => setMgMax(e.target.value)}
                  className="w-16 min-h-[36px] rounded-lg border border-stone-300 dark:border-stone-700 px-2"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-stone-200 dark:border-stone-800 space-y-2">
              <p className="text-xs font-semibold">Tambah Opsi</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={mgOptionName}
                  onChange={(e) => setMgOptionName(e.target.value)}
                  placeholder="Nama opsi (misal: Ekstra Keju)"
                  className="flex-1 min-h-[40px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-xs"
                />
                <input
                  type="number"
                  value={mgOptionPrice}
                  onChange={(e) => setMgOptionPrice(e.target.value)}
                  placeholder="Harga"
                  className="w-24 min-h-[40px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-2 text-xs tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!mgOptionName.trim()) return;
                    setMgOptions((prev) => [
                      ...prev,
                      {
                        id: `opt_${Date.now()}_${prev.length}`,
                        name: mgOptionName.trim(),
                        extraPrice: Math.max(0, Number(mgOptionPrice) || 0),
                        isActive: true,
                      },
                    ]);
                    setMgOptionName('');
                    setMgOptionPrice('0');
                  }}
                  className="px-3 rounded-xl bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 text-xs font-semibold"
                >
                  +Opsi
                </button>
              </div>
              {mgOptions.length > 0 && (
                <div className="space-y-1 text-xs">
                  {mgOptions.map((o) => (
                    <div key={o.id} className="flex justify-between py-1 px-2 rounded bg-stone-50 dark:bg-stone-800">
                      <span>{o.name}</span>
                      <span className="tabular-nums">+{formatRupiah(o.extraPrice)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!mgName.trim() || mgOptions.length === 0}
              className="w-full min-h-[44px] rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white text-xs font-semibold"
            >
              Simpan Grup Modifier
            </button>
          </form>

          <div className="lg:col-span-7 space-y-3">
            {modifierGroups.map((g) => (
              <div
                key={g.id}
                className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold">{g.name}</h4>
                    <p className="text-xs text-stone-500">
                      {g.isRequired ? 'Wajib' : 'Opsional'} · Maks {g.maxSelect} pilihan
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Hapus grup ${g.name}`}
                    onClick={() => onDeleteModifierGroup(g.id)}
                    className="min-h-[36px] min-w-[36px] rounded-lg text-red-600 hover:bg-red-50 flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-stone-700 dark:text-stone-300">
                  {g.options.map((o) => (
                    <span key={o.id} className="px-2.5 py-1 rounded-lg bg-stone-100 dark:bg-stone-800 tabular-nums">
                      {o.name} {o.extraPrice > 0 ? `(+${formatRupiah(o.extraPrice)})` : ''}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'discounts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <form
            onSubmit={handleAddDiscount}
            className="lg:col-span-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 space-y-3 h-fit"
          >
            <h3 className="text-sm font-bold">Tambah Diskon / Promo</h3>
            <input
              type="text"
              value={discName}
              onChange={(e) => setDiscName(e.target.value)}
              placeholder="Nama promo (misal: Diskon Member 15%)"
              className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                value={discType}
                onChange={(e) => setDiscType(e.target.value as 'percent' | 'nominal')}
                className="min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-xs"
              >
                <option value="percent">Persen (%)</option>
                <option value="nominal">Nominal (Rp)</option>
              </select>
              <input
                type="number"
                value={discVal}
                onChange={(e) => setDiscVal(e.target.value)}
                placeholder={discType === 'percent' ? '15' : '10000'}
                className="min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm tabular-nums"
              />
            </div>
            <button
              type="submit"
              className="w-full min-h-[44px] rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold"
            >
              Simpan Diskon
            </button>
          </form>

          <div className="lg:col-span-8 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 divide-y divide-stone-100 dark:divide-stone-800">
            {discounts.map((d) => (
              <div key={d.id} className="p-4 flex items-center justify-between text-xs">
                <div>
                  <p className="text-sm font-semibold">{d.name}</p>
                  <p className="text-stone-500 tabular-nums">
                    {d.type === 'percent' ? `${d.value}%` : formatRupiah(d.value)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onSaveDiscount({ ...d, isActive: !d.isActive })}
                  className={`min-h-[36px] px-3 rounded-lg border font-semibold ${
                    d.isActive
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-stone-200 bg-stone-100 text-stone-500'
                  }`}
                >
                  {d.isActive ? 'Aktif' : 'Nonaktif'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="p-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <h3 className="text-base font-bold">
                {editingProduct ? 'Edit Produk Menu' : 'Tambah Produk Menu'}
              </h3>
              <button
                type="button"
                aria-label="Tutup form produk"
                onClick={() => setShowProdModal(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProductSubmit} className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
              <div>
                <label htmlFor="prod-name" className="block font-semibold mb-1">Nama Menu</label>
                <input
                  id="prod-name"
                  required
                  type="text"
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="prod-cat" className="block font-semibold mb-1">Kategori</label>
                  <select
                    id="prod-cat"
                    value={pCatId}
                    onChange={(e) => setPCatId(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="prod-sku" className="block font-semibold mb-1">SKU (Opsional)</label>
                  <input
                    id="prod-sku"
                    type="text"
                    value={pSku}
                    onChange={(e) => setPSku(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="prod-price" className="block font-semibold mb-1">Harga Jual (Rp)</label>
                  <input
                    id="prod-price"
                    required
                    type="number"
                    min={0}
                    value={pPrice}
                    onChange={(e) => setPPrice(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label htmlFor="prod-cost" className="block font-semibold mb-1">Harga Pokok / HPP (Rp)</label>
                  <input
                    id="prod-cost"
                    type="number"
                    min={0}
                    value={pCost}
                    onChange={(e) => setPCost(e.target.value)}
                    className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="prod-icon" className="block font-semibold mb-1">Ikon Ilustrasi Menu</label>
                <select
                  id="prod-icon"
                  value={pIcon}
                  onChange={(e) => setPIcon(e.target.value as ProductIconType)}
                  className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3"
                >
                  {ICON_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              {modifierGroups.length > 0 && (
                <div className="space-y-1.5">
                  <p className="font-semibold">Grup Varian / Modifier</p>
                  <div className="grid grid-cols-2 gap-2">
                    {modifierGroups.map((g) => {
                      const checked = pModIds.includes(g.id);
                      return (
                        <label
                          key={g.id}
                          className="flex items-center gap-2 p-2 rounded-lg border border-stone-200 dark:border-stone-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() =>
                              setPModIds((prev) =>
                                checked ? prev.filter((id) => id !== g.id) : [...prev, g.id]
                              )
                            }
                          />
                          <span>{g.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2 pt-1 font-semibold">
                <input
                  type="checkbox"
                  checked={pAvail}
                  onChange={(e) => setPAvail(e.target.checked)}
                />
                Menu Tersedia (bisa dipesan sekarang)
              </label>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowProdModal(false)}
                  className="min-h-[46px] px-4 rounded-xl border border-stone-200 dark:border-stone-700 font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[46px] rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                >
                  Simpan Produk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
