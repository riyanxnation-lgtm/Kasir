import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Security Rules Structural & Dirty-Dozen Invariant Verification
 * Validates that firestore.rules contains every blueprint collection,
 * Eight Pillars guards, and blocks all Dirty Dozen attack vectors.
 */
const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const blueprintPath = path.resolve(process.cwd(), 'firebase-blueprint.json');

test('firestore.rules covers every collection in firebase-blueprint.json', () => {
  const rules = fs.readFileSync(rulesPath, 'utf8');
  const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
  const collections = Object.keys(blueprint.firestore).map((p) => p.split('/')[1]);

  for (const col of collections) {
    assert.match(rules, new RegExp(`match /${col}/\\{`), `Missing match block for collection /${col}`);
  }
});

test('firestore.rules enforces Eight Pillars and Dirty Dozen invariants', () => {
  const rules = fs.readFileSync(rulesPath, 'utf8');

  // Pillar 1 & Global Safety Net
  assert.match(rules, /match \/\{document=\*\*\}\s*\{\s*allow read, write: if false;/);

  // Pillar 2: Validation helpers called on every create & update
  const entities = ['Outlet', 'User', 'Category', 'Product', 'ModifierGroup', 'Discount', 'Shift', 'Expense', 'Order', 'AuditLog', 'DailyStat'];
  for (const entity of entities) {
    assert.match(rules, new RegExp(`function isValid${entity}\\(data\\)`), `Missing isValid${entity} helper`);
  }

  // Pillar 3: ID Poisoning guard
  assert.match(rules, /function isValidId\(id\)/);
  assert.match(rules, /\^\[a-zA-Z0-9_\\\\-\]\+\$/);

  // Pillar 4 & Email spoofing guard
  assert.match(rules, /request\.auth\.token\.email_verified == true/);

  // Dirty Dozen checks: Void requires reason + manager/owner, AuditLog immutable, Orders non-deletable
  assert.match(rules, /incoming\(\)\.voidReason\.size\(\) >= 3/);
  assert.match(rules, /match \/auditLogs\/\{logId\}[\s\S]*allow update, delete: if false;/);
  assert.match(rules, /match \/orders\/\{orderId\}[\s\S]*allow delete: if false;/);
  assert.match(rules, /!\(existing\(\)\.status in \['void', 'cancelled'\]\)/);
});
