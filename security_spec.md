# Security Specification – DapurKasir POS (Firestore Rules)

## 1. Data Invariants
1. **Master Auth & Verified Gate**: Only authenticated, verified, and active outlet staff (`users/{uid}.isActive == true`) or the bootstrapped Owner email (`riyanxnation@gmail.com` with `email_verified == true`) can access outlet operational data.
2. **Role Hierarchy (RBAC)**:
   - `owner`: Full access to outlet profile, users/roles, menu CRUD, discounts, shifts, orders (including void), expenses, auditLogs, and dailyStats.
   - `manager`: Menu CRUD, discounts, shifts, orders (including void), expenses, and reports. Cannot elevate roles to `owner` or alter outlet settings.
   - `cashier`: Read outlet/menu/discounts, create/manage own shifts, record own shift expenses, create orders with `userId == request.auth.uid`, update status on active orders, read own orders. Cannot modify menu prices, delete orders, void completed orders without manager/owner, or read other users' PII.
3. **Self-Role Escalation Block**: A user creating or updating their own `users/{uid}` document cannot assign themselves `owner` or `manager` unless they are the verified bootstrap Owner email or edited by an existing active `owner`.
4. **Terminal State Locking**: Once an order reaches `void` or `cancelled`, it cannot be re-opened. Once `completed`, only `owner` or `manager` can transition it to `void` with a non-empty `voidReason` and `voidBy`.
5. **Immutable Audit Trail**: `auditLogs` are append-only (`create` allowed for active staff with `userId == request.auth.uid`; `update` and `delete` forbidden).
6. **PII Isolation**: `users/{userId}` documents contain `email` and `pinHash`. Read (`get`) is restricted to the document owner (`request.auth.uid == userId`) or `owner`/`manager`; `list` is restricted to `owner`/`manager`.
7. **Strict Key & Size Guards**: Every document enforces `hasAll`/`hasOnly` on create, `affectedKeys().hasOnly(...)` on update, `isValidId()` regex on path IDs, and `.size()` limits on all strings and bounded arrays.

## 2. The "Dirty Dozen" Attack Payloads
1. **Unauthenticated Order Read**: `get /orders/ord_1` with `auth = null` -> `PERMISSION_DENIED`.
2. **Self-Role Escalation**: Cashier updates `/users/{cashierUid}` setting `role: "owner"` -> `PERMISSION_DENIED`.
3. **Shadow Field Injection**: Create `/orders/ord_bad` with extra ghost field `isFreeOverride: true` -> `PERMISSION_DENIED`.
4. **ID Poisoning**: Create `/categories/cat$$$invalid_1500_chars...` -> `PERMISSION_DENIED`.
5. **Cashier Menu Price Tampering**: Cashier attempts `update /products/prod_1` changing `price: 1` -> `PERMISSION_DENIED`.
6. **Cashier Reading All Users PII**: Cashier attempts `list /users` or `get /users/other_uid` -> `PERMISSION_DENIED`.
7. **Cashier Voiding Completed Order**: Cashier attempts `update /orders/ord_1` changing `status: "void"` -> `PERMISSION_DENIED`.
8. **Void Without Reason**: Manager attempts `update /orders/ord_1` changing `status: "void"` with empty `voidReason: ""` -> `PERMISSION_DENIED`.
9. **Terminal State Reopen**: Manager attempts `update /orders/ord_voided` changing `status: "completed"` -> `PERMISSION_DENIED`.
10. **Order Identity Spoofing**: Cashier creates `/orders/ord_2` with `userId: "someone_else"` -> `PERMISSION_DENIED`.
11. **Audit Log Tampering**: Owner or Manager attempts `update` or `delete` on `/auditLogs/log_1` -> `PERMISSION_DENIED`.
12. **Email Spoofing**: Unverified token (`email: "riyanxnation@gmail.com", email_verified: false`) attempts write -> `PERMISSION_DENIED`.
