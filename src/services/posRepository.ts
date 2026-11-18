import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  type Unsubscribe,
} from 'firebase/firestore';
import {
  DEFAULT_CATEGORIES,
  DEFAULT_DISCOUNTS,
  DEFAULT_MODIFIER_GROUPS,
  DEFAULT_OUTLET,
  DEFAULT_PRODUCTS,
  DEFAULT_USERS,
  buildSeedOperationalData,
} from '../data/seedData';
import { auth, db, handleFirestoreError, OperationType } from '../firebase/config';
import type {
  AuditLog,
  Category,
  Discount,
  Expense,
  ModifierGroup,
  Order,
  OutletProfile,
  PendingSyncOp,
  Product,
  Shift,
  StaffUser,
} from '../types/pos';

const STORAGE_KEY = 'dapurkasir_pos_state_v1';

export interface PosStoreState {
  outlet: OutletProfile;
  users: StaffUser[];
  categories: Category[];
  products: Product[];
  modifierGroups: ModifierGroup[];
  discounts: Discount[];
  shifts: Shift[];
  expenses: Expense[];
  orders: Order[];
  auditLogs: AuditLog[];
  pendingOps: PendingSyncOp[];
  lastSyncedAt: string | null;
}

function createInitialState(): PosStoreState {
  const ops = buildSeedOperationalData();
  return {
    outlet: DEFAULT_OUTLET,
    users: DEFAULT_USERS,
    categories: DEFAULT_CATEGORIES,
    products: DEFAULT_PRODUCTS,
    modifierGroups: DEFAULT_MODIFIER_GROUPS,
    discounts: DEFAULT_DISCOUNTS,
    shifts: ops.shifts,
    expenses: ops.expenses,
    orders: ops.orders,
    auditLogs: ops.auditLogs,
    pendingOps: [],
    lastSyncedAt: null,
  };
}

export function loadLocalPosState(): PosStoreState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const initial = createInitialState();
      saveLocalPosState(initial);
      return initial;
    }
    const parsed = JSON.parse(raw) as Partial<PosStoreState>;
    const fallback = createInitialState();
    return {
      outlet: parsed.outlet || fallback.outlet,
      users: Array.isArray(parsed.users) && parsed.users.length > 0 ? parsed.users : fallback.users,
      categories: Array.isArray(parsed.categories) && parsed.categories.length > 0 ? parsed.categories : fallback.categories,
      products: Array.isArray(parsed.products) && parsed.products.length > 0 ? parsed.products : fallback.products,
      modifierGroups: Array.isArray(parsed.modifierGroups) ? parsed.modifierGroups : fallback.modifierGroups,
      discounts: Array.isArray(parsed.discounts) ? parsed.discounts : fallback.discounts,
      shifts: Array.isArray(parsed.shifts) ? parsed.shifts : fallback.shifts,
      expenses: Array.isArray(parsed.expenses) ? parsed.expenses : fallback.expenses,
      orders: Array.isArray(parsed.orders) ? parsed.orders : fallback.orders,
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : fallback.auditLogs,
      pendingOps: Array.isArray(parsed.pendingOps) ? parsed.pendingOps : [],
      lastSyncedAt: parsed.lastSyncedAt || null,
    };
  } catch {
    return createInitialState();
  }
}

export function saveLocalPosState(state: PosStoreState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      clean[k] = v;
    }
  }
  return clean as T;
}

export async function writeDocToFirestore(
  collectionName: string,
  docId: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  if (!auth.currentUser || !auth.currentUser.emailVerified || !navigator.onLine) {
    return false;
  }
  const cleanPayload = stripUndefined(payload);
  try {
    await setDoc(doc(db, collectionName, docId), cleanPayload, { merge: true });
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${docId}`);
    }
    return false;
  }
}

export async function deleteDocFromFirestore(
  collectionName: string,
  docId: string
): Promise<boolean> {
  if (!auth.currentUser || !auth.currentUser.emailVerified || !navigator.onLine) {
    return false;
  }
  try {
    await deleteDoc(doc(db, collectionName, docId));
    return true;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('Missing or insufficient permissions')) {
      handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${docId}`);
    }
    return false;
  }
}

export async function flushPendingSyncOps(pendingOps: PendingSyncOp[]): Promise<{
  flushedIds: string[];
  remaining: PendingSyncOp[];
}> {
  if (!auth.currentUser || !auth.currentUser.emailVerified || !navigator.onLine || pendingOps.length === 0) {
    return { flushedIds: [], remaining: pendingOps };
  }

  const flushedIds: string[] = [];
  const remaining: PendingSyncOp[] = [];

  for (const op of pendingOps) {
    try {
      if (op.operation === 'set' && op.payload) {
        await setDoc(doc(db, op.collectionName, op.docId), stripUndefined(op.payload), { merge: true });
        flushedIds.push(op.id);
      } else if (op.operation === 'delete') {
        await deleteDoc(doc(db, op.collectionName, op.docId));
        flushedIds.push(op.id);
      }
    } catch {
      remaining.push(op);
    }
  }

  return { flushedIds, remaining };
}

export function subscribeFirestoreCollections(
  onData: (partial: Partial<PosStoreState>) => void,
  onPermissionError: (err: Error) => void
): Unsubscribe {
  const unsubs: Unsubscribe[] = [];

  const attach = <T>(
    colName: string,
    key: keyof PosStoreState,
    transform?: (docs: T[]) => void
  ) => {
    const unsub = onSnapshot(
      collection(db, colName),
      (snap) => {
        if (snap.empty) return;
        const docs = snap.docs.map((d) => d.data() as T);
        if (transform) {
          transform(docs);
        } else {
          onData({ [key]: docs } as Partial<PosStoreState>);
        }
      },
      (err) => {
        if (err.message.includes('Missing or insufficient permissions')) {
          try {
            handleFirestoreError(err, OperationType.LIST, colName);
          } catch (wrapped) {
            onPermissionError(wrapped as Error);
          }
        }
      }
    );
    unsubs.push(unsub);
  };

  attach<OutletProfile>('outlet', 'outlet', (docs) => {
    const main = docs.find((d) => d.id === 'main');
    if (main) onData({ outlet: main });
  });
  attach<Category>('categories', 'categories');
  attach<Product>('products', 'products');
  attach<ModifierGroup>('modifierGroups', 'modifierGroups');
  attach<Discount>('discounts', 'discounts');

  return () => {
    unsubs.forEach((u) => u());
  };
}
