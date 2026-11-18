import React, { useMemo, useState } from 'react';
import { Minus, Plus, X } from 'lucide-react';
import type { ModifierGroup, Product, SelectedModifier } from '../../types/pos';
import {
  computeCartItemLineTotal,
  formatRupiah,
  validateModifierSelections,
} from '../../utils/posCalculations';
import { FoodIllustration } from '../common/FoodIllustration';

interface Props {
  product: Product;
  modifierGroups: ModifierGroup[];
  onClose: () => void;
  onConfirm: (qty: number, note: string, modifiers: SelectedModifier[]) => void;
}

export const ModifierModal: React.FC<Props> = ({
  product,
  modifierGroups,
  onClose,
  onConfirm,
}) => {
  const productGroups = useMemo(
    () => modifierGroups.filter((g) => product.modifierGroupIds.includes(g.id)),
    [modifierGroups, product.modifierGroupIds]
  );

  const [selectedByGroup, setSelectedByGroup] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    for (const g of productGroups) {
      const firstActive = g.options.find((o) => o.isActive);
      if (g.isRequired && firstActive) {
        initial[g.id] = [firstActive.id];
      } else {
        initial[g.id] = [];
      }
    }
    return initial;
  });

  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selectedModifiers: SelectedModifier[] = useMemo(() => {
    const list: SelectedModifier[] = [];
    for (const g of productGroups) {
      const ids = selectedByGroup[g.id] || [];
      for (const optId of ids) {
        const opt = g.options.find((o) => o.id === optId);
        if (opt) {
          list.push({
            modifierOptionId: opt.id,
            groupName: g.name,
            nameSnapshot: opt.name,
            extraPriceSnapshot: opt.extraPrice,
          });
        }
      }
    }
    return list;
  }, [productGroups, selectedByGroup]);

  const lineTotal = computeCartItemLineTotal(product.price, qty, selectedModifiers);

  const toggleOption = (group: ModifierGroup, optionId: string) => {
    setError(null);
    setSelectedByGroup((prev) => {
      const current = prev[group.id] || [];
      if (group.maxSelect === 1) {
        if (current.includes(optionId) && !group.isRequired && group.minSelect === 0) {
          return { ...prev, [group.id]: [] };
        }
        return { ...prev, [group.id]: [optionId] };
      }
      if (current.includes(optionId)) {
        return { ...prev, [group.id]: current.filter((id) => id !== optionId) };
      }
      if (group.maxSelect > 0 && current.length >= group.maxSelect) {
        return prev;
      }
      return { ...prev, [group.id]: [...current, optionId] };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateModifierSelections(productGroups, selectedByGroup);
    if (!validation.valid) {
      setError(validation.errorMessage);
      return;
    }
    onConfirm(qty, note.trim(), selectedModifiers);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modifier-modal-title"
        className="w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <FoodIllustration type={product.iconType} className="w-12 h-12" />
            <div>
              <h3 id="modifier-modal-title" className="text-base font-bold text-stone-900 dark:text-stone-100">
                {product.name}
              </h3>
              <p className="text-sm font-semibold text-orange-600 dark:text-orange-400 tabular-nums">
                {formatRupiah(product.price)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pilihan varian"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {error && (
            <div role="alert" className="rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {productGroups.map((group) => {
            const selected = selectedByGroup[group.id] || [];
            return (
              <div key={group.id} className="space-y-2.5">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">
                    {group.name}
                  </h4>
                  <span className="text-xs text-stone-500 dark:text-stone-400">
                    {group.isRequired ? 'Wajib' : 'Opsional'} ·{' '}
                    {group.maxSelect === 1 ? 'Pilih 1' : `Maks ${group.maxSelect}`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {group.options
                    .filter((o) => o.isActive)
                    .map((opt) => {
                      const isChecked = selected.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleOption(group, opt.id)}
                          aria-pressed={isChecked}
                          className={`min-h-[48px] px-3.5 py-2.5 rounded-xl border text-left flex items-center justify-between gap-2 transition-colors ${
                            isChecked
                              ? 'border-orange-600 bg-orange-50 dark:bg-orange-950/40 text-orange-900 dark:text-orange-200'
                              : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-800 dark:text-stone-200'
                          }`}
                        >
                          <span className="text-sm font-medium">{opt.name}</span>
                          <span className="text-xs font-semibold tabular-nums text-stone-500 dark:text-stone-400">
                            {opt.extraPrice > 0 ? `+${formatRupiah(opt.extraPrice)}` : 'Gratis'}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            );
          })}

          <div>
            <label htmlFor="item-note-input" className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              Catatan Dapur (Opsional)
            </label>
            <input
              id="item-note-input"
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={120}
              placeholder="Contoh: Tanpa bawang goreng, saus dipisah"
              className="w-full min-h-[44px] rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 px-3 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="pt-2 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Kurangi jumlah"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="min-h-[48px] min-w-[48px] rounded-xl border border-stone-200 dark:border-stone-700 flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-10 text-center text-base font-bold tabular-nums">{qty}</span>
              <button
                type="button"
                aria-label="Tambah jumlah"
                onClick={() => setQty((q) => q + 1)}
                className="min-h-[48px] min-w-[48px] rounded-xl border border-stone-200 dark:border-stone-700 flex items-center justify-center hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <button
              type="submit"
              className="flex-1 min-h-[48px] rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-semibold text-sm px-4 transition-colors tabular-nums"
            >
              Tambah · {formatRupiah(lineTotal)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
