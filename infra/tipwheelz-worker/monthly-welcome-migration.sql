CREATE TABLE IF NOT EXISTS mack_monthly_welcomes (
subscription_id TEXT PRIMARY KEY,
session_id TEXT NOT NULL,
status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','accepted')),
lease_until INTEGER,
attempts INTEGER NOT NULL DEFAULT 0,
created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);