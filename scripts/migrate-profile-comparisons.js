import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { migrateProfileComparisons } from '../src/profileComparisons.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const profilesDirectory = path.join(root, 'docs', 'profiles-json');
const checkOnly = process.argv.includes('--check');
let changedFiles = 0;

for (const filename of fs.readdirSync(profilesDirectory).filter((name) => name.endsWith('.json'))) {
  const profilePath = path.join(profilesDirectory, filename);
  const source = fs.readFileSync(profilePath, 'utf8');
  const profile = JSON.parse(source);
  const { profile: canonicalProfile, changed } = migrateProfileComparisons(profile);

  if (!changed) {
    continue;
  }

  const canonicalSource = `${JSON.stringify(canonicalProfile, null, 2)}\n`;

  changedFiles += 1;
  if (!checkOnly) {
    fs.writeFileSync(profilePath, canonicalSource);
  }
}

if (checkOnly && changedFiles > 0) {
  console.error(`${changedFiles} profile file(s) require comparator migration.`);
  process.exitCode = 1;
} else {
  console.log(checkOnly ? 'All profile comparisons are canonical.' : `Migrated ${changedFiles} profile file(s).`);
}
