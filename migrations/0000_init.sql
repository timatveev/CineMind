-- CineMind initial schema (D1 / SQLite)
-- Applied via: wrangler d1 migrations apply cinemind

CREATE TABLE IF NOT EXISTS users (
  id                 INTEGER PRIMARY KEY,
  state              TEXT NOT NULL DEFAULT 'WAITING_PROFILE',
  profile            TEXT,
  location           TEXT,
  is_sub_manual      INTEGER NOT NULL DEFAULT 0,
  last_activity_date TEXT,
  daily_count        INTEGER NOT NULL DEFAULT 0,
  is_admin           INTEGER NOT NULL DEFAULT 0,
  is_digest          INTEGER NOT NULL DEFAULT 0,
  created_at         TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at         TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS history (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,
  role       TEXT NOT NULL,
  content    TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS history_user_idx ON history (user_id, id);
