/**
 * One-time migration: pull existing users from the legacy Google Sheet
 * and emit an idempotent SQL file for D1.
 *
 * Usage:
 *   1. Make the spreadsheet readable by "anyone with the link".
 *   2. pnpm import:sheet                 # uses the default SHEET_ID below
 *      SHEET_ID=xxx pnpm import:sheet    # override
 *   3. Review migrations/0001_data.sql
 *   4. wrangler d1 execute cinemind --remote --file=migrations/0001_data.sql
 *
 * The generated file is git-ignored because it contains user data (PII).
 */
import { writeFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';

// Legacy spreadsheet id (from the old Config.gs). Override via env.
const SHEET_ID = process.env.SHEET_ID ?? '1qTmMp-Nf5WgMFy8iFTuH_6wfnK8RHABxVbAhWhupgso';
const SHEET_NAME = process.env.SHEET_NAME ?? 'Users';
const OUT = 'migrations/0001_data.sql';

// Original column order in the "Users" sheet (see legacy/Database.gs COL map).
const COL = {
  ID: 0,
  STATE: 1,
  PROFILE: 2,
  LOCATION: 3,
  IS_SUB_MANUAL: 4,
  LAST_DATE: 5,
  DAILY_COUNT: 6,
  IS_ADMIN: 7,
  IS_DIGEST: 8,
} as const;

function gvizCsvUrl(id: string, sheet: string): string {
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
}

/** Escape a value as a SQL string literal (or NULL). */
function sqlStr(v: unknown): string {
  if (v === null || v === undefined || v === '') return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

function sqlBool(v: unknown): '1' | '0' {
  const s = String(v).trim().toUpperCase();
  return s === 'TRUE' || s === '1' || s === 'YES' ? '1' : '0';
}

function sqlInt(v: unknown): number {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) ? n : 0;
}

/** Convert legacy toDateString() ("Mon Jun 14 2026") to YYYY-MM-DD, else NULL. */
function sqlDate(v: unknown): string {
  if (!v) return 'NULL';
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? 'NULL' : `'${d.toISOString().slice(0, 10)}'`;
}

async function main(): Promise<void> {
  const url = gvizCsvUrl(SHEET_ID, SHEET_NAME);
  console.log(`Fetching ${url}`);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Sheet fetch failed: ${res.status} ${res.statusText}. Is it shared publicly?`);
  }
  const csv = await res.text();
  const rows = parse(csv, { skip_empty_lines: true }) as string[][];

  // Drop the header row.
  const dataRows = rows.slice(1).filter((r) => r[COL.ID]);

  const lines: string[] = [
    '-- CineMind data import from legacy Google Sheet',
    `-- Source: ${SHEET_ID} / ${SHEET_NAME}`,
    `-- Generated: ${new Date().toISOString()}`,
    `-- Rows: ${dataRows.length}`,
    '',
    'BEGIN TRANSACTION;',
    '',
  ];

  for (const r of dataRows) {
    const id = sqlInt(r[COL.ID]);
    if (!id) continue;
    lines.push(
      'INSERT INTO users ' +
        '(id, state, profile, location, is_sub_manual, last_activity_date, daily_count, is_admin, is_digest) ' +
        'VALUES (' +
        [
          id,
          sqlStr(r[COL.STATE] || 'READY'),
          sqlStr(r[COL.PROFILE]),
          sqlStr(r[COL.LOCATION]),
          sqlBool(r[COL.IS_SUB_MANUAL]),
          sqlDate(r[COL.LAST_DATE]),
          sqlInt(r[COL.DAILY_COUNT]),
          sqlBool(r[COL.IS_ADMIN]),
          sqlBool(r[COL.IS_DIGEST]),
        ].join(', ') +
        ')\n  ON CONFLICT(id) DO UPDATE SET ' +
        'state=excluded.state, profile=excluded.profile, location=excluded.location, ' +
        'is_sub_manual=excluded.is_sub_manual, last_activity_date=excluded.last_activity_date, ' +
        'daily_count=excluded.daily_count, is_admin=excluded.is_admin, is_digest=excluded.is_digest;',
    );
  }

  lines.push('', 'COMMIT;', '');
  writeFileSync(OUT, lines.join('\n'), 'utf8');
  console.log(`Wrote ${dataRows.length} users to ${OUT}`);
  console.log(`Apply with: wrangler d1 execute cinemind --remote --file=${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
