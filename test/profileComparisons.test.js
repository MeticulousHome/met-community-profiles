import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  canonicalizeProfileComparisons,
  comparisonForDecentCondition,
  migrateProfileComparisons,
  NUMERIC_EXIT_TRIGGER_TYPES,
  STRICT_GREATER_THAN,
} from '../src/profileComparisons.js';

test('canonicalizes legacy and omitted greater comparisons for every numeric trigger type', () => {
  const exitTriggers = [...NUMERIC_EXIT_TRIGGER_TYPES].flatMap((type) => [
    { type, value: 0, comparison: '>=' },
    { type, value: 1 },
    { type, value: 2, comparison: '<=' },
  ]);
  const profile = {
    id: 'profile-id',
    stages: [{ name: 'Stage', exit_triggers: exitTriggers, limits: [{ type: 'flow', value: 4 }] }],
  };

  const migrated = canonicalizeProfileComparisons(profile);

  for (let index = 0; index < exitTriggers.length; index += 3) {
    assert.equal(migrated.stages[0].exit_triggers[index].comparison, '>');
    assert.equal(migrated.stages[0].exit_triggers[index + 1].comparison, '>');
    assert.equal(migrated.stages[0].exit_triggers[index + 2].comparison, '<=');
  }
  assert.deepEqual(migrated.stages[0].limits, profile.stages[0].limits);
  assert.equal(profile.stages[0].exit_triggers[0].comparison, '>=', 'does not mutate its input');
  const secondMigration = migrateProfileComparisons(migrated);
  assert.equal(secondMigration.changed, false);
  assert.equal(secondMigration.profile, migrated, 'an idempotent migration preserves object identity');
});

test('leaves nonnumeric and unrelated profile data unchanged', () => {
  const profile = {
    final_weight: 36,
    stages: [
      null,
      {
        exit_triggers: [null, { type: 'user_interaction', value: 0, comparison: '>=' }],
        dynamics: { over: 'time', points: [[0, 2]] },
      },
    ],
  };

  const migration = migrateProfileComparisons(profile);
  assert.equal(migration.changed, false);
  assert.equal(migration.profile, profile);
});

test('maps Decent over to strict greater-than and preserves less conditions', () => {
  assert.equal(STRICT_GREATER_THAN, '>', 'generated time exits use the strict comparator');
  assert.equal(comparisonForDecentCondition('over'), '>');
  assert.equal(comparisonForDecentCondition('under'), '<=');
  assert.equal(comparisonForDecentCondition('less'), '<=');
});

test('published profiles are already canonical', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const profilesDirectory = path.join(root, 'docs', 'profiles-json');

  for (const filename of fs.readdirSync(profilesDirectory).filter((name) => name.endsWith('.json'))) {
    const profile = JSON.parse(fs.readFileSync(path.join(profilesDirectory, filename), 'utf8'));
    assert.deepEqual(canonicalizeProfileComparisons(profile), profile, filename);
  }
});
