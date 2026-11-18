import type {
  CartItem,
  Category,
  Discount,
  Expense,
  ModifierGroup,
  Order,
  OrderType,
  PaymentMethod,
  Product,
  SelectedModifier,
  Shift,
} from '../types/pos';

export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount || 0);
  const sign = rounded < 0 ? '-' : '';
  const absFormatted = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}Rp ${absFormatted}`;
}

export function formatDateID(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDateTimeWIB(iso: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return `${new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d)} WIB`;
}

export function getJakartaDateKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value || '2026';
  const month = parts.find((p) => p.type === 'month')?.value || '01';
  const day = parts.find((p) => p.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
}

export function computeCartItemLineTotal(
  unitPrice: number,
  qty: number,
  modifiers: SelectedModifier[]
): number {
  const modExtra = modifiers.reduce((sum, m) => sum + (m.extraPriceSnapshot || 0), 0);
  return Math.max(0, Math.round((unitPrice + modExtra) * Math.max(1, qty)));
}

export interface OrderTotalsInput {
  items: CartItem[];
  discount?: Pick<Discount, 'id' | 'name' | 'type' | 'value'> | null;
  customDiscount?: { type: 'percent' | 'nominal'; value: number; name?: string } | null;
  taxPercent: number;
  serviceChargePercent: number;
}

export interface OrderTotalsResult {
  subtotal: number;
  discountAmount: number;
  discountName: string;
  taxableBase: number;
  serviceAmount: number;
  taxAmount: number;
  total: number;
  estimatedCost: number;
}

export function computeOrderTotals(input: OrderTotalsInput): OrderTotalsResult {
  const subtotal = input.items.reduce((sum, item) => sum + item.lineTotal, 0);
  const estimatedCost = input.items.reduce(
    (sum, item) => sum + (item.costPriceSnapshot || 0) * item.qty,
    0
  );

  let discountAmount = 0;
  let discountName = '';

  const activeDisc = input.customDiscount || input.discount;
  if (activeDisc && activeDisc.value > 0 && subtotal > 0) {
    discountName = activeDisc.name || 'Diskon';
    if (activeDisc.type === 'percent') {
      const clampedPct = Math.min(100, Math.max(0, activeDisc.value));
      discountAmount = Math.round((subtotal * clampedPct) / 100);
    } else {
      discountAmount = Math.min(subtotal, Math.round(Math.max(0, activeDisc.value)));
    }
  }

  const taxableBase = Math.max(0, subtotal - discountAmount);
  const serviceAmount = Math.round((taxableBase * Math.max(0, input.serviceChargePercent)) / 100);
  const taxAmount = Math.round(((taxableBase + serviceAmount) * Math.max(0, input.taxPercent)) / 100);
  const total = taxableBase + serviceAmount + taxAmount;

  return {
    subtotal,
    discountAmount,
    discountName,
    taxableBase,
    serviceAmount,
    taxAmount,
    total,
    estimatedCost,
  };
}

export function computeCashChange(total: number, paidAmount: number): {
  isEnough: boolean;
  changeAmount: number;
  shortfall: number;
} {
  const cleanTotal = Math.max(0, Math.round(total));
  const cleanPaid = Math.max(0, Math.round(paidAmount));
  if (cleanPaid >= cleanTotal) {
    return { isEnough: true, changeAmount: cleanPaid - cleanTotal, shortfall: 0 };
  }
  return { isEnough: false, changeAmount: 0, shortfall: cleanTotal - cleanPaid };
}

export function computeShiftCashSummary(
  shift: Pick<Shift, 'id' | 'openingCash'>,
  orders: Order[],
  expenses: Expense[]
): {
  openingCash: number;
  cashSalesTotal: number;
  nonCashSalesTotal: number;
  expensesTotal: number;
  expectedCash: number;
  completedOrderCount: number;
  voidOrderCount: number;
} {
  const shiftOrders = orders.filter((o) => o.shiftId === shift.id);
  const validOrders = shiftOrders.filter((o) => o.status !== 'void' && o.status !== 'cancelled' && o.status !== 'hold');
  const voidOrderCount = shiftOrders.filter((o) => o.status === 'void').length;

  let cashSalesTotal = 0;
  let nonCashSalesTotal = 0;

  for (const order of validOrders) {
    let cashPaidForOrder = 0;
    let nonCashPaidForOrder = 0;
    for (const p of order.payments) {
      if (p.method === 'cash') {
        cashPaidForOrder += p.amount;
      } else {
        nonCashPaidForOrder += p.amount;
      }
    }
    // Net cash kept in drawer excludes change given back
    const netCash = Math.max(0, cashPaidForOrder - (order.changeAmount || 0));
    cashSalesTotal += netCash;
    nonCashSalesTotal += nonCashPaidForOrder;
  }

  const expensesTotal = expenses
    .filter((e) => e.shiftId === shift.id)
    .reduce((sum, e) => sum + e.amount, 0);

  const expectedCash = Math.round(shift.openingCash + cashSalesTotal - expensesTotal);

  return {
    openingCash: shift.openingCash,
    cashSalesTotal,
    nonCashSalesTotal,
    expensesTotal,
    expectedCash,
    completedOrderCount: validOrders.length,
    voidOrderCount,
  };
}

export function computeShiftCashDifference(expectedCash: number, actualCash: number): number {
  return Math.round(actualCash - expectedCash);
}

export function generateOrderNumber(dateKey: string, sequence: number, devicePrefix = ''): string {
  const compactDate = dateKey.replace(/-/g, '');
  const seqStr = String(Math.max(1, sequence)).padStart(4, '0');
  return devicePrefix ? `${devicePrefix}-${compactDate}-${seqStr}` : `${compactDate}-${seqStr}`;
}

export function validateModifierSelections(
  groups: ModifierGroup[],
  selectedByGroup: Record<string, string[]>
): { valid: boolean; errorMessage: string | null } {
  for (const group of groups) {
    const selected = selectedByGroup[group.id] || [];
    const minNeeded = group.isRequired ? Math.max(1, group.minSelect) : group.minSelect;
    if (selected.length < minNeeded) {
      return {
        valid: false,
        errorMessage: `Pilih minimal ${minNeeded} opsi pada "${group.name}".`,
      };
    }
    if (group.maxSelect > 0 && selected.length > group.maxSelect) {
      return {
        valid: false,
        errorMessage: `Maksimal ${group.maxSelect} opsi untuk "${group.name}".`,
      };
    }
  }
  return { valid: true, errorMessage: null };
}

export function hashPinSync(pin: string): string {
  // Deterministic FNV-1a + salted mixing hash (synchronous, works in Node & browser offline)
  const salted = `dk_pin_v1:${pin.trim()}:warung`;
  let h1 = 0x811c9dc5;
  let h2 = 0x9e3779b9;
  for (let i = 0; i < salted.length; i++) {
    const c = salted.charCodeAt(i);
    h1 ^= c;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= c + (i << 3);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return `pin_${(h1 >>> 0).toString(16).padStart(8, '0')}${(h2 >>> 0).toString(16).padStart(8, '0')}`;
}

export interface ProductSalesStat {
  productId: string;
  name: string;
  categoryName: string;
  qty: number;
  revenue: number;
  estimatedProfit: number;
}

export interface AnalyticsSummary {
  totalRevenue: number;
  orderCount: number;
  avgOrderValue: number;
  grossProfit: number;
  voidCount: number;
  voidTotal: number;
  topProducts: ProductSalesStat[];
  leastProducts: ProductSalesStat[];
  byCategory: Array<{ categoryId: string; name: string; revenue: number; qty: number }>;
  byPaymentMethod: Array<{ method: PaymentMethod; label: string; amount: number; count: number }>;
  byOrderType: Array<{ orderType: OrderType; label: string; revenue: number; count: number }>;
  byCashier: Array<{ userId: string; userName: string; revenue: number; count: number }>;
  dailyTrend: Array<{ dateKey: string; label: string; revenue: number; orders: number }>;
  heatmap: number[][]; // [dayIndex 0=Sen..6=Min][hourIndex 0=08..14=22]
  peakHourLabel: string;
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: 'Tunai',
  qris: 'QRIS',
  transfer: 'Transfer Bank',
  ewallet: 'E-Wallet',
};

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  dine_in: 'Makan di Tempat',
  takeaway: 'Bawa Pulang',
  delivery: 'Delivery',
};

export function computeAnalyticsSummary(
  orders: Order[],
  products: Product[],
  categories: Category[],
  startDateKey?: string,
  endDateKey?: string
): AnalyticsSummary {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const productMap = new Map(products.map((p) => [p.id, p]));

  const filtered = orders.filter((o) => {
    if (o.status === 'hold') return false;
    const dk = getJakartaDateKey(new Date(o.createdAt));
    if (startDateKey && dk < startDateKey) return false;
    if (endDateKey && dk > endDateKey) return false;
    return true;
  });

  const validOrders = filtered.filter((o) => o.status !== 'void' && o.status !== 'cancelled');
  const voidOrders = filtered.filter((o) => o.status === 'void');

  let totalRevenue = 0;
  let grossProfit = 0;

  const productStats = new Map<string, ProductSalesStat>();
  for (const p of products) {
    if (p.isActive) {
      productStats.set(p.id, {
        productId: p.id,
        name: p.name,
        categoryName: categoryMap.get(p.categoryId) || 'Lainnya',
        qty: 0,
        revenue: 0,
        estimatedProfit: 0,
      });
    }
  }

  const catStats = new Map<string, { categoryId: string; name: string; revenue: number; qty: number }>();
  const payStats = new Map<PaymentMethod, { method: PaymentMethod; label: string; amount: number; count: number }>([
    ['cash', { method: 'cash', label: PAYMENT_LABELS.cash, amount: 0, count: 0 }],
    ['qris', { method: 'qris', label: PAYMENT_LABELS.qris, amount: 0, count: 0 }],
    ['transfer', { method: 'transfer', label: PAYMENT_LABELS.transfer, amount: 0, count: 0 }],
    ['ewallet', { method: 'ewallet', label: PAYMENT_LABELS.ewallet, amount: 0, count: 0 }],
  ]);
  const typeStats = new Map<OrderType, { orderType: OrderType; label: string; revenue: number; count: number }>([
    ['dine_in', { orderType: 'dine_in', label: ORDER_TYPE_LABELS.dine_in, revenue: 0, count: 0 }],
    ['takeaway', { orderType: 'takeaway', label: ORDER_TYPE_LABELS.takeaway, revenue: 0, count: 0 }],
    ['delivery', { orderType: 'delivery', label: ORDER_TYPE_LABELS.delivery, revenue: 0, count: 0 }],
  ]);
  const cashierStats = new Map<string, { userId: string; userName: string; revenue: number; count: number }>();
  const dailyMap = new Map<string, { dateKey: string; revenue: number; orders: number }>();

  // 7 days (Sen=0..Min=6) x 15 hours (08:00..22:00)
  const heatmap: number[][] = Array.from({ length: 7 }, () => Array(15).fill(0));
  const hourCounts = Array(15).fill(0);

  for (const order of validOrders) {
    totalRevenue += order.total;

    const orderDate = new Date(order.createdAt);
    const dk = getJakartaDateKey(orderDate);
    const existingDay = dailyMap.get(dk) || { dateKey: dk, revenue: 0, orders: 0 };
    existingDay.revenue += order.total;
    existingDay.orders += 1;
    dailyMap.set(dk, existingDay);

    // Heatmap Jakarta hour & weekday
    const jakartaParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Jakarta',
      weekday: 'short',
      hour: '2-digit',
      hour12: false,
    }).formatToParts(orderDate);
    const wkStr = jakartaParts.find((p) => p.type === 'weekday')?.value || 'Mon';
    const hrNum = Number(jakartaParts.find((p) => p.type === 'hour')?.value || '12');
    const wkMap: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
    const dayIdx = wkMap[wkStr] ?? 0;
    const hrIdx = Math.min(14, Math.max(0, hrNum - 8));
    if (hrNum >= 8 && hrNum <= 22) {
      heatmap[dayIdx][hrIdx] += 1;
      hourCounts[hrIdx] += 1;
    }

    // Order type
    const tStat = typeStats.get(order.orderType);
    if (tStat) {
      tStat.revenue += order.total;
      tStat.count += 1;
    }

    // Cashier
    const cStat = cashierStats.get(order.userId) || {
      userId: order.userId,
      userName: order.userName,
      revenue: 0,
      count: 0,
    };
    cStat.revenue += order.total;
    cStat.count += 1;
    cashierStats.set(order.userId, cStat);

    // Payments
    for (const p of order.payments) {
      const pStat = payStats.get(p.method);
      if (pStat) {
        const net = p.method === 'cash' ? Math.max(0, p.amount - (order.changeAmount || 0)) : p.amount;
        pStat.amount += net;
        pStat.count += 1;
      }
    }

    // Items
    for (const item of order.items) {
      const prod = productMap.get(item.productId);
      const catId = item.categoryIdSnapshot || prod?.categoryId || 'other';
      const catName = categoryMap.get(catId) || 'Lainnya';
      const costUnit = item.costPriceSnapshot ?? prod?.costPrice ?? 0;
      const itemCost = costUnit * item.qty;
      const itemProfit = Math.max(0, item.lineTotal - itemCost);
      grossProfit += itemProfit;

      const ps = productStats.get(item.productId) || {
        productId: item.productId,
        name: item.productNameSnapshot,
        categoryName: catName,
        qty: 0,
        revenue: 0,
        estimatedProfit: 0,
      };
      ps.qty += item.qty;
      ps.revenue += item.lineTotal;
      ps.estimatedProfit += itemProfit;
      productStats.set(item.productId, ps);

      const cs = catStats.get(catId) || { categoryId: catId, name: catName, revenue: 0, qty: 0 };
      cs.revenue += item.lineTotal;
      cs.qty += item.qty;
      catStats.set(catId, cs);
    }
  }

  const allProductStats = Array.from(productStats.values());
  const topProducts = [...allProductStats]
    .filter((p) => p.qty > 0)
    .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue);

  const leastProducts = [...allProductStats]
    .sort((a, b) => a.qty - b.qty || a.revenue - b.revenue)
    .slice(0, 5);

  let peakHourIdx = 4; // default 12:00
  let maxHourCount = -1;
  hourCounts.forEach((cnt, idx) => {
    if (cnt > maxHourCount) {
      maxHourCount = cnt;
      peakHourIdx = idx;
    }
  });
  const peakHourLabel =
    maxHourCount > 0 ? `${String(peakHourIdx + 8).padStart(2, '0')}:00–${String(peakHourIdx + 9).padStart(2, '0')}:00` : '-';

  const dailyTrend = Array.from(dailyMap.values())
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
    .map((d) => ({
      ...d,
      label: formatDateID(`${d.dateKey}T12:00:00+07:00`),
    }));

  const orderCount = validOrders.length;
  const avgOrderValue = orderCount > 0 ? Math.round(totalRevenue / orderCount) : 0;

  return {
    totalRevenue,
    orderCount,
    avgOrderValue,
    grossProfit,
    voidCount: voidOrders.length,
    voidTotal: voidOrders.reduce((s, o) => s + o.total, 0),
    topProducts,
    leastProducts,
    byCategory: Array.from(catStats.values()).sort((a, b) => b.revenue - a.revenue),
    byPaymentMethod: Array.from(payStats.values()),
    byOrderType: Array.from(typeStats.values()),
    byCashier: Array.from(cashierStats.values()).sort((a, b) => b.revenue - a.revenue),
    dailyTrend,
    heatmap,
    peakHourLabel,
  };
}
