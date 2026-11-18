export type UserRole = 'owner' | 'manager' | 'cashier';

export type OrderType = 'dine_in' | 'takeaway' | 'delivery';

export type OrderStatus =
  | 'hold'
  | 'new'
  | 'preparing'
  | 'ready'
  | 'completed'
  | 'cancelled'
  | 'void';

export type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'ewallet';

export type SyncStatus = 'synced' | 'pending';

export type ProductIconType =
  | 'rice'
  | 'noodle'
  | 'grill'
  | 'soup'
  | 'coffee'
  | 'tea'
  | 'juice'
  | 'snack'
  | 'dessert';

export interface OutletProfile {
  id: string;
  name: string;
  address: string;
  phone: string;
  npwp: string;
  operatingHours: string;
  taxPercent: number;
  serviceChargePercent: number;
  receiptHeader: string;
  receiptFooter: string;
  qrisMerchantName: string;
  qrisImageUrl: string;
  timezone: string;
  currency: string;
  updatedAt: string;
}

export interface StaffUser {
  id: string;
  outletId: string;
  name: string;
  email: string;
  role: UserRole;
  pinHash: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  outletId: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
}

export interface ModifierOption {
  id: string;
  name: string;
  extraPrice: number;
  isActive: boolean;
}

export interface ModifierGroup {
  id: string;
  outletId: string;
  name: string;
  isRequired: boolean;
  minSelect: number;
  maxSelect: number;
  options: ModifierOption[];
}

export interface Product {
  id: string;
  outletId: string;
  categoryId: string;
  name: string;
  sku: string;
  price: number;
  costPrice: number;
  iconType: ProductIconType;
  modifierGroupIds: string[];
  isAvailable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Discount {
  id: string;
  outletId: string;
  name: string;
  type: 'percent' | 'nominal';
  value: number;
  isActive: boolean;
}

export interface SelectedModifier {
  modifierOptionId: string;
  groupName: string;
  nameSnapshot: string;
  extraPriceSnapshot: number;
}

export interface CartItem {
  id: string;
  productId: string;
  productNameSnapshot: string;
  unitPriceSnapshot: number;
  costPriceSnapshot: number;
  categoryIdSnapshot: string;
  qty: number;
  note: string;
  modifiers: SelectedModifier[];
  lineTotal: number;
}

export interface PaymentEntry {
  id: string;
  method: PaymentMethod;
  amount: number;
  reference: string;
  paidAt: string;
  receivedBy: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  queueNumber: number;
  outletId: string;
  shiftId: string;
  userId: string;
  userName: string;
  orderType: OrderType;
  tableOrCustomerName: string;
  status: OrderStatus;
  items: CartItem[];
  subtotal: number;
  discountId?: string;
  discountName?: string;
  discountAmount: number;
  taxAmount: number;
  serviceAmount: number;
  total: number;
  payments: PaymentEntry[];
  paidAmount: number;
  changeAmount: number;
  note: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  voidReason?: string;
  voidBy?: string;
  syncStatus: SyncStatus;
}

export interface Shift {
  id: string;
  outletId: string;
  userId: string;
  userName: string;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  expectedCash?: number;
  actualCash?: number;
  cashDifference?: number;
  status: 'open' | 'closed';
  note: string;
}

export interface Expense {
  id: string;
  outletId: string;
  shiftId: string;
  description: string;
  amount: number;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  outletId: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  detail: string;
  createdAt: string;
}

export interface PendingSyncOp {
  id: string;
  collectionName: string;
  docId: string;
  operation: 'set' | 'delete';
  payload?: Record<string, unknown>;
  createdAt: string;
}

export type AppScreen =
  | 'pos'
  | 'orders'
  | 'history'
  | 'shift'
  | 'dashboard'
  | 'reports'
  | 'menu'
  | 'settings';
