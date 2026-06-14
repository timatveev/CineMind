/**
 * One-time archival migration: pull the legacy "History" tab from the old
 * Google Sheet into a standalone `history_archive` table in D1.
 *
 * The legacy History tab stored ONLY user messages (the old bot logged the
 * incoming request text, not its own replies — see legacy/Database.gs
 * logRequest). So this is archival-only: it is NOT loaded into the live
 * `history` table that feeds Gemini (that would create consecutive user-role
 * turns and break the alternating-role contract). The live history starts
 * fresh and accumulates proper user/model pairs going forward.
 *
 * Usage:
 *   1. Make the spreadsheet readable by "anyone with the link".
 *   2. pnpm import:history                 # uses the default SHEET_ID below
 *      SHEET_ID=xxx pnpm import:history    # override
 *   3. Review migrations/0002_history_archive_data.sql
 *   4. wrangler d1 execute cinemind --remote --file=migrations/0002_history_archive_data.sql
 *
 * The generated file is git-ignored because it contains user data (PII).
 */
import { writeFileSync } from 'node:fs';
import { parse } from 'csv-parse/sync';

const SHEET_ID = process.env.SHEET_ID ?? '1qTmMp-Nf5WgMFy8iFTuH_6wfnK8RHABxVbAhWhupgso';
const SHEET_NAME = process.env.SHEET_NAME ?? 'History';
const OUT = 'migrations/0002_history_archive_data.sql';

// Legacy "History" sheet column order: [uuid, userId, text, date]
// (see legacy/Database.gs: appendRow([Utilities.getUuid(), userId, text, new Date()])).
const COL = { UUID: 0, USER_ID: 1, TEXT: 2, DATE: 3 } as const;

function gvizCsvUrl(id: string, sheet: string): string {
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`;
}

/** Escape a value as a SQL string literal (or NULL). */
function sqlStr(v: unknown): string {
  if (v === null || v === undefined || v === '') return 'NULL';
  return `'${String(v).replace(/'/g, "''")}'`;
}

/** Parse an integer, or null if not a valid number. */
function asInt(v: unknown): number | null {
  const n = parseInt(String(v ?? '').trim(), 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * Best-effort convert a legacy date cell to ISO 8601.
 * gviz CSV may return either a parseable date string or the
 * "Date(year,month,day,h,m,s)" form (month is 0-based). Falls back to the
 * raw original string so no information is lost in the archive.
 */
function isoDate(v: unknown): string | null {
  const s = String(v ?? '').trim();
  if (!s) return null;
  const gviz = s.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)$/);
  if (gviz) {
    const [, y, mo, d, h = '0', mi = '0', se = '0'] = gviz;
    const dt = new Date(Number(y), Number(mo), Number(d), Number(h), Number(mi), Number(se));
    return Number.isNaN(dt.getTime()) ? s : dt.toISOString();
  }
  // Localized "DD.MM.YYYY[ HH:MM:SS]" form (the sheet's display locale).
  const loc = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[ ,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/);
  if (loc) {
    const [, d, mo, y, h = '0', mi = '0', se = '0'] = loc;
    const dt = new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(se));
    return Number.isNaN(dt.getTime()) ? s : dt.toISOString();
  }
  const dt = new Date(s);
  return Number.isNaN(dt.getTime()) ? s : dt.toISOString();
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

  // Keep only rows with a numeric user id — this naturally drops a header
  // row (if any) and malformed lines. Skip rows with empty text.
  const dataRows = rows.filter((r) => asInt(r[COL.USER_ID]) !== null && (r[COL.TEXT] ?? '') !== '');

  const lines: string[] = [
    '-- CineMind legacy chat history archive (user messages only)',
    `-- Source: ${SHEET_ID} / ${SHEET_NAME}`,
    `-- Generated: ${new Date().toISOString()}`,
    `-- Rows: ${dataRows.length}`,
    '',
    'CREATE TABLE IF NOT EXISTS history_archive (',
    '  id          INTEGER PRIMARY KEY AUTOINCREMENT,',
    '  legacy_uuid TEXT,',
    '  user_id     INTEGER NOT NULL,',
    '  content     TEXT NOT NULL,',
    '  created_at  TEXT',
    ');',
    'CREATE INDEX IF NOT EXISTS history_archive_user_idx ON history_archive (user_id, id);',
    '',
  ];

  for (const r of dataRows) {
    const userId = asInt(r[COL.USER_ID]);
    if (userId === null) continue;
    lines.push(
      'INSERT INTO history_archive (legacy_uuid, user_id, content, created_at) VALUES (' +
        [
          sqlStr(r[COL.UUID]),
          userId,
          sqlStr(r[COL.TEXT]),
          sqlStr(isoDate(r[COL.DATE])),
        ].join(', ') +
        ');',
    );
  }

  lines.push('');
  writeFileSync(OUT, lines.join('\n'), 'utf8');
  console.log(`Wrote ${dataRows.length} history rows to ${OUT}`);
  console.log(`Apply with: wrangler d1 execute cinemind --remote --file=${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
