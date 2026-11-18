import type {
  AuditLog,
  Category,
  Discount,
  Expense,
  ModifierGroup,
  Order,
  OutletProfile,
  Product,
  Shift,
  StaffUser,
} from '../types/pos';
import { getJakartaDateKey, hashPinSync } from '../utils/posCalculations';

export const DEFAULT_OUTLET: OutletProfile = {
  id: 'main',
  name: 'Warung Rasa Nusantara',
  address: 'Jl. Kemang Raya No. 48, Jakarta Selatan',
  phone: '0812-8890-4411',
  npwp: '09.254.294.3-014.000',
  operatingHours: '08:00 – 22:00 WIB',
  taxPercent: 10,
  serviceChargePercent: 5,
  receiptHeader: 'Terima kasih telah berkunjung ke Warung Rasa Nusantara',
  receiptFooter: 'Simpan struk ini sebagai bukti pembayaran yang sah · WiFi: RasaNusantara / kopi88',
  qrisMerchantName: 'WARUNG RASA NUSANTARA',
  qrisImageUrl: '',
  timezone: 'Asia/Jakarta',
  currency: 'IDR',
  updatedAt: '2026-11-17T08:00:00.000Z',
};

export const DEFAULT_USERS: StaffUser[] = [
  {
    id: 'staff_owner',
    outletId: 'main',
    name: 'Riyan (Owner)',
    email: 'riyanxnation@gmail.com',
    role: 'owner',
    pinHash: hashPinSync('1234'),
    isActive: true,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'staff_manager',
    outletId: 'main',
    name: 'Dewi Lestari (Manajer)',
    email: 'dewi.manajer@warungrasa.id',
    role: 'manager',
    pinHash: hashPinSync('2222'),
    isActive: true,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'staff_cashier_1',
    outletId: 'main',
    name: 'Budi Santoso (Kasir)',
    email: 'budi.kasir@warungrasa.id',
    role: 'cashier',
    pinHash: hashPinSync('0000'),
    isActive: true,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
  },
];

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_rice', outletId: 'main', name: 'Nasi & Lauk', sortOrder: 1, isActive: true },
  { id: 'cat_noodle', outletId: 'main', name: 'Mie & Bakmi', sortOrder: 2, isActive: true },
  { id: 'cat_coffee', outletId: 'main', name: 'Kopi & Teh', sortOrder: 3, isActive: true },
  { id: 'cat_fresh', outletId: 'main', name: 'Minuman Segar', sortOrder: 4, isActive: true },
  { id: 'cat_snack', outletId: 'main', name: 'Camilan', sortOrder: 5, isActive: true },
];

export const DEFAULT_MODIFIER_GROUPS: ModifierGroup[] = [
  {
    id: 'mg_spice',
    outletId: 'main',
    name: 'Level Pedas',
    isRequired: true,
    minSelect: 1,
    maxSelect: 1,
    options: [
      { id: 'opt_spice_0', name: 'Tidak Pedas', extraPrice: 0, isActive: true },
      { id: 'opt_spice_1', name: 'Sedang', extraPrice: 0, isActive: true },
      { id: 'opt_spice_2', name: 'Pedas', extraPrice: 0, isActive: true },
      { id: 'opt_spice_3', name: 'Ekstra Pedas', extraPrice: 2000, isActive: true },
    ],
  },
  {
    id: 'mg_topping_food',
    outletId: 'main',
    name: 'Tambahan Lauk',
    isRequired: false,
    minSelect: 0,
    maxSelect: 3,
    options: [
      { id: 'opt_egg', name: 'Telur Ceplok / Dadar', extraPrice: 5000, isActive: true },
      { id: 'opt_sate', name: 'Ekstra Ayam Suwir', extraPrice: 8000, isActive: true },
      { id: 'opt_crackers', name: 'Kerupuk Kaleng', extraPrice: 3000, isActive: true },
    ],
  },
  {
    id: 'mg_drink_temp',
    outletId: 'main',
    name: 'Suhu & Ukuran',
    isRequired: true,
    minSelect: 1,
    maxSelect: 1,
    options: [
      { id: 'opt_iced_reg', name: 'Es Regular', extraPrice: 0, isActive: true },
      { id: 'opt_iced_lg', name: 'Es Large', extraPrice: 4000, isActive: true },
      { id: 'opt_hot', name: 'Panas / Hangat', extraPrice: 0, isActive: true },
    ],
  },
  {
    id: 'mg_drink_sugar',
    outletId: 'main',
    name: 'Takaran Gula',
    isRequired: false,
    minSelect: 0,
    maxSelect: 1,
    options: [
      { id: 'opt_sugar_normal', name: 'Gula Normal', extraPrice: 0, isActive: true },
      { id: 'opt_sugar_less', name: 'Less Sugar', extraPrice: 0, isActive: true },
      { id: 'opt_sugar_oat', name: 'Ganti Oat Milk', extraPrice: 6000, isActive: true },
    ],
  },
];

export const DEFAULT_PRODUCTS: Product[] = [
  {
    id: 'prod_nasgor',
    outletId: 'main',
    categoryId: 'cat_rice',
    name: 'Nasi Goreng Kampung Spesial',
    sku: 'NS-001',
    price: 32000,
    costPrice: 14500,
    iconType: 'rice',
    modifierGroupIds: ['mg_spice', 'mg_topping_food'],
    isAvailable: true,
    isActive: true,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'prod_ayambakar',
    outletId: 'main',
    categoryId: 'cat_rice',
    name: 'Ayam Bakar Madu + Nasi',
    sku: 'NS-002',
    price: 38000,
    costPrice: 17000,
    iconType: 'grill',
    modifierGroupIds: ['mg_spice', 'mg_topping_food'],
    isAvailable: true,
    isActive: true,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'prod_soto',
    outletId: 'main',
    categoryId: 'cat_rice',
    name: 'Soto Betawi Daging Kuah Santan',
    sku: 'NS-003',
    price: 42000,
    costPrice: 19000,
    iconType: 'soup',
    modifierGroupIds: ['mg_spice', 'mg_topping_food'],
    isAvailable: true,
    isActive: true,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'prod_rendang',
    outletId: 'main',
    categoryId: 'cat_rice',
    name: 'Nasi Rendang Sapi Minang',
    sku: 'NS-004',
    price: 45000,
    costPrice: 22000,
    iconType: 'rice',
    modifierGroupIds: ['mg_topping_food'],
    isAvailable: false,
    isActive: true,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'prod_bakmi',
    outletId: 'main',
    categoryId: 'cat_noodle',
    name: 'Bakmi Jawa Goreng Arang',
    sku: 'MJ-001',
    price: 30000,
    costPrice: 13000,
    iconType: 'noodle',
    modifierGroupIds: ['mg_spice', 'mg_topping_food'],
    isAvailable: true,
    isActive: true,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'prod_mieayam',
    outletId: 'main',
    categoryId: 'cat_noodle',
    name: 'Mie Ayam Jamur Pangsit',
    sku: 'MJ-002',
    price: 27000,
    costPrice: 11500,
    iconType: 'noodle',
    modifierGroupIds: ['mg_spice'],
    isAvailable: true,
    isActive: true,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'prod_kopisusu',
    outletId: 'main',
    categoryId: 'cat_coffee',
    name: 'Es Kopi Susu Gula Aren',
    sku: 'KP-001',
    price: 22000,
    costPrice: 7500,
    iconType: 'coffee',
    modifierGroupIds: ['mg_drink_temp', 'mg_drink_sugar'],
    isAvailable: true,
    isActive: true,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'prod_americano',
    outletId: 'main',
    categoryId: 'cat_coffee',
    name: 'Americano Arabika Gayo',
    sku: 'KP-002',
    price: 18000,
    costPrice: 5500,
    iconType: 'coffee',
    modifierGroupIds: ['mg_drink_temp'],
    isAvailable: true,
    isActive: true,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'prod_esteh',
    outletId: 'main',
    categoryId: 'cat_coffee',
    name: 'Teh Tarik Melati',
    sku: 'TH-001',
    price: 16000,
    costPrice: 4500,
    iconType: 'tea',
    modifierGroupIds: ['mg_drink_temp', 'mg_drink_sugar'],
    isAvailable: true,
    isActive: true,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'prod_jeruk',
    outletId: 'main',
    categoryId: 'cat_fresh',
    name: 'Es Jeruk Peras Murni',
    sku: 'MN-001',
    price: 15000,
    costPrice: 5000,
    iconType: 'juice',
    modifierGroupIds: ['mg_drink_temp'],
    isAvailable: true,
    isActive: true,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'prod_matcha',
    outletId: 'main',
    categoryId: 'cat_fresh',
    name: 'Matcha Latte Uji',
    sku: 'MN-002',
    price: 26000,
    costPrice: 9500,
    iconType: 'tea',
    modifierGroupIds: ['mg_drink_temp', 'mg_drink_sugar'],
    isAvailable: true,
    isActive: true,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'prod_pisgor',
    outletId: 'main',
    categoryId: 'cat_snack',
    name: 'Pisang Goreng Wijen Cokelat Keju',
    sku: 'CM-001',
    price: 18000,
    costPrice: 6500,
    iconType: 'dessert',
    modifierGroupIds: [],
    isAvailable: true,
    isActive: true,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
  },
  {
    id: 'prod_tahucrispy',
    outletId: 'main',
    categoryId: 'cat_snack',
    name: 'Tahu Cabe Garam Crispy',
    sku: 'CM-002',
    price: 17000,
    costPrice: 5500,
    iconType: 'snack',
    modifierGroupIds: ['mg_spice'],
    isAvailable: true,
    isActive: true,
    createdAt: '2026-11-01T08:00:00.000Z',
    updatedAt: '2026-11-01T08:00:00.000Z',
  },
];

export const DEFAULT_DISCOUNTS: Discount[] = [
  { id: 'disc_10', outletId: 'main', name: 'Promo Makan Siang 10%', type: 'percent', value: 10, isActive: true },
  { id: 'disc_15k', outletId: 'main', name: 'Voucher Hemat Rp 15.000', type: 'nominal', value: 15000, isActive: true },
];

export function buildSeedOperationalData(): {
  shifts: Shift[];
  orders: Order[];
  expenses: Expense[];
  auditLogs: AuditLog[];
} {
  const now = new Date();
  const makeDate = (daysAgo: number, wibHour: number, wibMin: number): string => {
    const d = new Date(now.getTime() - daysAgo * 86400000);
    const dk = getJakartaDateKey(d);
    const hh = String(wibHour).padStart(2, '0');
    const mm = String(wibMin).padStart(2, '0');
    return new Date(`${dk}T${hh}:${mm}:00+07:00`).toISOString();
  };

  const yesterdayShiftId = 'shift_seed_yesterday';
  const todayShiftId = 'shift_seed_today';

  const shifts: Shift[] = [
    {
      id: yesterdayShiftId,
      outletId: 'main',
      userId: 'staff_cashier_1',
      userName: 'Budi Santoso (Kasir)',
      openedAt: makeDate(1, 8, 5),
      closedAt: makeDate(1, 21, 30),
      openingCash: 300000,
      expectedCash: 470800,
      actualCash: 470000,
      cashDifference: -800,
      status: 'closed',
      note: 'Shift kemarin berjalan lancar, selisih receh Rp 800.',
    },
    {
      id: todayShiftId,
      outletId: 'main',
      userId: 'staff_owner',
      userName: 'Riyan (Owner)',
      openedAt: makeDate(0, 8, 0),
      openingCash: 500000,
      status: 'open',
      note: 'Modal awal laci kas pagi',
    },
  ];

  const expenses: Expense[] = [
    {
      id: 'exp_seed_1',
      outletId: 'main',
      shiftId: yesterdayShiftId,
      description: 'Beli es batu kristal 2 kantong',
      amount: 24000,
      createdBy: 'staff_cashier_1',
      createdByName: 'Budi Santoso (Kasir)',
      createdAt: makeDate(1, 13, 15),
    },
    {
      id: 'exp_seed_2',
      outletId: 'main',
      shiftId: todayShiftId,
      description: 'Gas LPG 3kg cadangan dapur',
      amount: 22000,
      createdBy: 'staff_owner',
      createdByName: 'Riyan (Owner)',
      createdAt: makeDate(0, 10, 20),
    },
  ];

  const sampleSpecs: Array<{
    daysAgo: number;
    hour: number;
    min: number;
    seq: number;
    product: Product;
    qty: number;
    secondProduct?: Product;
    method: 'cash' | 'qris' | 'transfer';
    orderType: 'dine_in' | 'takeaway' | 'delivery';
    table: string;
    cashierId: string;
    cashierName: string;
    shiftId: string;
    status?: Order['status'];
  }> = [
    { daysAgo: 5, hour: 12, min: 15, seq: 1, product: DEFAULT_PRODUCTS[0], qty: 2, secondProduct: DEFAULT_PRODUCTS[6], method: 'qris', orderType: 'dine_in', table: 'Meja 3', cashierId: 'staff_cashier_1', cashierName: 'Budi Santoso (Kasir)', shiftId: yesterdayShiftId },
    { daysAgo: 4, hour: 13, min: 10, seq: 1, product: DEFAULT_PRODUCTS[1], qty: 3, secondProduct: DEFAULT_PRODUCTS[9], method: 'cash', orderType: 'dine_in', table: 'Meja 1', cashierId: 'staff_cashier_1', cashierName: 'Budi Santoso (Kasir)', shiftId: yesterdayShiftId },
    { daysAgo: 3, hour: 19, min: 5, seq: 1, product: DEFAULT_PRODUCTS[4], qty: 2, secondProduct: DEFAULT_PRODUCTS[8], method: 'qris', orderType: 'takeaway', table: 'Andi', cashierId: 'staff_manager', cashierName: 'Dewi Lestari (Manajer)', shiftId: yesterdayShiftId },
    { daysAgo: 2, hour: 12, min: 40, seq: 1, product: DEFAULT_PRODUCTS[2], qty: 2, secondProduct: DEFAULT_PRODUCTS[6], method: 'cash', orderType: 'dine_in', table: 'Meja 5', cashierId: 'staff_cashier_1', cashierName: 'Budi Santoso (Kasir)', shiftId: yesterdayShiftId },
    { daysAgo: 2, hour: 18, min: 20, seq: 2, product: DEFAULT_PRODUCTS[0], qty: 3, secondProduct: DEFAULT_PRODUCTS[11], method: 'qris', orderType: 'delivery', table: 'Kurir Grab - Sinta', cashierId: 'staff_cashier_1', cashierName: 'Budi Santoso (Kasir)', shiftId: yesterdayShiftId },
    { daysAgo: 1, hour: 12, min: 5, seq: 1, product: DEFAULT_PRODUCTS[1], qty: 2, secondProduct: DEFAULT_PRODUCTS[6], method: 'cash', orderType: 'dine_in', table: 'Meja 2', cashierId: 'staff_cashier_1', cashierName: 'Budi Santoso (Kasir)', shiftId: yesterdayShiftId },
    { daysAgo: 1, hour: 12, min: 45, seq: 2, product: DEFAULT_PRODUCTS[4], qty: 2, secondProduct: DEFAULT_PRODUCTS[12], method: 'cash', orderType: 'takeaway', table: 'Pak Hendra', cashierId: 'staff_cashier_1', cashierName: 'Budi Santoso (Kasir)', shiftId: yesterdayShiftId },
    { daysAgo: 1, hour: 19, min: 15, seq: 3, product: DEFAULT_PRODUCTS[0], qty: 4, secondProduct: DEFAULT_PRODUCTS[10], method: 'qris', orderType: 'dine_in', table: 'Meja 4', cashierId: 'staff_cashier_1', cashierName: 'Budi Santoso (Kasir)', shiftId: yesterdayShiftId },
    { daysAgo: 0, hour: 9, min: 30, seq: 1, product: DEFAULT_PRODUCTS[6], qty: 2, secondProduct: DEFAULT_PRODUCTS[11], method: 'qris', orderType: 'takeaway', table: 'Rina', cashierId: 'staff_owner', cashierName: 'Riyan (Owner)', shiftId: todayShiftId },
    { daysAgo: 0, hour: 12, min: 10, seq: 2, product: DEFAULT_PRODUCTS[0], qty: 2, secondProduct: DEFAULT_PRODUCTS[9], method: 'cash', orderType: 'dine_in', table: 'Meja 1', cashierId: 'staff_owner', cashierName: 'Riyan (Owner)', shiftId: todayShiftId },
    { daysAgo: 0, hour: 12, min: 35, seq: 3, product: DEFAULT_PRODUCTS[1], qty: 1, secondProduct: DEFAULT_PRODUCTS[6], method: 'qris', orderType: 'dine_in', table: 'Meja 6', cashierId: 'staff_owner', cashierName: 'Riyan (Owner)', shiftId: todayShiftId, status: 'preparing' },
  ];

  const orders: Order[] = sampleSpecs.map((spec, idx) => {
    const createdAt = makeDate(spec.daysAgo, spec.hour, spec.min);
    const dk = getJakartaDateKey(new Date(createdAt));
    const items = [
      {
        id: `item_seed_${idx}_a`,
        productId: spec.product.id,
        productNameSnapshot: spec.product.name,
        unitPriceSnapshot: spec.product.price,
        costPriceSnapshot: spec.product.costPrice,
        categoryIdSnapshot: spec.product.categoryId,
        qty: spec.qty,
        note: '',
        modifiers: [],
        lineTotal: spec.product.price * spec.qty,
      },
    ];
    if (spec.secondProduct) {
      items.push({
        id: `item_seed_${idx}_b`,
        productId: spec.secondProduct.id,
        productNameSnapshot: spec.secondProduct.name,
        unitPriceSnapshot: spec.secondProduct.price,
        costPriceSnapshot: spec.secondProduct.costPrice,
        categoryIdSnapshot: spec.secondProduct.categoryId,
        qty: 1,
        note: '',
        modifiers: [],
        lineTotal: spec.secondProduct.price,
      });
    }
    const subtotal = items.reduce((s, it) => s + it.lineTotal, 0);
    const serviceAmount = Math.round(subtotal * 0.05);
    const taxAmount = Math.round((subtotal + serviceAmount) * 0.1);
    const total = subtotal + serviceAmount + taxAmount;
    const paidAmount = spec.method === 'cash' ? Math.ceil(total / 10000) * 10000 : total;
    const changeAmount = paidAmount - total;

    return {
      id: `ord_seed_${idx + 1}`,
      orderNumber: `${dk.replace(/-/g, '')}-${String(spec.seq).padStart(4, '0')}`,
      queueNumber: spec.seq,
      outletId: 'main',
      shiftId: spec.shiftId,
      userId: spec.cashierId,
      userName: spec.cashierName,
      orderType: spec.orderType,
      tableOrCustomerName: spec.table,
      status: spec.status || 'completed',
      items,
      subtotal,
      discountAmount: 0,
      taxAmount,
      serviceAmount,
      total,
      payments: [
        {
          id: `pay_seed_${idx + 1}`,
          method: spec.method,
          amount: paidAmount,
          reference: spec.method === 'qris' ? `QRIS-${1000 + idx}` : '',
          paidAt: createdAt,
          receivedBy: spec.cashierId,
        },
      ],
      paidAmount,
      changeAmount,
      note: '',
      createdAt,
      updatedAt: createdAt,
      completedAt: spec.status === 'preparing' ? undefined : createdAt,
      syncStatus: 'synced',
    };
  });

  const auditLogs: AuditLog[] = [
    {
      id: 'log_seed_1',
      outletId: 'main',
      userId: 'staff_owner',
      userName: 'Riyan (Owner)',
      action: 'OPEN_SHIFT',
      entity: 'shift',
      entityId: todayShiftId,
      detail: 'Membuka shift pagi dengan modal awal Rp 500.000',
      createdAt: makeDate(0, 8, 0),
    },
    {
      id: 'log_seed_2',
      outletId: 'main',
      userId: 'staff_manager',
      userName: 'Dewi Lestari (Manajer)',
      action: 'UPDATE_AVAILABILITY',
      entity: 'product',
      entityId: 'prod_rendang',
      detail: 'Menandai Nasi Rendang Sapi Minang sebagai Habis',
      createdAt: makeDate(0, 8, 30),
    },
  ];

  return { shifts, orders, expenses, auditLogs };
}
