import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAnalyticsSummary,
  computeCartItemLineTotal,
  computeCashChange,
  computeOrderTotals,
  computeShiftCashDifference,
  computeShiftCashSummary,
  formatRupiah,
  generateOrderNumber,
  hashPinSync,
  validateModifierSelections,
} from './posCalculations';
import type { CartItem, Category, Expense, ModifierGroup, Order, Product, Shift } from '../types/pos';

test('formatRupiah formats Indonesian currency without decimals', () => {
  assert.equal(formatRupiah(25000), 'Rp 25.000');
  assert.equal(formatRupiah(0), 'Rp 0');
  assert.equal(formatRupiah(-1500), '-Rp 1.500');
});

test('computeCartItemLineTotal includes modifier extra prices and quantity', () => {
  const total = computeCartItemLineTotal(25000, 2, [
    { modifierOptionId: 'm1', groupName: 'Level', nameSnapshot: 'Pedas', extraPriceSnapshot: 0 },
    { modifierOptionId: 'm2', groupName: 'Topping', nameSnapshot: 'Telur', extraPriceSnapshot: 5000 },
  ]);
  assert.equal(total, 60000);
});

test('computeOrderTotals computes percent discount, service charge, and PB1 tax accurately', () => {
  const items: CartItem[] = [
    {
      id: 'ci1',
      productId: 'p1',
      productNameSnapshot: 'Nasi Goreng Spesial',
      unitPriceSnapshot: 30000,
      costPriceSnapshot: 15000,
      categoryIdSnapshot: 'cat1',
      qty: 2,
      note: '',
      modifiers: [],
      lineTotal: 60000,
    },
  ];
  const result = computeOrderTotals({
    items,
    discount: { id: 'd1', name: 'Promo 10%', type: 'percent', value: 10 },
    taxPercent: 10,
    serviceChargePercent: 5,
  });
  // Subtotal: 60.000 -> Disc 10%: 6.000 -> Base: 54.000
  // Service 5% of 54.000 = 2.700
  // Tax 10% of (54.000 + 2.700) = 5.670
  // Total = 54.000 + 2.700 + 5.670 = 62.370
  assert.equal(result.subtotal, 60000);
  assert.equal(result.discountAmount, 6000);
  assert.equal(result.serviceAmount, 2700);
  assert.equal(result.taxAmount, 5670);
  assert.equal(result.total, 62370);
});

test('computeCashChange detects sufficient payment and calculates exact change', () => {
  const sufficient = computeCashChange(37500, 50000);
  assert.equal(sufficient.isEnough, true);
  assert.equal(sufficient.changeAmount, 12500);
  assert.equal(sufficient.shortfall, 0);

  const insufficient = computeCashChange(37500, 30000);
  assert.equal(insufficient.isEnough, false);
  assert.equal(insufficient.shortfall, 7500);
});

test('computeShiftCashSummary reconciles opening cash, net cash sales, QRIS, and expenses', () => {
  const shift: Pick<Shift, 'id' | 'openingCash'> = { id: 'sh1', openingCash: 300000 };
  const orders: Order[] = [
    {
      id: 'o1',
      orderNumber: '20261117-0001',
      queueNumber: 1,
      outletId: 'main',
      shiftId: 'sh1',
      userId: 'u1',
      userName: 'Siti',
      orderType: 'dine_in',
      tableOrCustomerName: 'Meja 1',
      status: 'completed',
      items: [],
      subtotal: 40000,
      discountAmount: 0,
      taxAmount: 0,
      serviceAmount: 0,
      total: 40000,
      payments: [{ id: 'p1', method: 'cash', amount: 50000, reference: '', paidAt: '', receivedBy: 'u1' }],
      paidAmount: 50000,
      changeAmount: 10000,
      note: '',
      createdAt: '2026-11-17T04:00:00.000Z',
      updatedAt: '2026-11-17T04:00:00.000Z',
      syncStatus: 'synced',
    },
    {
      id: 'o2',
      orderNumber: '20261117-0002',
      queueNumber: 2,
      outletId: 'main',
      shiftId: 'sh1',
      userId: 'u1',
      userName: 'Siti',
      orderType: 'takeaway',
      tableOrCustomerName: '',
      status: 'completed',
      items: [],
      subtotal: 25000,
      discountAmount: 0,
      taxAmount: 0,
      serviceAmount: 0,
      total: 25000,
      payments: [{ id: 'p2', method: 'qris', amount: 25000, reference: 'QR01', paidAt: '', receivedBy: 'u1' }],
      paidAmount: 25000,
      changeAmount: 0,
      note: '',
      createdAt: '2026-11-17T05:00:00.000Z',
      updatedAt: '2026-11-17T05:00:00.000Z',
      syncStatus: 'synced',
    },
  ];
  const expenses: Expense[] = [
    {
      id: 'ex1',
      outletId: 'main',
      shiftId: 'sh1',
      description: 'Beli es batu',
      amount: 15000,
      createdBy: 'u1',
      createdByName: 'Siti',
      createdAt: '2026-11-17T05:30:00.000Z',
    },
  ];

  const summary = computeShiftCashSummary(shift, orders, expenses);
  assert.equal(summary.cashSalesTotal, 40000);
  assert.equal(summary.nonCashSalesTotal, 25000);
  assert.equal(summary.expensesTotal, 15000);
  assert.equal(summary.expectedCash, 325000);
  assert.equal(computeShiftCashDifference(summary.expectedCash, 324000), -1000);
});

test('validateModifierSelections enforces required and max selection bounds', () => {
  const groups: ModifierGroup[] = [
    {
      id: 'mg1',
      outletId: 'main',
      name: 'Level Pedas',
      isRequired: true,
      minSelect: 1,
      maxSelect: 1,
      options: [{ id: 'opt1', name: 'Sedang', extraPrice: 0, isActive: true }],
    },
  ];

  assert.equal(validateModifierSelections(groups, {}).valid, false);
  assert.equal(validateModifierSelections(groups, { mg1: ['opt1'] }).valid, true);
  assert.equal(validateModifierSelections(groups, { mg1: ['opt1', 'opt2'] }).valid, false);
});

test('generateOrderNumber and hashPinSync produce deterministic formats', () => {
  assert.equal(generateOrderNumber('2026-11-17', 7), '20261117-0007');
  assert.equal(hashPinSync('1234'), hashPinSync('1234'));
  assert.notEqual(hashPinSync('1234'), hashPinSync('0000'));
});

test('computeAnalyticsSummary aggregates revenue, top products, and excludes voided orders', () => {
  const categories: Category[] = [{ id: 'c1', outletId: 'main', name: 'Makanan', sortOrder: 1, isActive: true }];
  const products: Product[] = [
    {
      id: 'p1',
      outletId: 'main',
      categoryId: 'c1',
      name: 'Bakmi Jawa',
      sku: 'MJ-01',
      price: 28000,
      costPrice: 12000,
      iconType: 'noodle',
      modifierGroupIds: [],
      isAvailable: true,
      isActive: true,
      createdAt: '2026-11-10T00:00:00Z',
      updatedAt: '2026-11-10T00:00:00Z',
    },
  ];
  const orders: Order[] = [
    {
      id: 'o1',
      orderNumber: '20261117-0001',
      queueNumber: 1,
      outletId: 'main',
      shiftId: 's1',
      userId: 'u1',
      userName: 'Riyan',
      orderType: 'dine_in',
      tableOrCustomerName: 'Meja 2',
      status: 'completed',
      items: [
        {
          id: 'i1',
          productId: 'p1',
          productNameSnapshot: 'Bakmi Jawa',
          unitPriceSnapshot: 28000,
          costPriceSnapshot: 12000,
          categoryIdSnapshot: 'c1',
          qty: 2,
          note: '',
          modifiers: [],
          lineTotal: 56000,
        },
      ],
      subtotal: 56000,
      discountAmount: 0,
      taxAmount: 0,
      serviceAmount: 0,
      total: 56000,
      payments: [{ id: 'pay1', method: 'qris', amount: 56000, reference: 'Q1', paidAt: '', receivedBy: 'u1' }],
      paidAmount: 56000,
      changeAmount: 0,
      note: '',
      createdAt: '2026-11-17T05:15:00.000Z',
      updatedAt: '2026-11-17T05:15:00.000Z',
      syncStatus: 'synced',
    },
    {
      id: 'o2',
      orderNumber: '20261117-0002',
      queueNumber: 2,
      outletId: 'main',
      shiftId: 's1',
      userId: 'u1',
      userName: 'Riyan',
      orderType: 'takeaway',
      tableOrCustomerName: '',
      status: 'void',
      items: [],
      subtotal: 28000,
      discountAmount: 0,
      taxAmount: 0,
      serviceAmount: 0,
      total: 28000,
      payments: [],
      paidAmount: 0,
      changeAmount: 0,
      note: '',
      createdAt: '2026-11-17T06:00:00.000Z',
      updatedAt: '2026-11-17T06:00:00.000Z',
      voidReason: 'Salah input',
      voidBy: 'u1',
      syncStatus: 'synced',
    },
  ];

  const stats = computeAnalyticsSummary(orders, products, categories, '2026-11-17', '2026-11-17');
  assert.equal(stats.totalRevenue, 56000);
  assert.equal(stats.orderCount, 1);
  assert.equal(stats.voidCount, 1);
  assert.equal(stats.topProducts[0]?.name, 'Bakmi Jawa');
  assert.equal(stats.topProducts[0]?.qty, 2);
});
