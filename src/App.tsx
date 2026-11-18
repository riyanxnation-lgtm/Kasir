import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import {
  BarChart3,
  ChefHat,
  Clock,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu as MenuIcon,
  Settings,
  ShoppingBag,
  Store,
  Utensils,
  Wallet,
  X,
} from 'lucide-react';
import { DashboardView } from './components/admin/DashboardView';
import { MenuManagementView } from './components/admin/MenuManagementView';
import { ReportsView } from './components/admin/ReportsView';
import { SettingsView } from './components/admin/SettingsView';
import { LoginView } from './components/auth/LoginView';
import { ConnectivityBanner } from './components/common/ConnectivityBanner';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { PWAInstallButton } from './components/common/PWAInstallButton';
import { KitchenOrdersView } from './components/orders/KitchenOrdersView';
import { TransactionsView } from './components/orders/TransactionsView';
import { PaymentModal } from './components/pos/PaymentModal';
import { createCartItem, POSView } from './components/pos/POSView';
import { ReceiptModal } from './components/pos/ReceiptModal';
import { ShiftView } from './components/pos/ShiftModal';
import { auth, signOutFirebase, testFirestoreConnection } from './firebase/config';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import {
  deleteDocFromFirestore,
  flushPendingSyncOps,
  loadLocalPosState,
  saveLocalPosState,
  subscribeFirestoreCollections,
  writeDocToFirestore,
  type PosStoreState,
} from './services/posRepository';
import type {
  AppScreen,
  AuditLog,
  CartItem,
  Category,
  Discount,
  Expense,
  ModifierGroup,
  Order,
  OrderStatus,
  OrderType,
  OutletProfile,
  PaymentEntry,
  PendingSyncOp,
  Product,
  SelectedModifier,
  Shift,
  StaffUser,
} from './types/pos';
import {
  computeOrderTotals,
  generateOrderNumber,
  getJakartaDateKey,
  hashPinSync,
} from './utils/posCalculations';

function PosApplication() {
  const [store, setStore] = useState<PosStoreState>(() => loadLocalPosState());
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        const initial = loadLocalPosState();
        return initial.users.find((u) => u.role === 'owner' && u.isActive) || initial.users[0] || null;
      }
    }
    return null;
  });

  const [activeScreen, setActiveScreen] = useState<AppScreen>('pos');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Theme & Accessibility preferences
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('dk_dark_mode') === '1';
  });
  const [largeFont, setLargeFont] = useState<boolean>(() => {
    return localStorage.getItem('dk_large_font') === '1';
  });

  // Active POS Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('dine_in');
  const [tableOrCustomerName, setTableOrCustomerName] = useState('');
  const [selectedDiscountId, setSelectedDiscountId] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [resumedHoldOrderId, setResumedHoldOrderId] = useState<string | null>(null);

  // Modals
  const [paymentTotal, setPaymentTotal] = useState<number | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);

  // Connectivity & Sync
  const isOnline = useOnlineStatus();
  const [isCloudSignedIn, setIsCloudSignedIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [firestoreFatalError, setFirestoreFatalError] = useState<Error | null>(null);

  if (firestoreFatalError) {
    throw firestoreFatalError;
  }

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('dk_dark_mode', darkMode ? '1' : '0');
  }, [darkMode]);

  useEffect(() => {
    document.documentElement.classList.toggle('font-large', largeFont);
    localStorage.setItem('dk_large_font', largeFont ? '1' : '0');
  }, [largeFont]);

  // Persist local state whenever store changes
  useEffect(() => {
    saveLocalPosState(store);
  }, [store]);

  // Startup Firestore connection check
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Firebase Auth listener & real-time Firestore subscription
  useEffect(() => {
    let unsubFirestore: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, (fbUser) => {
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }
      const verified = Boolean(fbUser && fbUser.emailVerified);
      setIsCloudSignedIn(verified);
      if (verified) {
        unsubFirestore = subscribeFirestoreCollections(
          (partial) => {
            setStore((prev) => ({ ...prev, ...partial }));
          },
          (err) => setFirestoreFatalError(err)
        );
      }
    });
    return () => {
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  const handleSyncNow = useCallback(async () => {
    if (!isOnline || store.pendingOps.length === 0) return;
    setIsSyncing(true);
    try {
      const { flushedIds, remaining } = await flushPendingSyncOps(store.pendingOps);
      if (flushedIds.length > 0) {
        setStore((prev) => ({
          ...prev,
          pendingOps: remaining,
          orders: prev.orders.map((o) =>
            flushedIds.some((fid) => fid.includes(o.id)) ? { ...o, syncStatus: 'synced' } : o
          ),
          lastSyncedAt: new Date().toISOString(),
        }));
      }
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, store.pendingOps]);

  useEffect(() => {
    if (isOnline && store.pendingOps.length > 0 && auth.currentUser?.emailVerified) {
      handleSyncNow();
    }
  }, [isOnline, store.pendingOps.length, handleSyncNow]);

  const syncMutation = useCallback(
    async (collectionName: string, docId: string, payload: Record<string, unknown>) => {
      const synced = await writeDocToFirestore(collectionName, docId, payload);
      if (!synced) {
        const op: PendingSyncOp = {
          id: `op_${collectionName}_${docId}_${Date.now()}`,
          collectionName,
          docId,
          operation: 'set',
          payload,
          createdAt: new Date().toISOString(),
        };
        setStore((prev) => ({
          ...prev,
          pendingOps: [
            ...prev.pendingOps.filter((p) => !(p.collectionName === collectionName && p.docId === docId)),
            op,
          ],
        }));
      }
    },
    []
  );

  const syncDelete = useCallback(async (collectionName: string, docId: string) => {
    const synced = await deleteDocFromFirestore(collectionName, docId);
    if (!synced) {
      const op: PendingSyncOp = {
        id: `del_${collectionName}_${docId}_${Date.now()}`,
        collectionName,
        docId,
        operation: 'delete',
        createdAt: new Date().toISOString(),
      };
      setStore((prev) => ({
        ...prev,
        pendingOps: [...prev.pendingOps, op],
      }));
    }
  }, []);

  const recordAudit = useCallback(
    (action: string, entity: string, entityId: string, detail: string, actor?: StaffUser) => {
      const user = actor || currentUser;
      if (!user) return;
      const log: AuditLog = {
        id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
        outletId: 'main',
        userId: user.id,
        userName: user.name,
        action,
        entity,
        entityId,
        detail,
        createdAt: new Date().toISOString(),
      };
      setStore((prev) => ({ ...prev, auditLogs: [log, ...prev.auditLogs] }));
      syncMutation('auditLogs', log.id, log as unknown as Record<string, unknown>);
    },
    [currentUser, syncMutation]
  );

  // Active shift for outlet
  const activeShift = useMemo(
    () => store.shifts.find((s) => s.status === 'open') || null,
    [store.shifts]
  );

  const heldOrdersCount = useMemo(
    () => store.orders.filter((o) => o.status === 'hold').length,
    [store.orders]
  );

  const activeKitchenCount = useMemo(
    () => store.orders.filter((o) => o.status === 'new' || o.status === 'preparing' || o.status === 'ready').length,
    [store.orders]
  );

  // Firebase Auth handler
  const handleFirebaseAuthSuccess = async (email: string, displayName: string, uid: string) => {
    const existing = store.users.find((u) => u.email.toLowerCase() === email.toLowerCase() || u.id === uid);
    if (existing) {
      setCurrentUser(existing);
      setActiveScreen(existing.role === 'owner' ? 'dashboard' : 'pos');
      return;
    }
    const now = new Date().toISOString();
    const isBootstrap = email.toLowerCase() === 'riyanxnation@gmail.com';
    const newStaff: StaffUser = {
      id: uid,
      outletId: 'main',
      name: displayName,
      email,
      role: isBootstrap ? 'owner' : 'cashier',
      pinHash: hashPinSync('1234'),
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
    setStore((prev) => ({ ...prev, users: [...prev.users, newStaff] }));
    setCurrentUser(newStaff);
    setActiveScreen(newStaff.role === 'owner' ? 'dashboard' : 'pos');
    await syncMutation('users', newStaff.id, newStaff as unknown as Record<string, unknown>);
  };

  // Cart handlers
  const handleAddCartItem = (
    product: Product,
    qty: number,
    note: string,
    modifiers: SelectedModifier[]
  ) => {
    setCart((prev) => {
      const modKey = modifiers.map((m) => m.modifierOptionId).sort().join(',');
      const idx = prev.findIndex(
        (it) =>
          it.productId === product.id &&
          it.note === note &&
          it.modifiers.map((m) => m.modifierOptionId).sort().join(',') === modKey
      );
      if (idx >= 0) {
        const next = [...prev];
        const updatedQty = next[idx].qty + qty;
        next[idx] = createCartItem(product, updatedQty, note, modifiers);
        return next;
      }
      return [...prev, createCartItem(product, qty, note, modifiers)];
    });
  };

  const handleUpdateCartItemQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((it) => {
          if (it.id !== itemId) return it;
          const nextQty = it.qty + delta;
          if (nextQty <= 0) return null;
          const modExtra = it.modifiers.reduce((s, m) => s + m.extraPriceSnapshot, 0);
          return {
            ...it,
            qty: nextQty,
            lineTotal: Math.round((it.unitPriceSnapshot + modExtra) * nextQty),
          };
        })
        .filter((x): x is CartItem => x !== null)
    );
  };

  const handleUpdateCartItemNote = (itemId: string, note: string) => {
    setCart((prev) => prev.map((it) => (it.id === itemId ? { ...it, note } : it)));
  };

  const handleRemoveCartItem = (itemId: string) => {
    setCart((prev) => prev.filter((it) => it.id !== itemId));
  };

  const resetCart = () => {
    setCart([]);
    setTableOrCustomerName('');
    setSelectedDiscountId('');
    setOrderNote('');
    setResumedHoldOrderId(null);
  };

  const buildOrderObject = (
    status: OrderStatus,
    payments: PaymentEntry[],
    paidAmount: number,
    changeAmount: number
  ): Order => {
    const now = new Date().toISOString();
    const todayKey = getJakartaDateKey(new Date());
    const todayOrders = store.orders.filter(
      (o) => getJakartaDateKey(new Date(o.createdAt)) === todayKey && o.status !== 'hold'
    );
    const nextSeq = todayOrders.length + 1;
    const discount = store.discounts.find((d) => d.id === selectedDiscountId) || null;
    const totals = computeOrderTotals({
      items: cart,
      discount,
      taxPercent: store.outlet.taxPercent,
      serviceChargePercent: store.outlet.serviceChargePercent,
    });

    const isSynced = Boolean(isOnline && auth.currentUser?.emailVerified);

    return {
      id: resumedHoldOrderId || `ord_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      orderNumber: generateOrderNumber(todayKey, nextSeq),
      queueNumber: nextSeq,
      outletId: 'main',
      shiftId: activeShift?.id || 'shift_default',
      userId: currentUser!.id,
      userName: currentUser!.name,
      orderType,
      tableOrCustomerName: tableOrCustomerName.trim(),
      status,
      items: cart,
      subtotal: totals.subtotal,
      discountId: discount?.id || '',
      discountName: totals.discountName,
      discountAmount: totals.discountAmount,
      taxAmount: totals.taxAmount,
      serviceAmount: totals.serviceAmount,
      total: totals.total,
      payments,
      paidAmount,
      changeAmount,
      note: orderNote.trim(),
      createdAt: now,
      updatedAt: now,
      completedAt: status === 'completed' ? now : undefined,
      syncStatus: isSynced ? 'synced' : 'pending',
    };
  };

  const handleHoldOrder = () => {
    if (!currentUser || !activeShift || cart.length === 0) return;
    const heldOrder = buildOrderObject('hold', [], 0, 0);
    setStore((prev) => ({
      ...prev,
      orders: [heldOrder, ...prev.orders.filter((o) => o.id !== heldOrder.id)],
    }));
    syncMutation('orders', heldOrder.id, heldOrder as unknown as Record<string, unknown>);
    resetCart();
  };

  const handleResumeHoldOrder = (order: Order) => {
    setCart(order.items);
    setOrderType(order.orderType);
    setTableOrCustomerName(order.tableOrCustomerName || '');
    setSelectedDiscountId(order.discountId || '');
    setOrderNote(order.note || '');
    setResumedHoldOrderId(order.id);
    setActiveScreen('pos');
  };

  const handleConfirmPayment = async (
    payments: PaymentEntry[],
    paidAmount: number,
    changeAmount: number
  ) => {
    if (!currentUser || !activeShift || cart.length === 0) return;
    const newOrder = buildOrderObject('new', payments, paidAmount, changeAmount);
    setStore((prev) => ({
      ...prev,
      orders: [newOrder, ...prev.orders.filter((o) => o.id !== newOrder.id)],
    }));
    setPaymentTotal(null);
    resetCart();
    setReceiptOrder(newOrder);
    await syncMutation('orders', newOrder.id, newOrder as unknown as Record<string, unknown>);
  };

  const handleUpdateOrderStatus = async (orderId: string, nextStatus: OrderStatus) => {
    const now = new Date().toISOString();
    let updatedOrder: Order | undefined;
    setStore((prev) => ({
      ...prev,
      orders: prev.orders.map((o) => {
        if (o.id !== orderId) return o;
        updatedOrder = {
          ...o,
          status: nextStatus,
          updatedAt: now,
          completedAt: nextStatus === 'completed' ? now : o.completedAt,
        };
        return updatedOrder;
      }),
    }));
    if (updatedOrder) {
      await syncMutation('orders', orderId, updatedOrder as unknown as Record<string, unknown>);
    }
  };

  const handleVoidOrder = async (orderId: string, reason: string, authorizedBy: StaffUser) => {
    const now = new Date().toISOString();
    let voided: Order | undefined;
    setStore((prev) => ({
      ...prev,
      orders: prev.orders.map((o) => {
        if (o.id !== orderId) return o;
        voided = {
          ...o,
          status: 'void',
          voidReason: reason,
          voidBy: authorizedBy.id,
          updatedAt: now,
        };
        return voided;
      }),
    }));
    if (voided) {
      await syncMutation('orders', orderId, voided as unknown as Record<string, unknown>);
      recordAudit(
        'VOID_ORDER',
        'order',
        orderId,
        `Void transaksi ${(voided as Order).orderNumber} (Alasan: ${reason}) oleh otorisasi ${authorizedBy.name}`,
        authorizedBy
      );
    }
  };

  // Shift Handlers
  const handleOpenShift = async (openingCash: number, note: string) => {
    if (!currentUser) return;
    const shift: Shift = {
      id: `shift_${Date.now()}`,
      outletId: 'main',
      userId: currentUser.id,
      userName: currentUser.name,
      openedAt: new Date().toISOString(),
      openingCash,
      status: 'open',
      note,
    };
    setStore((prev) => ({ ...prev, shifts: [shift, ...prev.shifts] }));
    await syncMutation('shifts', shift.id, shift as unknown as Record<string, unknown>);
    recordAudit('OPEN_SHIFT', 'shift', shift.id, `Membuka shift dengan modal awal Rp ${openingCash.toLocaleString('id-ID')}`);
  };

  const handleCloseShift = async (
    shiftId: string,
    actualCash: number,
    expectedCash: number,
    note: string
  ) => {
    const now = new Date().toISOString();
    const diff = Math.round(actualCash - expectedCash);
    let closed: Shift | undefined;
    setStore((prev) => ({
      ...prev,
      shifts: prev.shifts.map((s) => {
        if (s.id !== shiftId) return s;
        closed = {
          ...s,
          closedAt: now,
          expectedCash,
          actualCash,
          cashDifference: diff,
          status: 'closed',
          note: note || s.note,
        };
        return closed;
      }),
    }));
    if (closed) {
      await syncMutation('shifts', shiftId, closed as unknown as Record<string, unknown>);
      recordAudit('CLOSE_SHIFT', 'shift', shiftId, `Menutup shift. Kas aktual Rp ${actualCash.toLocaleString('id-ID')}, selisih Rp ${diff.toLocaleString('id-ID')}`);
    }
  };

  const handleAddExpense = async (shiftId: string, description: string, amount: number) => {
    if (!currentUser) return;
    const expense: Expense = {
      id: `exp_${Date.now()}`,
      outletId: 'main',
      shiftId,
      description,
      amount,
      createdBy: currentUser.id,
      createdByName: currentUser.name,
      createdAt: new Date().toISOString(),
    };
    setStore((prev) => ({ ...prev, expenses: [expense, ...prev.expenses] }));
    await syncMutation('expenses', expense.id, expense as unknown as Record<string, unknown>);
  };

  // Menu & Settings CRUD handlers
  const handleSaveCategory = async (cat: Category) => {
    setStore((prev) => ({
      ...prev,
      categories: prev.categories.some((c) => c.id === cat.id)
        ? prev.categories.map((c) => (c.id === cat.id ? cat : c))
        : [...prev.categories, cat],
    }));
    await syncMutation('categories', cat.id, cat as unknown as Record<string, unknown>);
  };

  const handleDeleteCategory = async (id: string) => {
    setStore((prev) => ({ ...prev, categories: prev.categories.filter((c) => c.id !== id) }));
    await syncDelete('categories', id);
  };

  const handleSaveProduct = async (prod: Product) => {
    const existing = store.products.find((p) => p.id === prod.id);
    setStore((prev) => ({
      ...prev,
      products: existing
        ? prev.products.map((p) => (p.id === prod.id ? prod : p))
        : [prod, ...prev.products],
    }));
    await syncMutation('products', prod.id, prod as unknown as Record<string, unknown>);
    if (existing && existing.price !== prod.price) {
      recordAudit('UPDATE_PRICE', 'product', prod.id, `Ubah harga ${prod.name}: Rp ${existing.price} -> Rp ${prod.price}`);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    setStore((prev) => ({ ...prev, products: prev.products.filter((p) => p.id !== id) }));
    await syncDelete('products', id);
  };

  const handleSaveModifierGroup = async (group: ModifierGroup) => {
    setStore((prev) => ({
      ...prev,
      modifierGroups: prev.modifierGroups.some((g) => g.id === group.id)
        ? prev.modifierGroups.map((g) => (g.id === group.id ? group : g))
        : [...prev.modifierGroups, group],
    }));
    await syncMutation('modifierGroups', group.id, group as unknown as Record<string, unknown>);
  };

  const handleDeleteModifierGroup = async (id: string) => {
    setStore((prev) => ({
      ...prev,
      modifierGroups: prev.modifierGroups.filter((g) => g.id !== id),
    }));
    await syncDelete('modifierGroups', id);
  };

  const handleSaveDiscount = async (disc: Discount) => {
    setStore((prev) => ({
      ...prev,
      discounts: prev.discounts.some((d) => d.id === disc.id)
        ? prev.discounts.map((d) => (d.id === disc.id ? disc : d))
        : [...prev.discounts, disc],
    }));
    await syncMutation('discounts', disc.id, disc as unknown as Record<string, unknown>);
  };

  const handleImportMenu = async (newCategories: Category[], newProducts: Product[]) => {
    setStore((prev) => ({
      ...prev,
      categories: [...prev.categories, ...newCategories],
      products: [...newProducts, ...prev.products],
    }));
    for (const c of newCategories) {
      await syncMutation('categories', c.id, c as unknown as Record<string, unknown>);
    }
    for (const p of newProducts) {
      await syncMutation('products', p.id, p as unknown as Record<string, unknown>);
    }
    recordAudit('IMPORT_MENU', 'product', 'batch', `Impor ${newProducts.length} produk dan ${newCategories.length} kategori`);
  };

  const handleSaveOutlet = async (updated: OutletProfile) => {
    setStore((prev) => ({ ...prev, outlet: updated }));
    await syncMutation('outlet', updated.id, updated as unknown as Record<string, unknown>);
    recordAudit('UPDATE_OUTLET', 'outlet', updated.id, 'Memperbarui profil dan pengaturan pajak outlet');
  };

  const handleSaveUser = async (u: StaffUser) => {
    setStore((prev) => ({
      ...prev,
      users: prev.users.some((x) => x.id === u.id)
        ? prev.users.map((x) => (x.id === u.id ? u : x))
        : [...prev.users, u],
    }));
    await syncMutation('users', u.id, u as unknown as Record<string, unknown>);
    recordAudit('UPSERT_USER', 'user', u.id, `Menyimpan akun staf ${u.name} (${u.role})`);
  };

  const handleDeleteUser = async (userId: string) => {
    setStore((prev) => ({ ...prev, users: prev.users.filter((u) => u.id !== userId) }));
    await syncDelete('users', userId);
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    setMobileNavOpen(false);
    try {
      await signOutFirebase();
    } catch {
      // Ignore if logged in via device PIN only
    }
  };

  if (!currentUser) {
    return (
      <LoginView
        outlet={store.outlet}
        users={store.users}
        onPinLogin={(staff) => {
          setCurrentUser(staff);
          setActiveScreen('pos');
        }}
        onFirebaseAuthSuccess={handleFirebaseAuthSuccess}
      />
    );
  }

  // Role-gated navigation items (Cashier cannot see Dashboard, Reports, or Menu Pricing)
  const canManage = currentUser.role === 'owner' || currentUser.role === 'manager';

  const navItems: Array<{
    id: AppScreen;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'pos', label: 'Kasir (POS)', icon: ShoppingBag },
    { id: 'orders', label: 'Pesanan', icon: ChefHat, badge: activeKitchenCount + heldOrdersCount },
    { id: 'history', label: 'Riwayat', icon: Clock },
    { id: 'shift', label: 'Shift & Kas', icon: Wallet },
    ...(canManage
      ? [
          { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
          { id: 'reports' as const, label: 'Laporan', icon: BarChart3 },
          { id: 'menu' as const, label: 'Kelola Menu', icon: Utensils },
        ]
      : []),
    { id: 'settings', label: 'Pengaturan', icon: Settings },
  ];

  // Ensure cashier cannot land on restricted screen
  const effectiveScreen: AppScreen =
    !canManage && (activeScreen === 'dashboard' || activeScreen === 'reports' || activeScreen === 'menu')
      ? 'pos'
      : activeScreen;

  const mobileTabItems = navItems.slice(0, 4);

  return (
    <div className="h-screen flex flex-col bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 overflow-hidden">
      <ConnectivityBanner
        isOnline={isOnline}
        isCloudSignedIn={isCloudSignedIn}
        pendingCount={store.pendingOps.length}
        isSyncing={isSyncing}
        onSyncNow={handleSyncNow}
      />

      {/* Mobile Compact Top Header (< lg) */}
      <header className="lg:hidden h-[52px] shrink-0 px-4 border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-orange-600 text-white flex items-center justify-center shrink-0">
            <Store className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold truncate">{store.outlet.name}</span>
        </div>
        <button
          type="button"
          aria-label="Buka menu navigasi"
          onClick={() => setMobileNavOpen(true)}
          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-stone-200 dark:border-stone-700"
        >
          <MenuIcon className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Desktop Slim Sidebar */}
        <aside
          aria-label="Navigasi Utama"
          className="hidden lg:flex lg:w-56 xl:w-60 shrink-0 border-r border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 flex-col justify-between p-3"
        >
          <div className="space-y-4 overflow-y-auto">
            <div className="px-2 py-1.5 flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight truncate">DapurKasir</p>
                <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                  {store.outlet.name}
                </p>
              </div>
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = effectiveScreen === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveScreen(item.id)}
                    className={`w-full min-h-[44px] px-3 rounded-xl flex items-center justify-between gap-2 text-xs font-semibold transition-colors ${
                      active
                        ? 'bg-orange-600 text-white'
                        : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    <span className="flex items-center gap-2.5 whitespace-nowrap">
                      <Icon className="w-4 h-4 shrink-0" />
                      {item.label}
                    </span>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums ${
                          active
                            ? 'bg-white/20 text-white'
                            : 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="space-y-2.5 pt-3 border-t border-stone-200 dark:border-stone-800">
            <PWAInstallButton />

            <div className="px-2 py-1.5 rounded-xl bg-stone-50 dark:bg-stone-800/70 space-y-0.5">
              <p className="text-xs font-bold truncate">{currentUser.name}</p>
              <p className="text-[11px] text-stone-500 dark:text-stone-400 capitalize">
                {currentUser.role === 'owner' ? 'Owner' : currentUser.role === 'manager' ? 'Manajer' : 'Kasir'}
                {' · '}
                {activeShift ? 'Shift Buka' : 'Shift Tutup'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full min-h-[42px] px-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Keluar / Ganti Kasir
            </button>
          </div>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 min-w-0 overflow-y-auto pb-16 lg:pb-0">
          {effectiveScreen === 'pos' && (
            <POSView
              outlet={store.outlet}
              categories={store.categories}
              products={store.products}
              modifierGroups={store.modifierGroups}
              discounts={store.discounts}
              activeShift={activeShift}
              heldOrdersCount={heldOrdersCount}
              cart={cart}
              orderType={orderType}
              tableOrCustomerName={tableOrCustomerName}
              selectedDiscountId={selectedDiscountId}
              orderNote={orderNote}
              onSetOrderType={setOrderType}
              onSetTableOrCustomerName={setTableOrCustomerName}
              onSetSelectedDiscountId={setSelectedDiscountId}
              onSetOrderNote={setOrderNote}
              onAddCartItem={handleAddCartItem}
              onUpdateCartItemQty={handleUpdateCartItemQty}
              onUpdateCartItemNote={handleUpdateCartItemNote}
              onRemoveCartItem={handleRemoveCartItem}
              onClearCart={resetCart}
              onHoldOrder={handleHoldOrder}
              onOpenPayment={(total) => setPaymentTotal(total)}
              onGoToShift={() => setActiveScreen('shift')}
              onGoToHoldOrders={() => setActiveScreen('orders')}
            />
          )}

          {effectiveScreen === 'orders' && (
            <KitchenOrdersView
              orders={store.orders}
              onResumeHoldOrder={handleResumeHoldOrder}
              onUpdateOrderStatus={handleUpdateOrderStatus}
            />
          )}

          {effectiveScreen === 'history' && (
            <TransactionsView
              orders={store.orders}
              users={store.users}
              currentUser={currentUser}
              onSelectReceipt={(ord) => setReceiptOrder(ord)}
              onVoidOrder={handleVoidOrder}
            />
          )}

          {effectiveScreen === 'shift' && (
            <ShiftView
              activeShift={activeShift}
              shifts={store.shifts}
              orders={store.orders}
              expenses={store.expenses}
              currentUser={currentUser}
              onOpenShift={handleOpenShift}
              onCloseShift={handleCloseShift}
              onAddExpense={handleAddExpense}
            />
          )}

          {effectiveScreen === 'dashboard' && canManage && (
            <DashboardView
              orders={store.orders}
              products={store.products}
              categories={store.categories}
              onGoToReports={() => setActiveScreen('reports')}
            />
          )}

          {effectiveScreen === 'reports' && canManage && (
            <ReportsView
              outlet={store.outlet}
              orders={store.orders}
              products={store.products}
              categories={store.categories}
              shifts={store.shifts}
              auditLogs={store.auditLogs}
            />
          )}

          {effectiveScreen === 'menu' && canManage && (
            <MenuManagementView
              categories={store.categories}
              products={store.products}
              modifierGroups={store.modifierGroups}
              discounts={store.discounts}
              onSaveCategory={handleSaveCategory}
              onDeleteCategory={handleDeleteCategory}
              onSaveProduct={handleSaveProduct}
              onDeleteProduct={handleDeleteProduct}
              onSaveModifierGroup={handleSaveModifierGroup}
              onDeleteModifierGroup={handleDeleteModifierGroup}
              onSaveDiscount={handleSaveDiscount}
              onImportMenu={handleImportMenu}
            />
          )}

          {effectiveScreen === 'settings' && (
            <SettingsView
              outlet={store.outlet}
              users={store.users}
              currentUser={currentUser}
              darkMode={darkMode}
              largeFont={largeFont}
              isCloudSignedIn={isCloudSignedIn}
              pendingSyncCount={store.pendingOps.length}
              onToggleDarkMode={() => setDarkMode((d) => !d)}
              onToggleLargeFont={() => setLargeFont((f) => !f)}
              onSaveOutlet={handleSaveOutlet}
              onSaveUser={handleSaveUser}
              onDeleteUser={handleDeleteUser}
            />
          )}
        </main>
      </div>

      {/* Mobile Bottom Tab Bar (< lg) */}
      <nav
        aria-label="Navigasi Bawah"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-30 h-16 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 grid grid-cols-4 items-center px-1"
      >
        {mobileTabItems.map((item) => {
          const Icon = item.icon;
          const active = effectiveScreen === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveScreen(item.id)}
              className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-semibold ${
                active ? 'text-orange-600 dark:text-orange-400' : 'text-stone-500 dark:text-stone-400'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="truncate max-w-full px-1">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Mobile Full Navigation Drawer */}
      {mobileNavOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 flex">
          <div className="w-72 max-w-[85vw] bg-white dark:bg-stone-900 h-full p-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-600" />
                  <span className="font-bold text-sm">Menu Navigasi</span>
                </div>
                <button
                  type="button"
                  aria-label="Tutup menu navigasi"
                  onClick={() => setMobileNavOpen(false)}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = effectiveScreen === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveScreen(item.id);
                        setMobileNavOpen(false);
                      }}
                      className={`w-full min-h-[46px] px-3 rounded-xl flex items-center gap-3 text-xs font-semibold ${
                        active
                          ? 'bg-orange-600 text-white'
                          : 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-stone-200 dark:border-stone-800">
              <PWAInstallButton />
              <button
                type="button"
                onClick={handleLogout}
                className="w-full min-h-[44px] rounded-xl border border-stone-200 dark:border-stone-700 text-xs font-semibold flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Keluar ({currentUser.name})
              </button>
            </div>
          </div>
          <button
            type="button"
            aria-label="Tutup laci navigasi"
            onClick={() => setMobileNavOpen(false)}
            className="flex-1"
          />
        </div>
      )}

      {/* Payment Modal */}
      {paymentTotal !== null && currentUser && (
        <PaymentModal
          total={paymentTotal}
          outlet={store.outlet}
          cashierId={currentUser.id}
          onClose={() => setPaymentTotal(null)}
          onConfirmPayment={handleConfirmPayment}
        />
      )}

      {/* Receipt Modal */}
      {receiptOrder && (
        <ReceiptModal
          order={receiptOrder}
          outlet={store.outlet}
          onClose={() => setReceiptOrder(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <PosApplication />
    </ErrorBoundary>
  );
}
